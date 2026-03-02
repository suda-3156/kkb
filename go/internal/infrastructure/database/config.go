package database

import (
	"fmt"
)

type Config struct {
	Name     string `env:"DB_NAME" json:",omitempty"`
	User     string `env:"DB_USER" json:",omitempty"`
	Password string `env:"DB_PASSWORD" json:"-"`

	ConnectionMode string `env:"DB_CONNECTION_MODE" json:",omitempty"`
	ConnectionName string `env:"DB_CONNECTION_NAME" json:",omitempty"`
	Host           string `env:"DB_HOST" json:",omitempty"`
	Port           string `env:"DB_PORT" json:",omitempty"`

	DebugLog bool `env:"DB_DEBUG_LOG" json:",omitempty"`
}

func (c *Config) DatabaseConfig() *Config {
	return c
}

// ConnectionURL returns a DSN string in the format expected by go-sql-driver/mysql:
func (c *Config) ConnectionURL() string {
	addr := c.Host
	if c.Port != "" {
		addr = fmt.Sprintf("%s:%s", c.Host, c.Port)
	}

	if c.ConnectionMode != "cloudsqlconn" {
		return fmt.Sprintf("%s:%s@tcp(%s)/%s?parseTime=true", c.User, c.Password, addr, c.Name)
	}

	return fmt.Sprintf("%s:%s@cloudsqlconn(localhost:3306)/%s?parseTime=true", c.User, c.Password, c.Name)
}
