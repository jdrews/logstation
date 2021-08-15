package main

import (
	"github.com/fstab/grok_exporter/tailer/fswatcher"
	"github.com/fstab/grok_exporter/tailer/glob"
	"github.com/gorilla/websocket"
	"github.com/jdrews/logstation/internal"
	_ "github.com/jdrews/logstation/statik"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/rakyll/statik/fs"
	"github.com/sirupsen/logrus"
	"net/http"
	"os"
)

var (
	upgrader = websocket.Upgrader{}
)

func main() {
	pubSub := internal.NewPubsub()

	//begin watching the file
	go follow("test/logfile.log", pubSub)

	e := echo.New()

	statikFS, err := fs.New()
	if err != nil {
		e.Logger.Fatal(err)
	}

	e.Use(middleware.Logger())
	e.Use(middleware.Recover())

	h := http.FileServer(statikFS)

	e.GET("/*", echo.WrapHandler(http.StripPrefix("/", h)))

	// pass channel into handler
	wsHandlerChan := func(c echo.Context) error {
		return wshandler(c, pubSub)
	}
	e.GET("/ws", wsHandlerChan)

	// start server
	e.Logger.Fatal(e.Start(":8081"))
}

func wshandler(c echo.Context, pubSub *internal.Pubsub) error {
	// Disable the following line in production. Using in development so I can `npm start` and dev the frontend. It bypasses CORS
	upgrader.CheckOrigin = func(r *http.Request) bool { return true }

	var err error

	linesChannel := pubSub.Subscribe("lines")

	ws, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		return err
	}
	defer ws.Close()

	for line := range linesChannel {
		// Write
		err := ws.WriteMessage(websocket.TextMessage, []byte(line))
		if err != nil {
			//TODO handle wsasend "An established connection was aborted by the software in your host machine"
			// {"time":"2021-08-08T23:56:03.7797377-04:00","level":"ERROR","prefix":"echo","file":"main.go","line":"69","message":"write tcp [::1]:8081->[::1]:27058: wsasend: An established connection was aborted by the software in your host machine."}
			c.Logger().Error(err)
		}
	}
	return err
}

func follow(path string, pubSub *internal.Pubsub) error {
	logger := logrus.New()
	logger.Level = logrus.DebugLevel
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
			pubSub.Publish("lines", line.Line)
		default:
			continue
		}
	}
}
