package main

import (
	"github.com/spf13/viper"
	"os"
	"os/exec"
	"testing"
)

func TestWithDefaultConfigFile(t *testing.T) {
	// blank out all of viper's configs
	viper.Reset()
	// process the default config
	HandleConfigFile("logstation.default.conf")

	// Should have 3 log files processed
	var parsedLogs = len(viper.GetStringSlice("logs"))
	var expectedLogs = 3
	if parsedLogs != expectedLogs {
		t.Errorf("Should have had %d log files. Ended up with %d", expectedLogs, parsedLogs)
	}

	// Should have a logStationName called "logstation"
	var parsedName = viper.GetString("logStationName")
	var expectedName = "logstation"
	if parsedName != expectedName {
		t.Errorf("Should have had a logstation name of \"%s\". Ended up with %s", expectedName, parsedName)
	}
}

func TestBadPath(t *testing.T) {
	// blank out all of viper's configs
	viper.Reset()
	// attempt to remove logstation.conf
	err := os.Remove("logstation.conf")
	if !(err == nil || os.IsNotExist(err)) { // continue if no errors or if the conf file doesn't exist
		panic(err)
	}

	// If DO_IT is set, lets run the test
	if os.Getenv("DO_IT") == "1" {
		HandleConfigFile("thisfiledoesntexist.conf")
		return
	}
	// Setup a subprocess to run the test
	// follows the ideas from Go Dev Andrew Gerrand in his Testing Techniques talk
	//  https://go.dev/talks/2014/testing.slide#23
	cmd := exec.Command(os.Args[0], "-test.run=TestBadPath")
	cmd.Env = append(os.Environ(), "DO_IT=1")
	err = cmd.Run()
	if err == nil {
		// it ran fine. let's check if it wrote the log file
		_, err = os.Stat("logstation.conf")
		if err == nil {
			return // logstation.conf exists! Test passes
		} else {
			t.Fatalf("Looks like the logstation.conf file doesn't exist. There was a problem checking for it. logstation should have made it and exited cleanly for you. err: %v", err)
		}
	}
	t.Fatalf("process ran with err %v, want exit status 0 or nil", err)
}
