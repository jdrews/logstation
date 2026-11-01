package handlers

import (
	"net/http"
	"testing"

	"github.com/labstack/echo/v5/echotest"
	"github.com/spf13/viper"
)

// TestGetLogstationName verifies the /settings/logstation-name handler
// responds 200 with the configured instance name.
func TestGetLogstationName(t *testing.T) {
	viper.Set("logStationName", "test-station")
	c, rec := echotest.ContextConfig{}.ToContextRecorder(t)

	if err := (&Container{}).GetLogstationName(c); err != nil {
		t.Fatalf("GetLogstationName returned error: %s", err)
	}
	if rec.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, rec.Code)
	}
	// ctx.JSON appends a trailing newline
	if body := rec.Body.String(); body != `{"name":"test-station"}`+"\n" {
		t.Errorf("Expected body {\"name\":\"test-station\"}, got %q", body)
	}
}

// TestGetSettingsSyntax verifies the /settings/syntax handler responds 200
// with the configured syntax colors.
func TestGetSettingsSyntax(t *testing.T) {
	viper.Set("syntaxColors", []map[string]string{
		{"color": "hired", "regex": ".*ERROR.*"},
	})
	c, rec := echotest.ContextConfig{}.ToContextRecorder(t)

	if err := (&Container{}).GetSettingsSyntax(c); err != nil {
		t.Fatalf("GetSettingsSyntax returned error: %s", err)
	}
	if rec.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, rec.Code)
	}
	if body := rec.Body.String(); body == "" {
		t.Error("Expected a non-empty syntax colors response")
	}
}

// TestGetSettingsWebsocketSecurity verifies the /settings/websocket-security
// handler responds 200 with the configured websocket security setting.
func TestGetSettingsWebsocketSecurity(t *testing.T) {
	viper.Set("server_settings.webSocketSecurity", true)
	c, rec := echotest.ContextConfig{}.ToContextRecorder(t)

	if err := (&Container{}).GetSettingsWebsocketSecurity(c); err != nil {
		t.Fatalf("GetSettingsWebsocketSecurity returned error: %s", err)
	}
	if rec.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, rec.Code)
	}
	// ctx.JSON appends a trailing newline
	if body := rec.Body.String(); body != `{"useSecureWebSocket":true}`+"\n" {
		t.Errorf("Expected body {\"useSecureWebSocket\":true}, got %q", body)
	}
}
