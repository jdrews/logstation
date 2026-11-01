package main

import (
	"embed"
	"flag"
	"github.com/cskr/pubsub"
	"github.com/sirupsen/logrus"
	"github.com/spf13/viper"
	"os"
)

const (
	// pubSubQueueSize is the number of lines each subscriber of the message
	// broker can have queued ahead of it. See the pubsub.New call in main()
	// for why this matters (burst absorption + non-blocking fan-out).
	pubSubQueueSize = 1024
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
	//
	// Each subscriber gets a queue of pubSubQueueSize lines. The queue must
	// be large enough to absorb a burst of lines (issue #110: many lines can
	// arrive within the same millisecond) without the subscriber having to
	// drain in real time. Because Follow publishes with the non-blocking
	// TryPub, a subscriber that falls more than pubSubQueueSize lines behind
	// drops lines for itself only, instead of wedging the broker and
	// skipping lines for every other client.
	pubSub := pubsub.New(pubSubQueueSize)

	// collect settings for tailingMethod
	tailingMethod := viper.GetString("tailingMethod")
	polling := false
	if tailingMethod == "polling" {
		polling = true
	}
	pollingTimeMS := viper.GetInt("pollingTimeMS")

	// process all log files to watch
	logFiles := viper.GetStringSlice("logs")
	for _, logFile := range logFiles {
		//begin watching the file in a goroutine for concurrency
		go Follow(logFile, pubSub, patterns, polling, pollingTimeMS)
	}

	// startup the web server. Fatal logs the error and exits with status 1,
	// matching the old echo Logger.Fatal behavior.
	if err := StartWebServer(pubSub); err != nil {
		logger.Fatal(err)
	}
}
