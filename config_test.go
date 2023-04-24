package main

import (
	"github.com/spf13/viper"
	"os"
	"os/exec"
	"testing"
)

// TestHandleConfigFile_Default tests the HandleConfigFile using a default config file
//
//	After loading up the default config file, it checks a few viper settings to ensure it was read in correctly
func TestHandleConfigFile_Default(t *testing.T) {
	// Blank out all of viper's configs
	viper.Reset()
	// Process the default config
	HandleConfigFile("logstation.default.conf")

	// Should have 3 log files processed
	parsedLogs := len(viper.GetStringSlice("logs"))
	expectedLogs := 3
	if parsedLogs != expectedLogs {
		t.Errorf("Should have had %d log files. Ended up with %d", expectedLogs, parsedLogs)
	}

	// Should have a logStationName called "logstation"
	parsedName := viper.GetString("logStationName")
	expectedName := "logstation"
	if parsedName != expectedName {
		t.Errorf("Should have had a logstation name of \"%s\". Ended up with %s", expectedName, parsedName)
	}
}

// TestHandleConfigFile_Default tests the HandleConfigFile using a conf file that doesn't exist
//
//	What should happen after that is that logstation will create a config file for you and exit
//	This test runs a subprocess to see if it exits as expected and writes the logfile
//	Uses the ideas of Go Dev Andrew Gerrand in his Testing Techniques talk
//		at https://go.dev/talks/2014/testing.slide#23
func TestHandleConfigFile_BadPath(t *testing.T) {
	// Blank out all of viper's configs
	viper.Reset()
	// Attempt to remove logstation.conf
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
	cmd := exec.Command(os.Args[0], "-test.run=TestHandleConfigFile_BadPath")
	cmd.Env = append(os.Environ(), "DO_IT=1")
	err = cmd.Run()
	if err == nil {
		// It ran fine. Let's check if it wrote the log file
		_, err = os.Stat("logstation.conf")
		if err == nil {
			return // logstation.conf exists! Test passes
		} else {
			t.Fatalf("Looks like the logstation.conf file doesn't exist. There was a problem checking for it. logstation should have made it and exited cleanly for you. err: %v", err)
		}
	}
	t.Fatalf("process ran with err %v, want exit status 0 or nil", err)
}
