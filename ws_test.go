package main

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/cskr/pubsub"
	"github.com/gorilla/websocket"
	"github.com/spf13/viper"
)

// TestWebSocketBroadcast is a contract test for the /ws endpoint:
//
//	It starts a webserver on a free port and dials the websocket endpoint
//	It then publishes a line through the message broker and verifies the
//	websocket client receives it as JSON with the expected text and logfile
//
//	This covers the pipe (pubsub -> websocket -> JSON frame) that the e2e
//	suite exercises end to end through a real browser.
//
//	Note: this test builds the main package, which embeds web/dist (see
//	main.go). On a fresh clone, run `cd web && yarn build` first, or the
//	build fails before the test even starts.
func TestWebSocketBroadcast(t *testing.T) {
	// Pick a free port so the test never collides with a running instance
	// (and never with the e2e suite's dedicated port).
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Unable to find a free port: %s", err)
	}
	port := listener.Addr().(*net.TCPAddr).Port
	listener.Close()
	viper.Set("server_settings.webserverport", strconv.Itoa(port))

	// Setup message broker and start the webserver
	pubSub := pubsub.New(1)
	go StartWebServer(pubSub)

	baseUrl := fmt.Sprintf("http://127.0.0.1:%d", port)

	// Give the StartWebServer enough time to startup
	ready := false
	for i := 0; i < 30; i++ {
		response, getErr := http.Get(baseUrl + "/settings/logstation-name")
		if getErr == nil {
			response.Body.Close()
			if response.StatusCode == 200 {
				ready = true
				break
			}
		}
		time.Sleep(200 * time.Millisecond)
	}
	if !ready {
		t.Fatalf("Webserver did not come up at %s", baseUrl)
	}

	// Dial the websocket endpoint
	ws, _, err := websocket.DefaultDialer.Dial(strings.Replace(baseUrl, "http", "ws", 1)+"/ws", nil)
	if err != nil {
		t.Fatalf("Unable to dial the websocket at %s/ws: %s", baseUrl, err)
	}
	defer ws.Close()

	// Publish a line and read the response. The server subscribes to the
	// broker just after the upgrade handshake completes (see
	// WebSocketHandler), so a publish that lands in that window is dropped
	// by the broker. Retry the publish/read cycle: once the server is
	// subscribed, delivery is reliable.
	var received LogMessage
	var lastErr error
	found := false
	for attempt := 0; attempt < 5 && !found; attempt++ {
		pubSub.Pub(LogMessage{Text: "e2e websocket line", LogFile: "ws_test.log"}, "lines")

		ws.SetReadDeadline(time.Now().Add(2 * time.Second))
		messageType, data, readErr := ws.ReadMessage()
		if readErr != nil {
			lastErr = readErr
			continue
		}
		if messageType != websocket.TextMessage {
			t.Errorf("Expected a text message, got message type %d", messageType)
			lastErr = fmt.Errorf("wrong message type %d", messageType)
			continue
		}
		if unmarshalErr := json.Unmarshal(data, &received); unmarshalErr != nil {
			lastErr = unmarshalErr
			continue
		}
		found = true
	}
	if !found {
		t.Fatalf("Did not receive the published line on the websocket (last error: %s)", lastErr)
	}
	if received.Text != "e2e websocket line" {
		t.Errorf("Expected text %q, got %q", "e2e websocket line", received.Text)
	}
	if received.LogFile != "ws_test.log" {
		t.Errorf("Expected logfile %q, got %q", "ws_test.log", received.LogFile)
	}
}

// TestDeadWebSocketClientDoesNotStallOtherClients is a regression test for
// issue #110 at the websocket layer.
//
//	A client that vanishes without closing its websocket (a crashing
//	browser, a dropped network) used to stall the server's write to it
//	forever (no read pump, no write deadline). The handler then stopped
//	draining its subscription channel, and the blocking pubsub fan-out
//	wedged on that full channel, skipping lines for EVERY other client.
//
//	The test fills the dead client's TCP buffers so the server's writes to
//	it stall, and then asserts that (1) a healthy client still receives
//	every single line and (2) a newly connected client can still receive
//	lines after the dead one is killed. With the pre-fix code the broker
//	wedges and both assertions fail.
func TestDeadWebSocketClientDoesNotStallOtherClients(t *testing.T) {
	// Shorten the write deadline so a stalled client's handler gives up in
	// 200 ms instead of 10 s.
	origDeadline := wsWriteDeadline
	wsWriteDeadline = 200 * time.Millisecond
	t.Cleanup(func() { wsWriteDeadline = origDeadline })

	// Same broker configuration as main()
	pubSub := pubsub.New(pubSubQueueSize)

	// Start the webserver on a free port (same pattern as
	// TestWebSocketBroadcast)
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Unable to find a free port: %s", err)
	}
	port := listener.Addr().(*net.TCPAddr).Port
	listener.Close()
	viper.Set("server_settings.webserverport", strconv.Itoa(port))
	go StartWebServer(pubSub)

	baseUrl := fmt.Sprintf("http://127.0.0.1:%d", port)
	wsUrl := strings.Replace(baseUrl, "http", "ws", 1) + "/ws"

	ready := false
	for i := 0; i < 30; i++ {
		response, getErr := http.Get(baseUrl + "/settings/logstation-name")
		if getErr == nil {
			response.Body.Close()
			if response.StatusCode == 200 {
				ready = true
				break
			}
		}
		time.Sleep(200 * time.Millisecond)
	}
	if !ready {
		t.Fatalf("Webserver did not come up at %s", baseUrl)
	}

	// Client A: healthy, drains every line it is sent.
	wsA, _, err := websocket.DefaultDialer.Dial(wsUrl, nil)
	if err != nil {
		t.Fatalf("Unable to dial the websocket (client A): %s", err)
	}
	defer wsA.Close()
	var aCount int64
	go func() {
		for {
			if _, _, readErr := wsA.ReadMessage(); readErr != nil {
				return
			}
			atomic.AddInt64(&aCount, 1)
		}
	}()

	// Client B: the client that will die. Shrink its TCP receive buffer so
	// the server's writes to it stall once the kernel buffers fill, and
	// never read from it (a dead client's kernel stops consuming too).
	wsB, _, err := websocket.DefaultDialer.Dial(wsUrl, nil)
	if err != nil {
		t.Fatalf("Unable to dial the websocket (client B): %s", err)
	}
	if tcpConn, ok := wsB.NetConn().(*net.TCPConn); ok {
		_ = tcpConn.SetReadBuffer(4096)
	}

	// Push enough lines that B's kernel buffers fill and the server's
	// writes to B stall. Publish in batches, waiting for A to catch up
	// after each one so A's own queue can never overflow: a healthy client
	// must lose nothing. (B, by design, never catches up.)
	const (
		totalLines = 12000
		batchSize  = 512
	)
	line := LogMessage{Text: strings.Repeat("x", 1024)}
	for i := 0; i < totalLines; i += batchSize {
		n := batchSize
		if i+n > totalLines {
			n = totalLines - i
		}
		for j := 0; j < n; j++ {
			pubSub.TryPub(line, "lines")
		}
		waitForLineCount(t, &aCount, int64(i+n), 15*time.Second)
	}

	// Kill B the way a crashing client dies: abrupt TCP close, no
	// websocket close frame. Its unread buffers make the kernel send a RST.
	if tcpConn, ok := wsB.NetConn().(*net.TCPConn); ok {
		_ = tcpConn.Close()
	}

	// A new client C must be able to connect and receive lines: the broker
	// and server must be fully operational despite B's death.
	wsC, _, err := websocket.DefaultDialer.Dial(wsUrl, nil)
	if err != nil {
		t.Fatalf("Unable to dial the websocket (client C) after client B died: %s", err)
	}
	defer wsC.Close()
	wsC.SetReadDeadline(time.Now().Add(10 * time.Second))
	pubSub.TryPub(LogMessage{Text: "post-mortem marker"}, "lines")
	_, data, readErr := wsC.ReadMessage()
	if readErr != nil {
		t.Fatalf("Client C did not receive a line after client B died: %s", readErr)
	}
	var marker LogMessage
	if err := json.Unmarshal(data, &marker); err != nil {
		t.Fatalf("Client C received an unparsable message: %s", err)
	}
	if marker.Text != "post-mortem marker" {
		t.Errorf("Expected %q, got %q", "post-mortem marker", marker.Text)
	}
}

// waitForLineCount blocks until *count reaches target or the test fails.
func waitForLineCount(t *testing.T, count *int64, target int64, timeout time.Duration) {
	deadline := time.Now().Add(timeout)
	for atomic.LoadInt64(count) < target {
		if time.Now().After(deadline) {
			t.Fatalf("Timed out waiting for %d lines, healthy client only received %d", target, atomic.LoadInt64(count))
		}
		time.Sleep(10 * time.Millisecond)
	}
}
