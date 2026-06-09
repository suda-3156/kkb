// Package main provides a one-shot bootstrap for self-hosted / non-managed
// deployments: it creates the encryption wrapper key on the configured
// (FILESYSTEM) key manager so the API can start. Unlike the seed tool, it does
// NOT touch the database or insert any sample data. Safe to leave wired as a
// one-shot init service: it is idempotent and skips creation if a key version
// already exists.
package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"

	"github.com/suda-3156/kkb/go/internal/infrastructure/keys"
	"github.com/suda-3156/kkb/go/internal/logging"
	"github.com/suda-3156/kkb/go/internal/setup"
)

const (
	keyGroup = "system"
	keyName  = "ledger-encryption-key"
)

var _ setup.KeyManagerConfigProvider = (*Config)(nil)

// Config only wires the key manager; no database or secret manager is needed
// to create the wrapper key.
type Config struct {
	KeyManager keys.Config
}

func (c *Config) KeyManagerConfig() *keys.Config {
	return &c.KeyManager
}

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	logging.SetDefault(logging.NewFromEnv())

	logging.Notice(ctx, "starting encryption key bootstrap")

	if err := run(ctx); err != nil {
		logging.Error(ctx, "bootstrap failed", slog.Any("error", err))
		os.Exit(1)
	}

	logging.Notice(ctx, "bootstrap completed successfully")
}

func run(ctx context.Context) error {
	var cfg Config
	env, err := setup.Setup(ctx, &cfg)
	if err != nil {
		return fmt.Errorf("setup.Setup: %w", err)
	}
	defer env.Close(ctx)

	root := cfg.KeyManager.FilesystemRoot
	if root == "" {
		return fmt.Errorf("KEY_FILESYSTEM_ROOT must be set")
	}

	// Idempotency: if the wrapper key already has at least one version, skip.
	keyDir := filepath.Join(root, keyGroup, keyName)
	if hasKeyVersion(keyDir) {
		logging.Notice(ctx, "wrapper key already exists; skipping",
			slog.String("key", filepath.Join(keyGroup, keyName)))
		return nil
	}

	return createEncryptionKey(ctx, &cfg.KeyManager)
}

// hasKeyVersion reports whether keyDir contains a key version file
// (any entry other than the "metadata" file).
func hasKeyVersion(keyDir string) bool {
	entries, err := os.ReadDir(keyDir)
	if err != nil {
		return false
	}
	for _, e := range entries {
		if e.Name() != "metadata" {
			return true
		}
	}
	return false
}

// createEncryptionKey mirrors go/tools/seed/main.go's helper: it creates the
// encryption wrapper key and an initial version on the FILESYSTEM key manager.
func createEncryptionKey(ctx context.Context, cfg *keys.Config) error {
	kms, err := keys.NewFilesystem(ctx, cfg)
	if err != nil {
		return err
	}

	kmst, ok := kms.(keys.EncryptionKeyManager)
	if !ok {
		return fmt.Errorf("key manager is not an EncryptionKeyManager: %T", kms)
	}

	keyID, err := kmst.CreateEncryptionKey(ctx, keyGroup, keyName)
	if err != nil {
		return fmt.Errorf("create encryption key: %w", err)
	}

	if _, err := kmst.CreateKeyVersion(ctx, keyID); err != nil {
		return fmt.Errorf("create key version: %w", err)
	}

	logging.Notice(ctx, "wrapper key created", slog.String("key_id", keyID))
	return nil
}
