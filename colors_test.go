package main

import (
	"fmt"
	"github.com/fatih/color"
	"github.com/jdrews/go-tailer/fswatcher"
	"strings"
	"testing"
)

// TestParseRegexPatterns is a unit test for the ParseRegexPatterns function
//
//	This unit test loads the default config and parses the color-to-regex patterns in the default config
//	It then verifies the output compiledRegexColors is setup as expected
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

// TestColorize is a unit test for the Colorize function
//
//	It loads up a test config and parses the color-to-regex patterns in the config
//	It then colorizes the log line per ANSI specs
//	To test if the colors work,
//	it compares ANSI escaped lines for the Colorize output and a locally constructed colored line
func TestColorize(t *testing.T) {
	// Load in a test config file, which has all the possible colors defined in it
	HandleConfigFile("logstation.test.conf")

	// Get the compiledRegexColors
	compiledRegexColors := ParseRegexPatterns()

	// Enable ANSI colors regardless of terminal state
	color.NoColor = false

	// Create a map of color name to ansi color
	colorMap := map[string]color.Attribute{
		"red":       color.FgRed,
		"green":     color.FgGreen,
		"yellow":    color.FgYellow,
		"blue":      color.FgBlue,
		"magenta":   color.FgMagenta,
		"cyan":      color.FgCyan,
		"hired":     color.FgHiRed,
		"higreen":   color.FgHiGreen,
		"hiyellow":  color.FgHiYellow,
		"hiblue":    color.FgHiBlue,
		"himagenta": color.FgHiMagenta,
		"hicyan":    color.FgHiCyan,
	}

	// Loop through all the types of colors and ensure Colorize can pick it up
	for _, regexColor := range compiledRegexColors {
		// Create an example line, defined for each of the types of colors
		testLine := fswatcher.Line{
			Line: "#" + strings.ToUpper(regexColor.color) + "#: You might want to know about this...",
			File: "test/logfile.log",
		}
		// Have Colorize color the line based on regex
		logMessage := Colorize(testLine.Line, testLine.File, compiledRegexColors)

		logMessageEscaped := fmt.Sprintf("%q", logMessage.Text+"\n")

		// Prepare a colored string to compare to
		colored := fmt.Sprintf("\x1b[%dm%s\x1b[0m\n", colorMap[regexColor.color], testLine.Line)
		coloredEscaped := fmt.Sprintf("%q", colored)

		if logMessageEscaped != coloredEscaped {
			t.Errorf("When testing %s: Expecting %s, got '%s'\n", regexColor.color, coloredEscaped, logMessageEscaped)
		}
	}

}
