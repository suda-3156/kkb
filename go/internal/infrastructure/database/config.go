package database

import (
	"fmt"
	"net/url"
)

type Config struct {
	Name     string `env:"DB_NAME" json:",omitempty"`
	User     string `env:"DB_USER" json:",omitempty"`
	Password string `env:"DB_PASSWORD" json:"-"` // ignored by zap's JSON formatter
	Host     string `env:"DB_HOST" json:",omitempty"`
	Port     string `env:"DB_PORT" json:",omitempty"`
}

func (c *Config) DatabaseConfig() *Config {
	return c
}

func (c *Config) ConnectionURL() string {
	host := c.Host

	if v := c.Port; v != "" {
		host = fmt.Sprintf("%s:%s", c.Host, v)
	}

	u := &url.URL{
		Scheme: "mysql",
		Host:   host,
		Path:   c.Name,
	}

	if c.User != "" || c.Password != "" {
		u.User = url.UserPassword(c.User, c.Password)
	}

	return u.String()
}
