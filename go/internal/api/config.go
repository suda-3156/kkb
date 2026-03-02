package api

import (
	"github.com/suda-3156/kkb/go/internal/encryption"
	"github.com/suda-3156/kkb/go/internal/infrastructure/database"
	"github.com/suda-3156/kkb/go/internal/infrastructure/keys"
	"github.com/suda-3156/kkb/go/internal/infrastructure/secrets"
	"github.com/suda-3156/kkb/go/internal/setup"
)

var (
	_ setup.DatabaseConfigProvider      = (*Config)(nil)
	_ setup.KeyManagerConfigProvider    = (*Config)(nil)
	_ setup.SecretManagerConfigProvider = (*Config)(nil)
)

type Config struct {
	Database         database.Config
	KeyManager       keys.Config
	EncryptionManger encryption.Config
	SecretManager    secrets.Config

	Port string `env:"PORT, default=8080"`

	AllowedOrigins []string `env:"ALLOWED_ORIGINS, default=http://localhost:3000"`
}

func (c *Config) DatabaseConfig() *database.Config {
	return &c.Database
}

func (c *Config) KeyManagerConfig() *keys.Config {
	return &c.KeyManager
}

func (c *Config) SecretManagerConfig() *secrets.Config {
	return &c.SecretManager
}
