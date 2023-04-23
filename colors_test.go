package main

import (
	"fmt"
	"github.com/fatih/color"
	"testing"
)

func TestParseRegexPatterns(t *testing.T) {
	// load in the default config file so we get some regex patterns
	HandleConfigFile("logstation.default.conf")

	// ParseRegexPatterns pulls from the viper config as an input
	var compiledRegexColors = ParseRegexPatterns()

	// Check the number of CompiledRegexColors
	var parsedColors = len(compiledRegexColors)
	var expectedColors = 5
	if parsedColors != expectedColors {
		t.Errorf("Should have had %d CompiledRegexColors. Ended up with %d", expectedColors, parsedColors)
	}

	// Verify the first color is hired
	var parsedColor = compiledRegexColors[0].color
	var expectedColor = "hired"
	if parsedColor != expectedColor {
		t.Errorf("First regex should have been %s. Ended up with %s", expectedColor, parsedColor)
	}

	// Verify the first color works with an expected ERROR string
	var testString = "[ERROR]: There's something wrong going on!"
	var parsedRegex = compiledRegexColors[0].regex
	if parsedRegex.MatchString(testString) {
		return //it matches!
	} else {
		t.Errorf("The first regex wasn't able to pick up that there's the word ERROR in the testString. Fail")
	}
}

func TestColorize(t *testing.T) {
	// load in the default config file so we get some regex patterns
	HandleConfigFile("logstation.default.conf")

	// Get the compiledRegexColors
	var compiledRegexColors = ParseRegexPatterns()

	// Test a ERROR/hired line
	var testString = "[ERROR]: There's something wrong going on!"
	var testLogFile = "test/logfile.log"
	var logMessage = Colorize(testString, testLogFile, compiledRegexColors)
	// make a testString HiRed ANSI so we can compare the output of Colorize
	var testStringColored = color.HiRedString(testString)

	// Compare the test built string to the Colorized string
	// TODO: Something is stripping ANSI escape codes above. This makes the compare always pass. Need to fix this.
	var escapedLogMessage = fmt.Sprintf("%q", logMessage.Text)
	var escapedTestStringColored = fmt.Sprintf("%q", testStringColored)
	if escapedTestStringColored != escapedLogMessage {
		t.Errorf("LogMessage.Text should have been colored red. It was not. line: %s", logMessage.Text)
	}
	if logMessage.LogFile != testLogFile {
		t.Errorf("LogMessage.LogFile should have been %s. Ended up with %s", testLogFile, logMessage.LogFile)
	}

}
