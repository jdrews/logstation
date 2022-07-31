package main

import (
	"embed"
	"errors"
	"fmt"
	"github.com/cskr/pubsub"
	"github.com/fstab/grok_exporter/tailer/fswatcher"
	"github.com/fstab/grok_exporter/tailer/glob"
	"github.com/gorilla/websocket"
	"github.com/jdrews/logstation/api/server/handlers"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/sirupsen/logrus"
	"github.com/spf13/viper"
	"io/fs"
	"net/http"
	"os"
	"syscall"
)

var (
	//go:embed web/build
	embeddedFiles embed.FS

	//go:embed logstation.default.conf
	defaultConfigFile []byte

	upgrader = websocket.Upgrader{}

	// Set this to false in prod builds. Only used to help in debugging so I can run the frontend on a hotloading npm start
	disableCORS = true
)

func main() {
	pubSub := pubsub.New(1)
	handleConfigFile()

	//begin watching the file
	go follow("test/logfile.log", pubSub)

	e := echo.New()
	e.HideBanner = true

	e.Use(middleware.Logger())

	// Disable the following in production. Using in development so I can `npm start` and dev the frontend. It bypasses CORS
	if disableCORS {
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

	fsys, err := fs.Sub(embeddedFiles, "web/build")
	if err != nil {
		panic(err)
	}

	fileHandler := http.FileServer(http.FS(fsys))

	e.GET("/*", echo.WrapHandler(fileHandler))

	// pass channel into handler
	wsHandlerChan := func(c echo.Context) error {
		return wshandler(c, pubSub)
	}
	e.GET("/ws", wsHandlerChan)

	// start server
	e.Logger.Fatal(e.Start(":" + viper.GetString("additional_settings.webserverport")))
}

func handleConfigFile() {
	logger := logrus.New()
	logger.SetOutput(os.Stdout)

	configFilename := "logstation.conf"
	viper.SetConfigName(configFilename)
	viper.SetConfigType("toml")
	viper.AddConfigPath(".")
	viper.SetDefault("logs", []string{`test\logfile.log`, `test\logfile2.log`})

	if err := viper.ReadInConfig(); err != nil {
		if errors.Is(err, os.ErrNotExist) || errors.As(err, &viper.ConfigFileNotFoundError{}) {
			logger.Warn("Config file %q not found", configFilename)
			logger.Warn("Writing default config file to ", configFilename)
			logger.Warn("Please open and edit config file before running this application again.")
			err := os.WriteFile(configFilename, defaultConfigFile, 0644)
			if err != nil {
				panic(err)
			}
			os.Exit(0)
		} else {
			panic(fmt.Errorf("config file %q loading error: %s", viper.ConfigFileUsed(), err))
		}
	}
	logger.Info("Loaded ", viper.ConfigFileUsed())
}

func wshandler(c echo.Context, pubSub *pubsub.PubSub) error {
	logger := logrus.New()
	logger.SetOutput(os.Stdout)
	// Disable the following line in production. Using in development so I can `npm start` and dev the frontend. It bypasses CORS
	if disableCORS {
		upgrader.CheckOrigin = func(r *http.Request) bool { return true }
	}
	ws, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		return nil
	}
	defer func(ws *websocket.Conn) {
		err := ws.Close()
		if err != nil {
			panic(err)
		}
	}(ws)

	linesChannel := pubSub.Sub("lines")
	defer pubSub.Unsub(linesChannel, "lines")

	for line := range linesChannel {
		// Write
		err := ws.WriteMessage(websocket.TextMessage, []byte(line.(string)))
		if err != nil {
			if errors.Is(err, syscall.WSAECONNABORTED) {
				logger.Warn("Lost connection to websocket client! Maybe they're gone? Closing this connection. More info: ")
				logger.Warn(err)
				break
			} else if errors.Is(err, syscall.WSAECONNRESET) {
				logger.Warn("Lost connection to websocket client! Maybe they're gone? Closing this connection. More info: ")
				logger.Warn(err)
				break
			} else {
				logger.Error(err)
				break
			}
		}
	}
	return nil
}

func follow(path string, pubSub *pubsub.PubSub) error {
	logger := logrus.New()
	//logger.Level = logrus.DebugLevel
	logger.SetOutput(os.Stdout)

	parsedGlob, err := glob.Parse(path)
	if err != nil {
		logger.Error("%q: failed to parse glob: %q", parsedGlob, err)
		return err
	}

	tailer, err := fswatcher.RunFileTailer([]glob.Glob{parsedGlob}, false, true, logger)
	for {
		select {
		case line := <-tailer.Lines():
			logger.Debug(line.Line)
			pubSub.Pub(line.Line, "lines")
		default:
			continue
		}
	}
}
