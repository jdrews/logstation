package main

import (
	"fmt"
	"github.com/fstab/grok_exporter/tailer/fswatcher"
	"github.com/fstab/grok_exporter/tailer/glob"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/sirupsen/logrus"
	"golang.org/x/net/websocket"
	"os"
)

func main() {

	linesChannel := make(chan string)
	//begin watching the file
	go follow("test/logfile.log", linesChannel)

	e := echo.New()

	e.Use(middleware.Logger())
	e.Use(middleware.Recover())

	e.Static("/", "web/")

	// pass channel into handler
	wsHandlerChan := func(c echo.Context) error {
		return wshandler(c, linesChannel)
	}
	e.GET("/ws", wsHandlerChan)

	// start server
	e.Logger.Fatal(e.Start(":8081"))
}

func wshandler(c echo.Context, linesChannel <-chan string) error {
	websocket.Handler(func(ws *websocket.Conn) {
		defer ws.Close()
		for {
			// read from
			select {
			case lines := <-linesChannel:
				err := websocket.Message.Send(ws, lines)
				if err != nil {
					c.Logger().Error(err)
				}
			default:
				fmt.Println("no message received")
			}

			// Read
			msg := ""
			err := websocket.Message.Receive(ws, &msg)
			if err != nil {
				c.Logger().Error(err)
			}
			fmt.Printf("%s\n", msg)
		}
	}).ServeHTTP(c.Response(), c.Request())
	return nil
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
		}
	}
}
