package server

import (
	"github.com/suda-3156/kkb/go/internal/infrastructure/database"
	"github.com/suda-3156/kkb/go/internal/setup"
)

var (
	_ setup.DatabaseConfigProvider = (*Config)(nil)
)

type Config struct {
	Database database.Config

	Port string `env:"PORT, default=8080"`
}

func (c *Config) DatabaseConfig() *database.Config {
	return &c.Database
}
