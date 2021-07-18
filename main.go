package main

import (
	"github.com/fstab/grok_exporter/tailer/fswatcher"
	"github.com/fstab/grok_exporter/tailer/glob"
	"github.com/gorilla/websocket"
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

	linesChannel := make(chan string, 500)
	//begin watching the file
	go follow("test/logfile.log", linesChannel)

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
		return wshandler(c, linesChannel)
	}
	e.GET("/ws", wsHandlerChan)

	// start server
	e.Logger.Fatal(e.Start(":8081"))
}

func wshandler(c echo.Context, linesChannel <-chan string) error {
	// Disable the following line in production. Using in development so I can `npm start` and dev the frontend
	upgrader.CheckOrigin = func(r *http.Request) bool { return true }

	ws, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		return err
	}
	defer ws.Close()

	for {
		select {
		case lines := <-linesChannel:
			// Write
			err := ws.WriteMessage(websocket.TextMessage, []byte(lines))
			if err != nil {
				c.Logger().Error(err)
			}
		}
	}
}

func follow(path string, linesChannel chan<- string) error {
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
			linesChannel <- path + ":" + line.Line
		default:
			continue
		}
	}
}
