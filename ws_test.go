package main

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strconv"
	"strings"
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

	// Publish a line through the message broker
	pubSub.Pub(LogMessage{Text: "e2e websocket line", LogFile: "ws_test.log"}, "lines")

	// Verify the client receives it as a JSON text frame
	ws.SetReadDeadline(time.Now().Add(10 * time.Second))
	messageType, data, err := ws.ReadMessage()
	if err != nil {
		t.Fatalf("Unable to read from the websocket: %s", err)
	}
	if messageType != websocket.TextMessage {
		t.Errorf("Expected a text message, got message type %d", messageType)
	}

	var received LogMessage
	if err := json.Unmarshal(data, &received); err != nil {
		t.Fatalf("Unable to unmarshal the websocket payload %q: %s", data, err)
	}
	if received.Text != "e2e websocket line" {
		t.Errorf("Expected text %q, got %q", "e2e websocket line", received.Text)
	}
	if received.LogFile != "ws_test.log" {
		t.Errorf("Expected logfile %q, got %q", "ws_test.log", received.LogFile)
	}
}
