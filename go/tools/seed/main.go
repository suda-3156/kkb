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
	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/encryption"
	"github.com/suda-3156/kkb/go/internal/infrastructure/database"
	"github.com/suda-3156/kkb/go/internal/infrastructure/keys"
	ledgeraccount "github.com/suda-3156/kkb/go/internal/ledger_account"
	"github.com/suda-3156/kkb/go/internal/logging"
	"github.com/suda-3156/kkb/go/internal/pulid"
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

	logging.Info(ctx, "Starting seed process for local development")

	err := run(ctx)
	done()

	if err != nil {
		logging.Error(ctx, "Seed process failed", "error", err)
		os.Exit(1)
	}

	logging.Info(ctx, "Seed process completed successfully")
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
	if err := insertSampleData(ctx, lac); err != nil {
		return err
	}

	return nil
}

func create(
	ctx context.Context, lac *ledgeraccount.LedgerAccountManager, name string, kind graph.LedgerAccountKind, isGroup bool, parentID *pulid.ID,
) (*graph.LedgerAccount, error) {
	a, err := lac.Create(ctx, graph.CreateLedgerAccountInput{
		Name:     name,
		Kind:     kind,
		IsGroup:  isGroup,
		ParentID: parentID,
	})
	if err != nil {
		return nil, fmt.Errorf("create %q: %w", name, err)
	}
	logging.Info(ctx, "created ledger account", "name", name, "id", a.ID)
	return a, nil
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

	keyID, err := kmst.CreateEncryptionKey(ctx, "system", "ledger-encryption-key")
	if err != nil {
		return err
	}

	if _, err := kmst.CreateKeyVersion(ctx, keyID); err != nil {
		return err
	}

	return nil
}

/*
資産 (ASSET, グループ)

	└─ 流動資産 (グループ)
	     ├─ 現金 / 普通預金 / 定期預金
	└─ 固定資産 (グループ)
	     ├─ 不動産 / 有価証券

負債 (LIABILITY, グループ)

	└─ クレジットカード / 住宅ローン / その他ローン

費用 (EXPENSE, グループ)

	└─ 生活費 (グループ)
	     ├─ 食費 / 水道光熱費 / 通信費 / 日用品
	└─ その他費用 (グループ)
	     ├─ 交通費 / 娯楽費 / 医療費 / 教育費

収益 (REVENUE, グループ)

	└─ 給与 / 賞与 / 副収入 / 利息収入

純資産 (EQUITY, グループ)

	└─ 元入金 / 繰越利益剰余金
*/
func insertSampleData(ctx context.Context, lac *ledgeraccount.LedgerAccountManager) error {
	type entry struct {
		name    string
		kind    graph.LedgerAccountKind
		isGroup bool
		parent  *graph.LedgerAccount
	}

	// --- 資産 (ASSET) ---
	assetGroup, err := create(ctx, lac, "資産", graph.LedgerAccountKindAsset, true, nil)
	if err != nil {
		return err
	}
	currentAssets, err := create(ctx, lac, "流動資産", graph.LedgerAccountKindAsset, true, &assetGroup.ID)
	if err != nil {
		return err
	}
	for _, name := range []string{"現金", "普通預金", "定期預金"} {
		if _, err := create(ctx, lac, name, graph.LedgerAccountKindAsset, false, &currentAssets.ID); err != nil {
			return err
		}
	}
	fixedAssets, err := create(ctx, lac, "固定資産", graph.LedgerAccountKindAsset, true, &assetGroup.ID)
	if err != nil {
		return err
	}
	for _, name := range []string{"不動産", "有価証券"} {
		if _, err := create(ctx, lac, name, graph.LedgerAccountKindAsset, false, &fixedAssets.ID); err != nil {
			return err
		}
	}

	// --- 負債 (LIABILITY) ---
	liabGroup, err := create(ctx, lac, "負債", graph.LedgerAccountKindLiability, true, nil)
	if err != nil {
		return err
	}
	for _, name := range []string{"クレジットカード", "住宅ローン", "その他ローン"} {
		if _, err := create(ctx, lac, name, graph.LedgerAccountKindLiability, false, &liabGroup.ID); err != nil {
			return err
		}
	}

	// --- 費用 (EXPENSE) ---
	expGroup, err := create(ctx, lac, "費用", graph.LedgerAccountKindExpense, true, nil)
	if err != nil {
		return err
	}
	livingExp, err := create(ctx, lac, "生活費", graph.LedgerAccountKindExpense, true, &expGroup.ID)
	if err != nil {
		return err
	}
	for _, name := range []string{"食費", "水道光熱費", "通信費", "日用品"} {
		if _, err := create(ctx, lac, name, graph.LedgerAccountKindExpense, false, &livingExp.ID); err != nil {
			return err
		}
	}
	otherExp, err := create(ctx, lac, "その他費用", graph.LedgerAccountKindExpense, true, &expGroup.ID)
	if err != nil {
		return err
	}
	for _, name := range []string{"交通費", "娯楽費", "医療費", "教育費"} {
		if _, err := create(ctx, lac, name, graph.LedgerAccountKindExpense, false, &otherExp.ID); err != nil {
			return err
		}
	}

	// --- 収益 (REVENUE) ---
	revGroup, err := create(ctx, lac, "収益", graph.LedgerAccountKindRevenue, true, nil)
	if err != nil {
		return err
	}
	for _, name := range []string{"給与", "賞与", "副収入", "利息収入"} {
		if _, err := create(ctx, lac, name, graph.LedgerAccountKindRevenue, false, &revGroup.ID); err != nil {
			return err
		}
	}

	// --- 純資産 (EQUITY) ---
	eqGroup, err := create(ctx, lac, "純資産", graph.LedgerAccountKindEquity, true, nil)
	if err != nil {
		return err
	}
	for _, name := range []string{"元入金", "繰越利益剰余金"} {
		if _, err := create(ctx, lac, name, graph.LedgerAccountKindEquity, false, &eqGroup.ID); err != nil {
			return err
		}
	}

	_ = liabGroup
	_ = revGroup
	_ = eqGroup

	// transaction with journal entries
	// todo later

	return nil
}
