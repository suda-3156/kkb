// This package is for CLI access to internal features for development and debugging purposes.
package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/suda-3156/kkb/go/internal/aggregation"
	"github.com/suda-3156/kkb/go/internal/encryption"
	"github.com/suda-3156/kkb/go/internal/infrastructure/database"
	"github.com/suda-3156/kkb/go/internal/infrastructure/keys"
	ledgeraccount "github.com/suda-3156/kkb/go/internal/ledger_account"
	"github.com/suda-3156/kkb/go/internal/logging"
	"github.com/suda-3156/kkb/go/internal/setup"
	"github.com/suda-3156/kkb/go/internal/transaction"
)

var (
	_ setup.DatabaseConfigProvider   = (*Config)(nil)
	_ setup.KeyManagerConfigProvider = (*Config)(nil)
)

type Config struct {
	Database         database.Config
	KeyManager       keys.Config
	EncryptionManger encryption.Config
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

	logging.SetDefault(logging.NewFromEnv())

	logging.Notice(ctx, "Starting CLI tool for local DEVELOPMENT environment")

	err := run(ctx)
	done()

	if err != nil {
		logging.Error(ctx, "CLI tool process failed", "error", err)
		os.Exit(1)
	}

	logging.Notice(ctx, "CLI tool process completed successfully")
}

func run(ctx context.Context) error {
	var cfg Config
	env, err := setup.Setup(ctx, &cfg)
	if err != nil {
		return fmt.Errorf("failed to setup environment: %w", err)
	}
	defer env.Close(ctx)

	if env.Database() == nil {
		return fmt.Errorf("missing database connection in env variables")
	}

	if len(cfg.EncryptionManger.AAD) == 0 {
		return fmt.Errorf("encryption AAD must be provided via ENCRYPTION_AAD environment variable")
	}
	emConfig := &encryption.Config{
		Database:     env.Database(),
		KeyManager:   env.KeyManager(),
		WrapperKeyID: cfg.EncryptionManger.WrapperKeyID,
		CacheTTL:     cfg.EncryptionManger.CacheTTL,
		AAD:          cfg.EncryptionManger.AAD,
	}
	em := encryption.New(emConfig)

	lac := ledgeraccount.New(env.Database(), em)
	tm := transaction.New(env.Database(), em)
	agg := aggregation.New(env.Database(), em)

	_, _, _ = lac, tm, agg

	logging.Info(ctx, "CLI tool is set up and ready to use")

	result, err := agg.GetPeriodAggregation(ctx, "2025-12-01", "2025-12-31")
	if err != nil {
		return err
	}

	logging.Info(ctx, "Period aggregation result", slog.Any("result", result))

	return nil
}
