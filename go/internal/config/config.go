package config

import (
	"context"
	"log/slog"
	"sync"
)

type config struct {
	appConfig *AppConfig
	secret    *Secret
	once      sync.Once
}

type Config interface {
	GetAppConfig() *AppConfig
	GetSecret() *Secret
}

func New() Config {
	return &config{}
}

type AppConfig struct {
	ENV    string
	DB     DB     `mapstructure:"db"`
	Server Server `mapstructure:"server"`
}

type DB struct {
	Database string `mapstructure:"database"`
	Username string `mapstructure:"username"`
	Password string `mapstructure:"password"`
	TCP      TCP    `mapstructure:"tcp"`
}

type TCP struct {
	Host string `mapstructure:"host"`
	Port int    `mapstructure:"port"`
}

type CloudSQLConn struct {
	Region       string `mapstructure:"region"`
	InstanceName string `mapstructure:"instance_name"`
}

type Server struct {
	Port          int      `mapstructure:"port"`
	LogLevel      string   `mapstructure:"log_level"`
	AllowedOrigin []string `mapstructure:"allowed_origin"`
	ServerURL     string   `mapstructure:"server_url"`
}

type Secret struct {
	ENV string
	DEK []byte
}

func (c *config) loadConfigOnce() {
	slog.InfoContext(
		context.Background(),
		"Loading configuration",
	)

	appConfig := &AppConfig{
		ENV: "local",
	}

	db := &DB{
		Database: "kkb_db",
		Username: "username",
		Password: "password",
		TCP: TCP{
			Host: "db",
			Port: 3306,
		},
	}

	server := &Server{
		Port:          8080,
		LogLevel:      "debug",
		AllowedOrigin: []string{"*"},
		ServerURL:     "http://localhost:8080",
	}

	appConfig.DB = *db
	appConfig.Server = *server

	c.appConfig = appConfig

	c.secret = &Secret{
		ENV: "local",
		DEK: []byte("your-32-byte-long-dek-goes-here!"),
	}

	slog.InfoContext(
		context.Background(),
		"Loading configuration: Successfully loaded configuration",
		slog.String("env", c.appConfig.ENV),
		slog.String("log_level", c.appConfig.Server.LogLevel),
	)
}

func (c *config) GetAppConfig() *AppConfig {
	c.once.Do(func() {
		c.loadConfigOnce()
	})
	return c.appConfig
}

func (c *config) GetSecret() *Secret {
	c.once.Do(func() {
		c.loadConfigOnce()
	})
	return c.secret
}
