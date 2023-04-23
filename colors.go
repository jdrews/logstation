package main

import (
	"github.com/fatih/color"
	"github.com/jdrews/logstation/api/server/models"
	"github.com/spf13/viper"
	"regexp"
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

// ParseRegexPatterns processes all the regular expression patterns associated with each color
// and compiles them at boot time to optimize regex matching.
func ParseRegexPatterns() []CompiledRegexColors {
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

// Colorize runs each line from a logFile through the regex patterns to determine if the line should be colored.
// Outputs a LogMessage with line colors in ANSI format
func Colorize(line string, logFile string, patterns []CompiledRegexColors) LogMessage {
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
