package main

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/ThreeDotsLabs/watermill/pubsub/gochannel"
	"github.com/gorilla/websocket"
	"github.com/jdrews/logstation/api/server/handlers"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/spf13/viper"
	"io/fs"
	"net/http"
)

var (
	// define the websocket upgrader
	upgrader = websocket.Upgrader{}

	// default to CORS being enabled
	disableCORS = false
)

// WebSocketHandler handles incoming websocket connections and serves up log lines to the client
func WebSocketHandler(c echo.Context, pubSub *gochannel.GoChannel) error {
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

	linesChannel, err := pubSub.Subscribe(context.Background(), "lines")
	//defer pubSub.Unsub(linesChannel, "lines")

	for line := range linesChannel {
		logMessage := LogMessage{}
		err2 := json.Unmarshal(line.Payload, &logMessage)
		if err2 != nil {
			logger.Fatal(err2)
		}
		jsonLine, _ := json.Marshal(logMessage)
		logger.Infof("WebSocketHandler: " + string(jsonLine))
		// Write
		wsErr := ws.WriteMessage(websocket.TextMessage, jsonLine) //TODO: suspect I'm writing to the websocket too fast. It closes quickly  after subsequent ms writes
		if wsErr != nil {
			logger.Warn("Lost connection to websocket client! Maybe they're gone? Closing this connection. More info: ")
			logger.Warn(wsErr)
			break
		}
		line.Ack()
	}
	return nil
}

// StartWebServer configures and then starts the webserver, which does the following:
//   - Serves up the React files for the client
//   - Provides a REST API Server for various configurations on the client
//   - Starts a WebSocket Server to pass the logfiles and loglines to the client
func StartWebServer(pubSub *gochannel.GoChannel) {
	// setup web server
	e := echo.New()
	e.HideBanner = true
	e.Use(middleware.Logger())

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

	// package up the built web files and serve them to the clients
	fsys, err := fs.Sub(webServerFiles, "web/dist")
	if err != nil {
		panic(fmt.Errorf("error loading the web files into the server. error msg: %s", err))
	}
	fileHandler := http.FileServer(http.FS(fsys))
	e.GET("/*", echo.WrapHandler(fileHandler))

	// pass message broker channel into websocket handler
	wsHandlerChan := func(c echo.Context) error {
		return WebSocketHandler(c, pubSub)
	}
	e.GET("/ws", wsHandlerChan)

	// start the web server
	e.Logger.Fatal(e.Start(viper.GetString("server_settings.webserveraddress") + ":" + viper.GetString("server_settings.webserverport")))
}
