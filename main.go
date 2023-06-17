package main

import (
	"embed"
	"flag"
	"github.com/cskr/pubsub"
	"github.com/sirupsen/logrus"
	"github.com/spf13/viper"
	"os"
)

var (
	// use go embed to package up the webServerFiles
	//go:embed web/dist
	webServerFiles embed.FS

	// use go embed to serve up the defaultConfigFile
	//go:embed logstation.default.conf
	defaultConfigFile []byte

	// define a logger
	logger = logrus.New()
)

func main() {
	// set the logger to output to stdout
	logger.SetOutput(os.Stdout)

	// process config file
	configFilePtr := flag.String("c", "logstation.conf", "path to config file")
	flag.Parse()
	HandleConfigFile(*configFilePtr)

	// preprocess all the regex patterns
	patterns := ParseRegexPatterns()

	// setup message broker
	pubSub := pubsub.New(1)

	// process all log files to watch
	logFiles := viper.GetStringSlice("logs")
	for _, logFile := range logFiles {
		//begin watching the file in a goroutine for concurrency
		go Follow(logFile, pubSub, patterns, false)
	}

	// startup the web server
	StartWebServer(pubSub)
}
