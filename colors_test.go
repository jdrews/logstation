package main

import (
	"bytes"
	"fmt"
	"github.com/fatih/color"
	"github.com/fstab/grok_exporter/tailer/fswatcher"
	"testing"
)

func TestParseRegexPatterns(t *testing.T) {
	// Load in the default config file so we get some regex patterns
	HandleConfigFile("logstation.default.conf")

	// ParseRegexPatterns pulls from the viper config as an input
	compiledRegexColors := ParseRegexPatterns()

	// Check the number of CompiledRegexColors
	parsedColors := len(compiledRegexColors)
	expectedColors := 5
	if parsedColors != expectedColors {
		t.Errorf("Should have had %d CompiledRegexColors. Ended up with %d", expectedColors, parsedColors)
	}

	// Verify the first color is hired
	parsedColor := compiledRegexColors[0].color
	expectedColor := "hired"
	if parsedColor != expectedColor {
		t.Errorf("First regex should have been %s. Ended up with %s", expectedColor, parsedColor)
	}

	// Verify the first color works with an expected ERROR string
	testString := "[ERROR]: There's something wrong going on!"
	parsedRegex := compiledRegexColors[0].regex
	if parsedRegex.MatchString(testString) {
		return //it matches!
	} else {
		t.Errorf("The first regex wasn't able to pick up that there's the word ERROR in the testString. Fail")
	}
}

func TestColorize(t *testing.T) {
	// Load in the default config file, so we get some regex patterns
	HandleConfigFile("logstation.default.conf")

	// Get the compiledRegexColors
	compiledRegexColors := ParseRegexPatterns()

	// Enable ANSI colors regardless of terminal state
	color.NoColor = false

	// Test a INFO  line
	testLine := fswatcher.Line{
		Line: "[INFO]: You might want to know about this...",
		File: "test/logfile.log",
	}
	logMessage := Colorize(testLine.Line, testLine.File, compiledRegexColors)

	// Setup a read buffer to read back the lines
	rb := new(bytes.Buffer)
	_, err := fmt.Fprint(rb, logMessage.Text, "\n")
	if err != nil {
		return
	}

	// Read the line back from the buffer
	line, _ := rb.ReadString('\n')
	scannedLine := fmt.Sprintf("%q", line)

	// Prepare a colored string to compare to
	colored := fmt.Sprintf("\x1b[%dm%s\x1b[0m\n", color.FgHiGreen, testLine.Line)
	escapedForm := fmt.Sprintf("%q", colored)

	if scannedLine != escapedForm {
		t.Errorf("Expecting %s, got '%s'\n", escapedForm, scannedLine)
	}
}
