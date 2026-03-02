package secrets

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sync"

	"github.com/suda-3156/kkb/go/internal/logging"
)

func init() {
	RegisterManager("FILESYSTEM", NewFilesystem)
}

var _ SecretManager = (*Filesystem)(nil)

type Filesystem struct {
	root string

	// To protect concurrent access to the filesystem
	mu sync.Mutex
}

// NewFilesystem creates a new filesystem-based secret manager.
func NewFilesystem(ctx context.Context, cfg *Config) (SecretManager, error) {
	logging.Debug(ctx, "initializing FILESYSTEM secret manager", slog.String("root", cfg.FilesystemRoot))

	root := cfg.FilesystemRoot
	if root != "" {
		if err := os.MkdirAll(root, 0o700); err != nil {
			return nil, fmt.Errorf("failed to create root directory: %w", err)
		}
	}

	logging.Debug(ctx, "FILESYSTEM secret manager initialized successfully")

	return &Filesystem{
		root: root,
	}, nil
}

// GetSecretValue returns the secret if it exists, otherwise an error.
func (sm *Filesystem) GetSecretValue(ctx context.Context, name string) (string, error) {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	logging.Debug(ctx, fmt.Sprintf("reading secret from filesystem: %s", name))

	pth := filepath.Join(sm.root, name)
	b, err := os.ReadFile(pth)
	if err != nil {
		return "", fmt.Errorf("failed to read file: %w", err)
	}
	return string(b), nil
}
