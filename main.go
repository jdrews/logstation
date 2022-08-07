package main

import (
	"embed"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"github.com/cskr/pubsub"
	"github.com/fstab/grok_exporter/tailer/fswatcher"
	"github.com/fstab/grok_exporter/tailer/glob"
	"github.com/gorilla/websocket"
	"github.com/jdrews/logstation/api/server/handlers"
	"github.com/jdrews/logstation/api/server/models"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/sirupsen/logrus"
	"github.com/spf13/viper"
	"io/fs"
	"log"
	"net/http"
	"os"
	"regexp"
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

type LogMessage struct {
	Text    string `json:"text"`
	Color   string `json:"color"`
	LogFile string `json:"logfile"`
}

type CompiledRegexColors struct {
	regex *regexp.Regexp
	color string
}

func main() {
	configFilePtr := flag.String("c", "logstation.conf", "path to config file")
	flag.Parse()
	handleConfigFile(*configFilePtr)
	patterns := parseRegexPatterns()

	pubSub := pubsub.New(1)

	logFiles := viper.GetStringSlice("logs")
	for _, logFile := range logFiles {
		//begin watching the file in a goroutine for concurrency
		go follow(logFile, pubSub, patterns)
	}

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

// Process all the regular expression patterns associated with each color and compile them at boot time to optimize regex matching.
func parseRegexPatterns() []CompiledRegexColors {
	var syntaxColors models.SyntaxColors
	viper.UnmarshalKey("syntaxColors", &syntaxColors)
	crcs := make([]CompiledRegexColors, len(syntaxColors))
	for index, element := range syntaxColors {
		regex, err := regexp.Compile(element.Regex)
		if err != nil {
			log.Fatal("Unable to compile the regex of ", element.Regex, " associated with the color ", element.Color, ". Please check the conf file and ensure your regex syntax is valid. More details here: ", err)
		}
		crcs[index] = CompiledRegexColors{regex, element.Color}
	}
	return crcs
}

func handleConfigFile(configFilePath string) {
	logger := logrus.New()
	logger.SetOutput(os.Stdout)

	configFilename := "logstation.conf"
	viper.SetConfigName(configFilename)
	viper.SetConfigType("toml")
	viper.AddConfigPath(".")
	viper.SetDefault("logs", []string{`test\logfile.log`, `test\logfile2.log`})

	viper.SetConfigFile(configFilePath)
	if err := viper.ReadInConfig(); err != nil {
		if errors.Is(err, os.ErrNotExist) || errors.As(err, &viper.ConfigFileNotFoundError{}) {
			logger.Warn("Config file not found at ", configFilePath)
			logger.Warn("Writing default config file to ", configFilename)
			logger.Warn("Please open and edit config file before running this application again. Exiting...")
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
		wsErr := ws.WriteMessage(websocket.TextMessage, jsonLine) //TODO: look into using WriteJSON instead to simplify code
		//err := ws.WriteJSON(line)
		if wsErr != nil {
			if errors.Is(wsErr, syscall.WSAECONNABORTED) {
				logger.Warn("Lost connection to websocket client! Maybe they're gone? Closing this connection. More info: ")
				logger.Warn(wsErr)
				break
			} else if errors.Is(wsErr, syscall.WSAECONNRESET) {
				logger.Warn("Lost connection to websocket client! Maybe they're gone? Closing this connection. More info: ")
				logger.Warn(wsErr)
				break
			} else {
				logger.Error(wsErr)
				break
			}
		}
	}
	return nil
}

func follow(logFilePath string, pubSub *pubsub.PubSub, patterns []CompiledRegexColors) {
	logger := logrus.New()
	//logger.Level = logrus.DebugLevel
	logger.SetOutput(os.Stdout)

	parsedGlob, err := glob.Parse(logFilePath)
	if err != nil {
		panic(fmt.Sprintf("%q: failed to parse glob: %q", parsedGlob, err))

	}

	tailer, err := fswatcher.RunFileTailer([]glob.Glob{parsedGlob}, false, true, logger)
	for {
		select {
		case line := <-tailer.Lines():
			logger.Debug(line.Line)
			logMessage := colorize(line.Line, logFilePath, patterns)
			pubSub.Pub(logMessage, "lines")
		default:
			continue
		}
	}
}

// Run each line through the regex patterns to determine if the line should be colored.
// Outputs a LogMessage with line color information
func colorize(line string, logFile string, patterns []CompiledRegexColors) LogMessage {
	var lineColor = ""
	for _, element := range patterns {
		if element.regex.MatchString(line) {
			lineColor = element.color
			break
		}
	}
	return LogMessage{line, lineColor, logFile}
}
