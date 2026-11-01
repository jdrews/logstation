package main

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"strconv"
	"testing"
	"time"

	"github.com/labstack/echo/v5"
	"github.com/spf13/viper"
)

// reservePort grabs a free port and returns it plus the live listener
// (so the port stays occupied while the test runs).
func reservePort(t *testing.T) (int, net.Listener) {
	t.Helper()
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Unable to reserve a port: %s", err)
	}
	return listener.Addr().(*net.TCPAddr).Port, listener
}

func setTestServerAddress(t *testing.T, port int) {
	t.Helper()
	viper.Set("server_settings.webserveraddress", "127.0.0.1")
	viper.Set("server_settings.webserverport", strconv.Itoa(port))
}

// TestStartWebServerStartupFailure verifies that startWebServer returns an
// error (and does not hang) when the configured port is already in use,
// covering the v5 startup error path.
func TestStartWebServerStartupFailure(t *testing.T) {
	// Occupy a free port so the echo server cannot bind to it.
	port, listener := reservePort(t)
	defer listener.Close()
	setTestServerAddress(t, port)

	if err := startWebServer(echo.New(), context.Background(), nil); err == nil {
		t.Error("Expected startWebServer to fail on an in-use port, got nil error")
	}
}

// TestStartWebServerGracefulShutdown verifies that canceling the context
// shuts the server down cleanly (sc.Start returns nil), exercising the v5
// StartConfig + context shutdown wiring.
func TestStartWebServerGracefulShutdown(t *testing.T) {
	port, listener := reservePort(t)
	listener.Close() // hand the free port to the echo server
	setTestServerAddress(t, port)

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { done <- startWebServer(echo.New(), ctx, nil) }()

	// Wait until the server answers, then cancel for a graceful shutdown.
	// The bare echo instance has no routes, so any HTTP response (even a
	// 404) proves the listener is up.
	baseUrl := fmt.Sprintf("http://127.0.0.1:%d", port)
	ready := false
	for i := 0; i < 30 && !ready; i++ {
		resp, getErr := http.Get(baseUrl + "/")
		if getErr == nil {
			resp.Body.Close()
			ready = true
		}
		if !ready {
			time.Sleep(100 * time.Millisecond)
		}
	}
	if !ready {
		t.Fatalf("Webserver did not come up at %s", baseUrl)
	}

	cancel()
	select {
	case err := <-done:
		if err != nil {
			t.Errorf("Expected clean shutdown (nil error), got %s", err)
		}
	case <-time.After(15 * time.Second):
		t.Fatal("Server did not shut down within 15s of context cancel")
	}
}
