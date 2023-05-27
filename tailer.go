package main

import (
	"fmt"
	"github.com/cskr/pubsub"
	"github.com/jdrews/go-tailer/fswatcher"
	"github.com/jdrews/go-tailer/glob"
)

// Follow begins a tailer for the specified logFilePath and publishes log lines to the given pubSub message broker
// When Follow picks up a log line, it also runs the line through regex via func Colorize
// to determine if it matches a color pattern
func Follow(logFilePath string, pubSub *pubsub.PubSub, patterns []CompiledRegexColors) {

	parsedGlob, err := glob.Parse(logFilePath)
	if err != nil {
		panic(fmt.Sprintf("%q: failed to parse glob: %q", parsedGlob, err))
	}

	tailer, err := fswatcher.RunFileTailer([]glob.Glob{parsedGlob}, false, true, logger)
	for line := range tailer.Lines() {
		logger.Debug(line.Line)
		logMessage := Colorize(line.Line, line.File, patterns)
		pubSub.Pub(logMessage, "lines")
	}

}
