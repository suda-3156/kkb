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

	slog.InfoContext(ctx, "Starting seed process")

	err := run(ctx)
	done()

	if err != nil {
		slog.ErrorContext(ctx, "Seed process failed", "error", err)
		os.Exit(1)
	}

	slog.InfoContext(ctx, "Seed process completed successfully")
}

func run(ctx context.Context) error {
	var config keys.Config
	env, err := setup.Setup(ctx, &config)
	if err != nil {
		return fmt.Errorf("failed to setup environment: %w", err)
	}
	defer env.Close()

	// Create encryption keys.
	if err := createEncryptionKey(ctx, &config, "ledger-encryption-key"); err != nil {
		return err
	}

	return nil
}

func createEncryptionKey(ctx context.Context, config *keys.Config, name string) error {
	kms, err := keys.NewFilesystem(ctx, config)
	if err != nil {
		return err
	}

	kmst, ok := kms.(keys.EncryptionKeyManager)
	if !ok {
		return fmt.Errorf("not EncryptionKeyManager, %T", kms)
	}

	parent, err := kmst.CreateEncryptionKey(ctx, "system", name)
	if err != nil {
		return err
	}
	if _, err := kmst.CreateKeyVersion(ctx, parent); err != nil {
		return err
	}

	return nil
}
