package main

import (
	"embed"
	"errors"
	"github.com/cskr/pubsub"
	"github.com/fstab/grok_exporter/tailer/fswatcher"
	"github.com/fstab/grok_exporter/tailer/glob"
	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/sirupsen/logrus"
	"io/fs"
	"net/http"
	"os"
	"syscall"
)

var (
	//go:embed web/build
	embeddedFiles embed.FS

	upgrader = websocket.Upgrader{}
)

//todo: Config file
//todo: bundle app

func main() {
	pubSub := pubsub.New(1)

	//begin watching the file
	go follow("test/logfile.log", pubSub)

	e := echo.New()
	e.HideBanner = true

	e.Use(middleware.Logger())

	fsys, err := fs.Sub(embeddedFiles, "web/build")
	if err != nil {
		panic(err)
	}

	fileHandler := http.FileServer(http.FS(fsys))

	e.GET("/*", echo.WrapHandler(fileHandler))
	//e.GET("/static/*", echo.WrapHandler(http.StripPrefix("/static/", fileHandler)))

	// pass channel into handler
	wsHandlerChan := func(c echo.Context) error {
		return wshandler(c, pubSub)
	}
	e.GET("/ws", wsHandlerChan)

	// start server
	e.Logger.Fatal(e.Start(":8081"))
}

func wshandler(c echo.Context, pubSub *pubsub.PubSub) error {
	logger := logrus.New()
	logger.SetOutput(os.Stdout)
	// Disable the following line in production. Using in development so I can `npm start` and dev the frontend. It bypasses CORS
	upgrader.CheckOrigin = func(r *http.Request) bool { return true }
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
