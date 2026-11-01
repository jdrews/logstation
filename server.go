package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/cskr/pubsub"
	"github.com/gorilla/websocket"
	"github.com/jdrews/logstation/api/server/handlers"
	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
	"github.com/spf13/viper"
)

var (
	// define the websocket upgrader
	upgrader = websocket.Upgrader{}

	// default to CORS being enabled
	disableCORS = false

	// wsWriteDeadline bounds how long a single write (or ping) to a client
	// may block before the connection is declared dead. Without it, a
	// half-dead client whose TCP buffer is full blocks WriteMessage
	// forever, pinning the handler and its subscription. It is a var (not
	// a const) so tests can shorten it.
	wsWriteDeadline = 10 * time.Second

	// wsPingInterval is how often we ping the client. Pings keep idle
	// connections alive through NATs and give us a periodic, cheap probe
	// of the connection's health.
	wsPingInterval = 30 * time.Second
)

// WebSocketHandler handles incoming websocket connections and serves up log lines to the client
func WebSocketHandler(c *echo.Context, pubSub *pubsub.PubSub) error {
	if disableCORS {
		upgrader.CheckOrigin = func(r *http.Request) bool { return true }
	}
	ws, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		return nil
	}

	linesChannel := pubSub.Sub("lines")

	// done is closed as soon as the connection stops being usable in either
	// direction, so the writer loop below can stop and the subscription can
	// be released promptly.
	//
	// This protocol is one-way (server -> client), so without the read pump
	// below a client that vanishes without a proper close frame leaves this
	// handler blocked in WriteMessage until (if ever) a write fails. The
	// stuck handler stops draining its subscription channel, and with a
	// blocking broker fan-out that wedges line delivery for every other
	// client (issue #110). The read pump, the write deadline, and the pings
	// together guarantee a dead client is noticed and cleaned up.
	done := make(chan struct{})
	var closeOnce sync.Once
	closeDone := func() { closeOnce.Do(func() { close(done) }) }

	// Read pump: the client never sends application data, so any result
	// from ReadMessage means the connection is going away. Closing the
	// websocket makes any in-flight write fail promptly. (Writing the close
	// from the read side is the pattern from gorilla's chat example: one
	// reader, one writer, Close is safe to call from either.)
	go func() {
		defer closeDone()
		for {
			if _, _, readErr := ws.ReadMessage(); readErr != nil {
				_ = ws.Close()
				return
			}
		}
	}()

	pingTicker := time.NewTicker(wsPingInterval)
	defer pingTicker.Stop()

	defer func() {
		closeDone()
		pubSub.Unsub(linesChannel, "lines")
		_ = ws.Close()
	}()

	for {
		select {
		case <-done:
			return nil
		case <-pingTicker.C:
			// WriteControl is documented safe to call alongside the
			// writer and carries its own deadline, so a dead peer fails
			// the ping promptly instead of hanging.
			if pingErr := ws.WriteControl(websocket.PingMessage, nil, time.Now().Add(wsWriteDeadline)); pingErr != nil {
				logger.Warn("Lost connection to websocket client (ping failed)! Closing this connection. More info: ", pingErr)
				return nil
			}
		case line := <-linesChannel:
			jsonLine, marshalErr := json.Marshal(line)
			if marshalErr != nil {
				logger.Error("Failed to marshal log line: ", marshalErr)
				continue
			}
			if setErr := ws.SetWriteDeadline(time.Now().Add(wsWriteDeadline)); setErr != nil {
				logger.Warn("Lost connection to websocket client! Closing this connection. More info: ", setErr)
				return nil
			}
			if writeErr := ws.WriteMessage(websocket.TextMessage, jsonLine); writeErr != nil {
				logger.Warn("Lost connection to websocket client! Closing this connection. More info: ", writeErr)
				return nil
			}
		}
	}
}

// StartWebServer configures and then starts the webserver, which does the following:
//   - Serves up the React files for the client
//   - Provides a REST API Server for various configurations on the client
//   - Starts a WebSocket Server to pass the logfiles and loglines to the client
//
// It returns an error if the server fails to start (e.g. the port is already
// in use); main decides what to do with it.
func StartWebServer(pubSub *pubsub.PubSub) error {
	// setup web server
	e := echo.New()
	e.Use(middleware.RequestLogger())

	// disable CORS on the web server if desired
	disableCORS = viper.GetBool("server_settings.disablecors")
	if disableCORS {
		logger.Warn("Running in disabled CORS mode. This is very dangerous! Be careful!")
		e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
			AllowOrigins: []string{"*"},
			AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept},
		}))
	}

	c, _ := handlers.NewContainer()

	// GetLogstationName - Get Logstation Name
	e.GET("/settings/logstation-name", c.GetLogstationName)

	// GetSettingsSyntax - Get Syntax Colors
	e.GET("/settings/syntax", c.GetSettingsSyntax)

	// GetSettingsWebsocketSecurity - Get WebSocket Security Setting
	e.GET("/settings/websocket-security", c.GetSettingsWebsocketSecurity)

	// package up the built web files and serve them to the clients
	fsys, err := fs.Sub(webServerFiles, "web/dist")
	if err != nil {
		panic(fmt.Errorf("error loading the web files into the server. error msg: %s", err))
	}
	fileHandler := http.FileServer(http.FS(fsys))
	e.GET("/*", echo.WrapHandler(fileHandler))

	// pass message broker channel into websocket handler
	wsHandlerChan := func(c *echo.Context) error {
		return WebSocketHandler(c, pubSub)
	}
	e.GET("/ws", wsHandlerChan)

	// start the web server. Signals are handled via the context (matching
	// what v5's Start does internally) so Ctrl+C still shuts down cleanly.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	return startWebServer(e, ctx)
}

// startWebServer runs the echo server until it is shut down or fails,
// returning the underlying error. v5 moved banner hiding off the Echo
// instance into StartConfig.
func startWebServer(e *echo.Echo, ctx context.Context) error {
	sc := echo.StartConfig{
		Address:    viper.GetString("server_settings.webserveraddress") + ":" + viper.GetString("server_settings.webserverport"),
		HideBanner: true,
	}
	return sc.Start(ctx, e)
}
