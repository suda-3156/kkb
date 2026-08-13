// The daily periodic job, run as a Cloud Run Job by Cloud Scheduler (JST
// 01:00). It holds a task registry; -tasks selects a subset so that tasks can
// later move to their own schedule by adding another Cloud Run Job resource
// over the same image.
package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"github.com/suda-3156/kkb/go/internal/encryption"
	"github.com/suda-3156/kkb/go/internal/infrastructure/database"
	"github.com/suda-3156/kkb/go/internal/infrastructure/keys"
	"github.com/suda-3156/kkb/go/internal/infrastructure/secrets"
	"github.com/suda-3156/kkb/go/internal/job"
	"github.com/suda-3156/kkb/go/internal/logging"
	"github.com/suda-3156/kkb/go/internal/setup"
	"github.com/suda-3156/kkb/go/internal/subscription"
	"github.com/suda-3156/kkb/go/internal/transaction"
)

var tasksFlag = flag.String("tasks", "", "comma-separated task names to run (default: all)")

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

func main() {
	flag.Parse()

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer func() {
		stop()
		if r := recover(); r != nil {
			logging.Critical(ctx, "job panicked", slog.Any("error", r))
		}
	}()

	logging.SetDefault(logging.NewFromEnv())

	err := run(ctx)
	stop()

	if err != nil {
		logging.Critical(ctx, "job error", slog.Any("error", err))
		//nolint:gocritic // A non-zero exit is what marks the execution failed.
		os.Exit(1)
	}

	logging.Info(ctx, "job finished successfully")
}

func run(ctx context.Context) error {
	var cfg Config
	env, err := setup.Setup(ctx, &cfg)
	if err != nil {
		return fmt.Errorf("setup.Setup: %w", err)
	}
	defer env.Close(ctx)

	if env.Database() == nil {
		return fmt.Errorf("missing database connection in env variables")
	}

	if len(cfg.EncryptionManger.AAD) == 0 {
		return fmt.Errorf("encryption AAD must be provided via ENCRYPTION_AAD environment variable")
	}
	em := encryption.New(&encryption.Config{
		Database:     env.Database(),
		KeyManager:   env.KeyManager(),
		WrapperKeyID: cfg.EncryptionManger.WrapperKeyID,
		CacheTTL:     cfg.EncryptionManger.CacheTTL,
		AAD:          cfg.EncryptionManger.AAD,
	})

	tm := transaction.New(env.Database(), em)
	sm := subscription.New(env.Database(), em, tm)

	runner := job.NewRunner(
		job.Task{
			Name: "subscriptions",
			Run: func(ctx context.Context) error {
				return sm.MaterializeDue(ctx, subscription.TodayJST())
			},
		},
	)

	var selection []string
	if *tasksFlag != "" {
		selection = strings.Split(*tasksFlag, ",")
	}

	return runner.Run(ctx, selection)
}
