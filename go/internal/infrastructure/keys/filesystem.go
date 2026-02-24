package keys

import (
	"bytes"
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/suda-3156/kkb/go/internal/logging"
)

func init() {
	RegisterManager("FILESYSTEM", NewFilesystem)
}

var (
	_ EncryptionKeyManager = (*Filesystem)(nil)
	_ KeyManager           = (*Filesystem)(nil)
)

type Filesystem struct {
	root string

	// To protect concurrent access to the filesystem
	mu sync.Mutex
}

func NewFilesystem(ctx context.Context, cfg *Config) (KeyManager, error) {
	logging.Debug(ctx, "initializing FILESYSTEM key manager", slog.String("root", cfg.FilesystemRoot))

	root := cfg.FilesystemRoot
	if root == "" {
		return nil, fmt.Errorf("filesystem root path is required for FILESYSTEM key manager")
	}

	if root != "" {
		if err := os.MkdirAll(root, 0o700); err != nil {
			return nil, err
		}
	}

	logging.Debug(ctx, "FILESYSTEM key manager initialized successfully")

	return &Filesystem{
		root: root,
	}, nil
}

func (k *Filesystem) Encrypt(ctx context.Context, KeyID string, plaintext, aad []byte) ([]byte, error) {
	k.mu.Lock()
	defer k.mu.Unlock()

	path := filepath.Join(k.root, KeyID)
	entries, err := os.ReadDir(path)
	if err != nil {
		return nil, fmt.Errorf("failed to list keys: %w", err)
	}
	if len(entries) < 1 {
		return nil, fmt.Errorf("no key versions found in %s", path)
	}

	// Find the latest version
	var latest os.DirEntry
	for _, entry := range entries {
		if entry.Name() == "metadata" {
			// metadata file is not a key version, skip it
			continue
		}
		if latest == nil || entry.Name() > latest.Name() {
			latest = entry
		}
	}
	if latest == nil {
		return nil, fmt.Errorf("key %s has no versions", KeyID)
	}

	latestPath := filepath.Join(path, latest.Name())
	key, err := os.ReadFile(latestPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read key: %w", err)
	}

	// Encrypt the plaintext
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("bad cipher block: %w", err)
	}

	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to read wrap cipher block: %w", err)
	}

	nonce := make([]byte, aesgcm.NonceSize())
	ciphertext := aesgcm.Seal(nonce, nonce, plaintext, aad)

	// Prepend the key version to the ciphertext so we know which key to use for decryption.
	id := []byte(latest.Name() + ":")
	ciphertext = append(id, ciphertext...)

	return ciphertext, nil
}

func (k *Filesystem) Decrypt(ctx context.Context, keyID string, ciphertext, aad []byte) ([]byte, error) {
	k.mu.Lock()
	defer k.mu.Unlock()

	// The ciphertext is expected to be in the format "version:ciphertext".
	parts := bytes.SplitN(ciphertext, []byte(":"), 2)
	if len(parts) < 2 {
		return nil, fmt.Errorf("invalid ciphertext: missing version")
	}
	version, ciphertext := parts[0], parts[1]

	versionPath := filepath.Join(k.root, keyID, string(version))
	key, err := os.ReadFile(versionPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read key: %w", err)
	}

	// Decrypt the ciphertext
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher from key: %w", err)
	}

	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create gcm cipher from key: %w", err)
	}

	nonceSize := aesgcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return nil, fmt.Errorf("malformed ciphertext")
	}

	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]

	plaintext, err := aesgcm.Open(nil, nonce, ciphertext, aad)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt ciphertext with key: %w", err)
	}

	return plaintext, nil
}

func (k *Filesystem) CreateEncryptionKey(ctx context.Context, group, name string) (string, error) {
	k.mu.Lock()
	defer k.mu.Unlock()

	path := filepath.Join(k.root, group, name)
	if err := os.MkdirAll(path, 0o700); err != nil {
		return "", fmt.Errorf("failed to create key directory: %w", err)
	}

	metadataPath := filepath.Join(path, "metadata")
	b, err := os.ReadFile(metadataPath)
	if err != nil && !os.IsNotExist(err) {
		return "", fmt.Errorf("failed to read metadata: %w", err)
	}
	if len(b) > 0 {
		// Metadata file exists.
		var metadata filesystemKeyInfo
		if err := json.Unmarshal(b, &metadata); err != nil {
			return "", fmt.Errorf("failed to parse metadata: %w", err)
		}
		if metadata.KeyType != "encryption" {
			return "", fmt.Errorf("found key, but is not encryption type")
		}

		return strings.TrimPrefix(path, k.root), nil
	}

	// At this point, the key doesn't exist. i.e. the metadata file doesn't exist.
	// Create a new key
	metadata := &filesystemKeyInfo{KeyType: "encryption"}
	b, err = json.Marshal(metadata)
	if err != nil {
		return "", fmt.Errorf("failed to generate metadata: %w", err)
	}
	if err := os.WriteFile(metadataPath, b, 0o600); err != nil {
		return "", fmt.Errorf("failed to create metadata file: %w", err)
	}

	return strings.TrimPrefix(path, k.root), nil
}

func (k *Filesystem) CreateKeyVersion(_ context.Context, keyID string) (string, error) {
	k.mu.Lock()
	defer k.mu.Unlock()

	metadata, err := k.readMetadata(keyID)
	if err != nil {
		return "", fmt.Errorf("failed to get metadata for key %s: %w", keyID, err)
	}

	switch t := metadata.KeyType; t {
	case "encryption":
		// Generate new 32-byte key.
		ek := make([]byte, 32)
		if _, err := io.ReadFull(rand.Reader, ek); err != nil {
			return "", fmt.Errorf("failed to generate encryption key: %w", err)
		}

		version := strconv.FormatInt(time.Now().UnixNano(), 10)
		versionPath := filepath.Join(k.root, keyID, version)
		if err := os.WriteFile(versionPath, ek, 0o600); err != nil {
			return "", fmt.Errorf("failed to write encryption key version to disk: %w", err)
		}

		return strings.TrimPrefix(versionPath, k.root), nil
	default:
		return "", fmt.Errorf("unsupported key type: %s", t)
	}
}

func (k *Filesystem) DestroyKeyVersion(_ context.Context, keyVersionID string) error {
	k.mu.Lock()
	defer k.mu.Unlock()

	versionPath := filepath.Join(k.root, keyVersionID)
	if err := os.Remove(versionPath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to destroy key version: %w", err)
	}

	return nil
}

type filesystemKeyInfo struct {
	KeyType string `json:"key_type"`
}

func (k *Filesystem) readMetadata(keyID string) (*filesystemKeyInfo, error) {
	metadataPath := filepath.Join(k.root, keyID, "metadata")
	b, err := os.ReadFile(metadataPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open metadata (does the key exist?): %w", err)
	}

	var metadata filesystemKeyInfo
	if err := json.Unmarshal(b, &metadata); err != nil {
		return nil, fmt.Errorf("failed to parse metadata: %w", err)
	}
	return &metadata, nil
}
