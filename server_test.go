package main

import (
	"io"
	"net/http"
	"testing"
	"time"

	"github.com/cskr/pubsub"
	"github.com/spf13/viper"
)

// TestStartWebServer is a unit test for StartWebServer
//
//	It loads up the default config and creates a PubSub broker
//	It then confirms the webserver is responding, to both / and api calls
func TestStartWebServer(t *testing.T) {
	// Load in the default config file, so we get some regex patterns
	HandleConfigFile("logstation.default.conf")

	// Setup message broker
	pubSub := pubsub.New(1)

	go StartWebServer(pubSub)

	// Give the StartWebServer  enough time to startup
	time.Sleep(time.Duration(1000) * time.Millisecond)

	// Server should be accessible at localhost
	serverUrl := "http://127.0.0.1" + ":" + viper.GetString("server_settings.webserverport")

	// See if the webserver is up and responding at /
	response, err := http.Get(serverUrl)
	if err != nil {
		t.Errorf("Unable to request the webserver at %s", serverUrl)
	}
	if response.StatusCode != 200 {
		t.Errorf("Server responded with a bad status code: %s", response.Status)
	}

	// Verify it responds to /settings/logstation-name
	response, err = http.Get(serverUrl + "/settings/logstation-name")
	if err != nil {
		t.Errorf("Unable to request the webserver at %s", serverUrl+"/settings/logstation-name")
	}
	if response.StatusCode != 200 {
		t.Errorf("Server responded with a bad status code: %s", response.Status)
	}
	responseData, err := io.ReadAll(response.Body)
	if err != nil {
		t.Errorf("Failed to read the body, err: %s", err)
	}
	expectedResponse := "{\"name\":\"logstation\"}\n"
	responseString := string(responseData)
	if responseString != expectedResponse {
		t.Errorf("Response for /settings/logstation-name was expected to be %s, but got %s", expectedResponse, responseData)
	}

	// Verify it responds to /settings/websocket-security
	response, err = http.Get(serverUrl + "/settings/websocket-security")
	if err != nil {
		t.Errorf("Unable to request the webserver at %s", serverUrl+"/settings/websocket-security")
	}
	if response.StatusCode != 200 {
		t.Errorf("Server responded with a bad status code: %s", response.Status)
	}
	responseData, err = io.ReadAll(response.Body)
	if err != nil {
		t.Errorf("Failed to read the body, err: %s", err)
	}
	expectedResponse = "{\"useSecureWebSocket\":false}\n"
	responseString = string(responseData)
	if responseString != expectedResponse {
		t.Errorf("Response for /settings/websocket-security was expected to be %s, but got %s", expectedResponse, responseData)
	}
}
