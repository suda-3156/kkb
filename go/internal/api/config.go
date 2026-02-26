package api

import (
	"github.com/suda-3156/kkb/go/internal/encryption"
	"github.com/suda-3156/kkb/go/internal/infrastructure/database"
	"github.com/suda-3156/kkb/go/internal/infrastructure/keys"
	"github.com/suda-3156/kkb/go/internal/setup"
)

var (
	_ setup.DatabaseConfigProvider   = (*Config)(nil)
	_ setup.KeyManagerConfigProvider = (*Config)(nil)
)

type Config struct {
	Database         database.Config
	KeyManager       keys.Config
	EncryptionManger encryption.Config

	Port string `env:"PORT, default=8080"`

	AllowedOrigins []string `env:"ALLOWED_ORIGINS, default=http://localhost:3000"`
}

func (c *Config) DatabaseConfig() *database.Config {
	return &c.Database
}

func (c *Config) KeyManagerConfig() *keys.Config {
	return &c.KeyManager
}
