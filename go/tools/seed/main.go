// This package is for seeding initial data in local development.
package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/suda-3156/kkb/go/ent"
	entmigrate "github.com/suda-3156/kkb/go/ent/migrate"
	"github.com/suda-3156/kkb/go/internal/infrastructure/database"
	"github.com/suda-3156/kkb/go/internal/infrastructure/keys"
	"github.com/suda-3156/kkb/go/internal/setup"
)

var (
	_ setup.DatabaseConfigProvider   = (*Config)(nil)
	_ setup.KeyManagerConfigProvider = (*Config)(nil)
)

type Config struct {
	Database   database.Config
	KeyManager keys.Config
}

func (c *Config) DatabaseConfig() *database.Config {
	return &c.Database
}

func (c *Config) KeyManagerConfig() *keys.Config {
	return &c.KeyManager
}

func main() {
	ctx, done := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer done()

	slog.InfoContext(ctx, "Starting seed process for local development")

	err := run(ctx)
	done()

	if err != nil {
		slog.ErrorContext(ctx, "Seed process failed", "error", err)
		os.Exit(1)
	}

	slog.InfoContext(ctx, "Seed process completed successfully")
}

func run(ctx context.Context) error {
	var cfg Config
	env, err := setup.Setup(ctx, &cfg)
	if err != nil {
		return fmt.Errorf("failed to setup environment: %w", err)
	}
	defer env.Close()

	if env.Database() == nil {
		return fmt.Errorf("missing database connection in env variables")
	}

	// Apply database migrations.
	migrate(env.Database().Client)

	// Create an encryption key.
	if err := createEncryptionKey(ctx, &cfg.KeyManager); err != nil {
		return err
	}

	return nil
}

func migrate(client *ent.Client) {
	slog.Warn("Auto-migrating database schema in local environment...")
	err := client.Debug().Schema.Create(
		context.Background(),
		entmigrate.WithDropIndex(true),
		entmigrate.WithDropColumn(true),
	)
	if err != nil {
		slog.Error("Failed to migrate schema", slog.String("reason", err.Error()))
	}
	slog.Info("Database schema migrated successfully.")
}

func createEncryptionKey(ctx context.Context, cfg *keys.Config) error {
	kms, err := keys.NewFilesystem(ctx, cfg)
	if err != nil {
		return err
	}

	kmst, ok := kms.(keys.EncryptionKeyManager)
	if !ok {
		return fmt.Errorf("not EncryptionKeyManager, %T", kms)
	}

	keyID, err := kmst.CreateEncryptionKey(ctx, "system", "ledger-encryption-key")
	if err != nil {
		return err
	}

	if _, err := kmst.CreateKeyVersion(ctx, keyID); err != nil {
		return err
	}

	return nil
}
