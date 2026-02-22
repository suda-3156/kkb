package database

import "fmt"

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

// ConnectionURL returns a DSN string in the format expected by go-sql-driver/mysql:
func (c *Config) ConnectionURL() string {
	addr := c.Host
	if c.Port != "" {
		addr = fmt.Sprintf("%s:%s", c.Host, c.Port)
	}

	return fmt.Sprintf("%s:%s@tcp(%s)/%s", c.User, c.Password, addr, c.Name)
}
