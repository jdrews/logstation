package main

import (
	"bufio"
	"fmt"
	"github.com/cskr/pubsub"
	"github.com/fatih/color"
	"os"
	"testing"
	"time"
)

// writeALine writes a logString line to a specified logFilePath
func writeALine(t *testing.T, logFilePath string, logString string) {
	// Write a line to the logFilePath
	file, err := os.OpenFile(logFilePath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		t.Errorf("failed creating file: %s", err)
	}
	t.Logf("%s: opened the file: %s", time.Now(), file.Name())
	datawriter := bufio.NewWriter(file)
	_, err = datawriter.WriteString(fmt.Sprint(logString))
	if err != nil {
		t.Errorf("Unable to write a string to %s, err: %s", logFilePath, err)
	}
	t.Logf("%s: wrote the logString: %s", time.Now(), logString)
	err = datawriter.Flush()
	if err != nil {
		t.Errorf("Unable to flush %s, err: %s", logFilePath, err)
	}
	t.Logf("%s: file flished: %s", time.Now(), logFilePath)
	err = file.Close()
	t.Logf("%s: file closed", time.Now())
	if err != nil {
		t.Errorf("Unable to close %s, err: %s", logFilePath, err)
	}
}

// TestFollowFilesystem executes the testFollow integration test with the filesystem tailing method
func TestFollowFilesystem(t *testing.T) {
	testFollow(t, false, 10)
}

// TestFollowPolling executes the testFollow integration test with the polling tailing method
func TestFollowPolling(t *testing.T) {
	testFollow(t, true, 10)
}

// testFollow is an integration test for the entire backend tailing system
//
//	This test starts up the Follow function, which watches a specified log file,
//	writes a line to the log file,
//	and listens for a response on the pubsub topic.
//	This test also verifies the message was correctly colored.
func testFollow(t *testing.T, polling bool, pollingTimeMS int) {
	// Enable ANSI colors regardless of terminal state
	color.NoColor = false

	// Load in the default config file, so we get some regex patterns
	HandleConfigFile("logstation.default.conf")

	// Get the compiledRegexColors
	compiledRegexColors := ParseRegexPatterns()

	// Prepare a colored string to compare to
	testLine := "[INFO]: You might want to know about this..."
	colored := fmt.Sprintf("\x1b[%dm%s\x1b[0m", color.FgHiGreen, testLine)
	escapedForm := fmt.Sprintf("%q", colored)

	// Log file to test against
	logFilePath := "./logfile.log"

	// Setup message broker
	pubSub := pubsub.New(1)

	// Subscribe to "lines" topic
	linesChannel := pubSub.Sub("lines")
	defer pubSub.Unsub(linesChannel, "lines")

	// Run Follow
	go Follow(logFilePath, pubSub, compiledRegexColors, polling, pollingTimeMS)

	// Give the fswatcher.RunFileTailer enough time to startup
	time.Sleep(time.Duration(2000) * time.Millisecond)

	// Write a line to the test log
	writeALine(t, logFilePath, "[INFO]: You might want to know about this...\n")
	t.Logf("%s: Line written to %s", time.Now(), logFilePath)

	// Setup a timer for listening to the topic
	listenDurationString := "2s"
	listenDuration, _ := time.ParseDuration(listenDurationString)
	listenTimer := time.AfterFunc(listenDuration, func() {
		t.Errorf("Waited %s for a message from Follow() and nothing came through. It's possible the tailer didn't get enough time to start tailing, or other bad things happened", listenDurationString)
		// Let the test listener know that we're shutting things down
		pubSub.Pub("poisonpill", "lines")
	})
	defer listenTimer.Stop()

	// Listen for a response
	for line := range linesChannel {
		if line == "poisonpill" {
			break // The test failed because we didn't get a message in the listenDuration
		}
		t.Logf("%s, Got a message on the lines channel! line: %s", time.Now(), line)

		// Prepare the tailedLine for comparison
		tailedLine := fmt.Sprintf("%q", line.(LogMessage).Text)

		// Check to see if it matches expectations
		if tailedLine != escapedForm {
			t.Errorf("Expecting %s, got '%s'\n", escapedForm, tailedLine)
		}
		break
	}
}
