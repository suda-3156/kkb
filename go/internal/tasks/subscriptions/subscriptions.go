// Package subscriptions is the daily subscription-materialization task.
//
// A task package is the environment boundary: it declares exactly what its
// task needs (the Config below, checked at compile time through the setup
// provider interfaces) and initializes those dependencies inside Run. The
// domain logic stays in internal/subscription. A future task with a smaller
// footprint declares a smaller Config of its own instead of sharing this one.
package subscriptions

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"github.com/suda-3156/kkb/go/internal/date"
	"github.com/suda-3156/kkb/go/internal/encryption"
	"github.com/suda-3156/kkb/go/internal/infrastructure/database"
	"github.com/suda-3156/kkb/go/internal/infrastructure/keys"
	"github.com/suda-3156/kkb/go/internal/infrastructure/secrets"
	"github.com/suda-3156/kkb/go/internal/logging"
	"github.com/suda-3156/kkb/go/internal/setup"
	"github.com/suda-3156/kkb/go/internal/subscription"
	"github.com/suda-3156/kkb/go/internal/transaction"
)

// Name is the registry key; -tasks selects it.
const Name = "subscriptions"

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

// Run owns its dependencies' whole lifecycle: environment processing,
// connection, and teardown all happen here, per invocation.
func Run(ctx context.Context) error {
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

	return MaterializeDue(ctx, sm, subscription.TodayJST())
}

// MaterializeDue is one sweep over every due subscription. The domain half
// (finding due subscriptions, advancing one safely) lives on the manager;
// this holds the run policy: one subscription's failure (an archived account
// in its template, say) is logged and does not stop the others, but if any
// failed the sweep fails as a whole, so the job execution is reported failed
// and monitoring can see it.
//
// Exported apart from Run so the integration tests can drive it with an
// injected manager.
func MaterializeDue(ctx context.Context, sm *subscription.SubscriptionManager, today date.Date) error {
	ids, err := sm.DueSubscriptionIDs(ctx, today)
	if err != nil {
		return fmt.Errorf("materialize due: %w", err)
	}

	logging.Info(
		ctx,
		"subscriptions task - starting",
		slog.String("today", today.String()),
		slog.Int("due_count", len(ids)),
	)

	var failures []error
	for _, id := range ids {
		if err := sm.MaterializeOne(ctx, id, today); err != nil {
			logging.Error(
				ctx,
				"subscriptions task - subscription failed",
				slog.Int("subscription_id", id),
				slog.Any("error", err),
			)
			failures = append(failures, fmt.Errorf("subscription id=%d: %w", id, err))
		}
	}

	logging.Info(
		ctx,
		"subscriptions task - finished",
		slog.Int("due_count", len(ids)),
		slog.Int("failed_count", len(failures)),
	)

	if len(failures) > 0 {
		return fmt.Errorf("materialize due: %d of %d subscriptions failed: %w",
			len(failures), len(ids), errors.Join(failures...))
	}
	return nil
}
