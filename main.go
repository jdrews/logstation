package main

import (
	"embed"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"github.com/cskr/pubsub"
	"github.com/fatih/color"
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
	"net/http"
	"os"
	"regexp"
)

var (
	// use go embed to package up the webServerFiles
	//go:embed web/build
	webServerFiles embed.FS

	// use go embed to serve up the defaultConfigFile
	//go:embed logstation.default.conf
	defaultConfigFile []byte

	// define the websocket upgrader
	upgrader = websocket.Upgrader{}

	// default to CORS being enabled
	disableCORS = false

	// define a logger
	logger = logrus.New()
)

// LogMessage is used to associate the log line Text with the originating/source LogFile when shipping log lines around
type LogMessage struct {
	Text    string `json:"text"`
	LogFile string `json:"logfile"`
}

// CompiledRegexColors is used to associate the regex with the selected ANSI color
type CompiledRegexColors struct {
	regex *regexp.Regexp
	color string
}

func main() {
	// set the logger to output to stdout
	logger.SetOutput(os.Stdout)

	// process config file
	configFilePtr := flag.String("c", "logstation.conf", "path to config file")
	flag.Parse()
	handleConfigFile(*configFilePtr)

	// preprocess all the regex patterns
	patterns := parseRegexPatterns()

	// setup message broker
	pubSub := pubsub.New(1)

	// process all log files to watch
	logFiles := viper.GetStringSlice("logs")
	for _, logFile := range logFiles {
		//begin watching the file in a goroutine for concurrency
		go follow(logFile, pubSub, patterns)
	}

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
	fsys, err := fs.Sub(webServerFiles, "web/build")
	if err != nil {
		panic(fmt.Errorf("error loading the web files into the server. error msg: %s", err))
	}
	fileHandler := http.FileServer(http.FS(fsys))
	e.GET("/*", echo.WrapHandler(fileHandler))

	// pass message broker channel into websocket handler
	wsHandlerChan := func(c echo.Context) error {
		return wshandler(c, pubSub)
	}
	e.GET("/ws", wsHandlerChan)

	// start the web server
	e.Logger.Fatal(e.Start(viper.GetString("server_settings.webserveraddress") + ":" + viper.GetString("server_settings.webserverport")))
}

// handleConfigFile processes the given config file and sets up app variables
// If no config file is provided or the configFilePath is empty,
// it will make a config file with the [logstation.default.conf] and quit the app
func handleConfigFile(configFilePath string) {

	configFilename := "logstation.conf"
	viper.SetConfigName(configFilename)
	viper.SetConfigType("toml")
	viper.AddConfigPath(".")
	viper.SetDefault("logs", []string{`test\logfile.log`, `test\logfile2.log`})
	viper.SetDefault("server_settings.webserveraddress", "0.0.0.0")
	viper.SetDefault("server_settings.disablecors", false)

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

// parseRegexPatterns processes all the regular expression patterns associated with each color
// and compiles them at boot time to optimize regex matching.
func parseRegexPatterns() []CompiledRegexColors {
	var syntaxColors models.SyntaxColors
	err := viper.UnmarshalKey("syntaxColors", &syntaxColors)
	if err != nil {
		logger.Fatal("Unable to unmarshall syntax colors from config file. Please check the colors in the config.")
		return nil
	}
	crcs := make([]CompiledRegexColors, len(syntaxColors))
	for index, element := range syntaxColors {
		regex, err := regexp.Compile(element.Regex)
		if err != nil {
			logger.Fatal("Unable to compile the regex of ", element.Regex, " associated with the color ", element.Color, ". Please check the conf file and ensure your regex syntax is valid. More details here: ", err)
		}
		crcs[index] = CompiledRegexColors{regex, element.Color}
	}
	return crcs
}

// follow begins a tailer for the specified logFilePath and publishes log lines to the given pubSub message broker
// When follow picks up a log line, it also runs the line through regex via func colorize
// to determine if it matches a color pattern
func follow(logFilePath string, pubSub *pubsub.PubSub, patterns []CompiledRegexColors) {

	parsedGlob, err := glob.Parse(logFilePath)
	if err != nil {
		panic(fmt.Sprintf("%q: failed to parse glob: %q", parsedGlob, err))
	}

	tailer, err := fswatcher.RunFileTailer([]glob.Glob{parsedGlob}, false, true, logger)
	for line := range tailer.Lines() {
		logger.Debug(line.Line)
		logMessage := colorize(line.Line, line.File, patterns)
		pubSub.Pub(logMessage, "lines")
	}

}

// colorize runs each line from a logFile through the regex patterns to determine if the line should be colored.
// Outputs a LogMessage with line color information
func colorize(line string, logFile string, patterns []CompiledRegexColors) LogMessage {
	for _, element := range patterns {
		if element.regex.MatchString(line) {
			switch element.color {
			case "red":
				line = color.RedString(line)
			case "green":
				line = color.GreenString(line)
			case "yellow":
				line = color.YellowString(line)
			case "blue":
				line = color.BlueString(line)
			case "magenta":
				line = color.MagentaString(line)
			case "cyan":
				line = color.CyanString(line)
			case "hired":
				line = color.HiRedString(line)
			case "higreen":
				line = color.HiGreenString(line)
			case "hiyellow":
				line = color.HiYellowString(line)
			case "hiblue":
				line = color.HiBlueString(line)
			case "himagenta":
				line = color.HiMagentaString(line)
			case "hicyan":
				line = color.HiCyanString(line)
			}
			break
		}
	}
	return LogMessage{line, logFile}
}

// wshandler handles incoming websocket connections and serves up log lines to the client
func wshandler(c echo.Context, pubSub *pubsub.PubSub) error {
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
