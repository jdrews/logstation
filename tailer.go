package main

import (
	"fmt"
	"github.com/cskr/pubsub"
	"github.com/jdrews/go-tailer/fswatcher"
	"github.com/jdrews/go-tailer/glob"
	"time"
)

// Follow begins a tailer for the specified logFilePath and publishes log lines to the given pubSub message broker
// When Follow picks up a log line, it also runs the line through regex via func Colorize
// to determine if it matches a color pattern
func Follow(logFilePath string, pubSub *pubsub.PubSub, patterns []CompiledRegexColors, polling bool, pollingRateMS int) {

	var tailer fswatcher.FileTailer

	parsedGlob, err := glob.Parse(logFilePath)
	if err != nil {
		panic(fmt.Sprintf("%q: failed to parse glob: %q", parsedGlob, err))
	}

	if polling {
		tailer, err = fswatcher.RunPollingFileTailer([]glob.Glob{parsedGlob}, false, true, time.Duration(pollingRateMS)*time.Millisecond, logger)
	} else {
		tailer, err = fswatcher.RunFileTailer([]glob.Glob{parsedGlob}, false, true, logger)
	}

	for line := range tailer.Lines() {
		logger.Debug(line.Line)
		logMessage := Colorize(line.Line, line.File, patterns)
		pubSub.Pub(logMessage, "lines")
	}

}
