package main

import (
	_ "embed"
	"errors"
	"fmt"
	"github.com/spf13/viper"
	"os"
)

// HandleConfigFile processes the given config file and sets up app variables
// If no config file is provided or the configFilePath is empty,
// it will make a config file with the [logstation.default.conf] and quit the app
func HandleConfigFile(configFilePath string) {

	configFilename := "logstation.conf"
	viper.SetConfigName(configFilename)
	viper.SetConfigType("toml")
	viper.AddConfigPath(".")
	viper.SetDefault("logs", []string{`test\logfile.log`, `test\logfile2.log`})
	viper.SetDefault("server_settings.webserveraddress", "0.0.0.0")
	viper.SetDefault("server_settings.disablecors", false)
	viper.SetDefault("server_settings.websocketsecurity", false)
	viper.SetDefault("tailingMethod", "filesystem")
	viper.SetDefault("pollingTimeMS", 10)

	viper.SetConfigFile(configFilePath)
	if err := viper.ReadInConfig(); err != nil {
		if errors.Is(err, os.ErrNotExist) || errors.As(err, &viper.ConfigFileNotFoundError{}) {
			// First run: no config file yet. Writing the default and exiting is
			// the intended flow (not an error), so log it informatively and say
			// plainly what the user should do next.
			logger.Info("No config file found at ", configFilePath)
			logger.Info("Writing default config file to ", configFilename)
			logger.Info("Edit the config file, then run logstation again to start the server. Exiting.")
			err := os.WriteFile(configFilename, defaultConfigFile, 0644)
			if err != nil {
				panic(err)
			}
			os.Exit(0)
		} else {
			panic(fmt.Errorf("config file %q loading error: %s", viper.ConfigFileUsed(), err))
		}
	}
	logger.Info("Loaded ", viper.ConfigFileUsed())
}
