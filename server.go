package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"os/signal"
	"syscall"

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
	defer func(ws *websocket.Conn) {
		wsCloseErr := ws.Close()
		if wsCloseErr != nil {
			panic(wsCloseErr)
		}
	}(ws)

	linesChannel := pubSub.Sub("lines")
	defer pubSub.Unsub(linesChannel, "lines")

	for line := range linesChannel {
		jsonLine, marshalErr := json.Marshal(line)
		if marshalErr != nil {
			logger.Fatal(marshalErr)
		}
		// Write
		wsErr := ws.WriteMessage(websocket.TextMessage, jsonLine)
		if wsErr != nil {
			logger.Warn("Lost connection to websocket client! Maybe they're gone? Closing this connection. More info: ")
			logger.Warn(wsErr)
			break
		}
	}
	return nil
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
