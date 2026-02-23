// This package is for seeding initial data in local development.
package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/suda-3156/kkb/go/internal/infrastructure/keys"
	"github.com/suda-3156/kkb/go/internal/setup"
)

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
	var cfg keys.Config
	env, err := setup.Setup(ctx, &cfg)
	if err != nil {
		return fmt.Errorf("failed to setup environment: %w", err)
	}
	defer env.Close()

	// Create an encryption key.
	if err := createEncryptionKey(ctx, &cfg); err != nil {
		return err
	}

	return nil
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
