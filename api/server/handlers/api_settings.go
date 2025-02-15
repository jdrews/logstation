package handlers

import (
	"net/http"

	"github.com/jdrews/logstation/api/server/models"
	"github.com/labstack/echo/v4"
	"github.com/spf13/viper"
)

// GetLogstationName - Get Logstation Name
func (c *Container) GetLogstationName(ctx echo.Context) error {
	return ctx.JSON(http.StatusOK, models.LogstationName{
		Name: viper.GetString("logStationName"),
	})
}

// GetSettingsSyntax - Get Syntax Colors
func (c *Container) GetSettingsSyntax(ctx echo.Context) error {
	var syntaxColors models.SyntaxColors
	viper.UnmarshalKey("syntaxColors", &syntaxColors)
	return ctx.JSON(http.StatusOK, syntaxColors)
}

// GetSettingsWebsocketSecurit - Get WebSocket Security Setting
func (c *Container) GetSettingsWebsocketSecurity(ctx echo.Context) error {
	return ctx.JSON(http.StatusOK, models.WebSocketSecurity{
		UseSecureWebSocket: viper.GetBool("server_settings.webSocketSecurity"),
	})
}
