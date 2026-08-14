// This package is for seeding initial data in local development.
package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/suda-3156/kkb/go/ent"
	entmigrate "github.com/suda-3156/kkb/go/ent/migrate"
	"github.com/suda-3156/kkb/go/internal/encryption"
	"github.com/suda-3156/kkb/go/internal/infrastructure/database"
	"github.com/suda-3156/kkb/go/internal/infrastructure/keys"
	"github.com/suda-3156/kkb/go/internal/infrastructure/secrets"
	ledgeraccount "github.com/suda-3156/kkb/go/internal/ledger_account"
	"github.com/suda-3156/kkb/go/internal/logging"
	"github.com/suda-3156/kkb/go/internal/setup"
	"github.com/suda-3156/kkb/go/internal/subscription"
	transaction "github.com/suda-3156/kkb/go/internal/transaction"
)

const (
	// The app resolves ENCRYPTION_KMS_KEY_ID as "<group>/<name>", so these two
	// together have to spell the configured key id.
	wrapperKeyGroup = "system"
	wrapperKeyName  = "ledger-encryption-key"

	// Relative to the go module root, which is where this tool is run from.
	ledgerAccountsSeedPath = "tools/seed/data/ledger_accounts.json"
	transactionsSeedPath   = "tools/seed/data/transactions.json"
	subscriptionsSeedPath  = "tools/seed/data/subscriptions.json"
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
	ctx, done := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer done()

	logging.SetDefault(logging.NewFromEnv())

	logging.Notice(ctx, "Starting seed process for local DEVELOPMENT environment")

	err := run(ctx)
	done()

	if err != nil {
		logging.Error(ctx, "Seed process failed", "error", err)
		os.Exit(1)
	}

	logging.Notice(ctx, "Seed process completed successfully")
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

	// Apply database migrations.
	migrate(ctx, env.Database().Client)

	// Create an encryption key.
	if err := createEncryptionKey(ctx, &cfg.KeyManager); err != nil {
		return err
	}

	logging.Debug(ctx, "initializing encryption manager")

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

	logging.Debug(ctx, "encryption manager initialized successfully")

	// Insert sample data.
	lac := ledgeraccount.New(env.Database(), em)
	tm := transaction.New(env.Database(), em)
	sm := subscription.New(env.Database(), em, tm)
	err = insertData(ctx, env.Database().Client, em, lac, tm, sm)
	if err != nil {
		return err
	}

	return nil
}

func migrate(ctx context.Context, client *ent.Client) {
	logging.Warning(ctx, "Auto-migrating database schema in local environment...")
	err := client.Debug().Schema.Create(
		ctx,
		entmigrate.WithDropIndex(true),
		entmigrate.WithDropColumn(true),
	)
	if err != nil {
		logging.Error(ctx, "Failed to migrate schema", "reason", err.Error())
	}
	logging.Info(ctx, "Database schema migrated successfully.")
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

	keyID, err := kmst.CreateEncryptionKey(ctx, wrapperKeyGroup, wrapperKeyName)
	if err != nil {
		return err
	}

	if _, err := kmst.CreateKeyVersion(ctx, keyID); err != nil {
		return err
	}

	return nil
}

func insertData(
	ctx context.Context,
	client *ent.Client,
	em *encryption.EncryptionManager,
	lac *ledgeraccount.LedgerAccountManager,
	tm *transaction.TransactionManager,
	sm *subscription.SubscriptionManager,
) error {
	accountMap, err := insertLedgerAccounts(ctx, lac)
	if err != nil {
		return fmt.Errorf("insertData: insert ledger accounts: %w", err)
	}

	if err := insertTransactions(ctx, tm, accountMap); err != nil {
		return fmt.Errorf("insertData: insert transactions: %w", err)
	}

	if err := insertSubscriptions(ctx, client, em, sm, accountMap); err != nil {
		return fmt.Errorf("insertData: insert subscriptions: %w", err)
	}

	return nil
}
