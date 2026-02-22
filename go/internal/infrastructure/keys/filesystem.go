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
	"io/fs"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
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
	mu   sync.Mutex
}

func NewFilesystem(ctx context.Context, cfg *Config) (KeyManager, error) {
	root := cfg.FilesystemRoot
	if root != "" {
		if err := os.MkdirAll(root, 0o700); err != nil {
			return nil, err
		}
	}

	return &Filesystem{
		root: root,
	}, nil
}

func (k *Filesystem) Encrypt(ctx context.Context, KeyID string, plaintext, aad []byte) ([]byte, error) {
	k.mu.Lock()
	defer k.mu.Unlock()

	pth := filepath.Join(k.root, KeyID)
	infos, err := os.ReadDir(pth)
	if err != nil {
		return nil, fmt.Errorf("failed to list keys: %w", err)
	}
	if len(infos) < 1 {
		return nil, fmt.Errorf("no key versions found in %s", pth)
	}

	var latest fs.DirEntry
	for _, info := range infos {
		if info.Name() == "metadata" {
			continue
		}
		if latest == nil || info.Name() > latest.Name() {
			latest = info
		}
	}
	if latest == nil {
		return nil, fmt.Errorf("key %s has no versions", KeyID)
	}

	latestPath := filepath.Join(pth, latest.Name())
	dek, err := os.ReadFile(latestPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read key: %w", err)
	}

	block, err := aes.NewCipher(dek)
	if err != nil {
		return nil, fmt.Errorf("bad cipher block: %w", err)
	}
	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to read wrap cipher block: %w", err)
	}
	nonce := make([]byte, aesgcm.NonceSize())
	ciphertext := aesgcm.Seal(nonce, nonce, plaintext, aad)

	// Append the keyID to the ciphertext so we know which key was used for encryption when decrypting.
	id := []byte(latest.Name() + ":")
	ciphertext = append(id, ciphertext...)

	return ciphertext, nil
}

func (k *Filesystem) Decrypt(ctx context.Context, keyID string, ciphertext, aad []byte) ([]byte, error) {
	k.mu.Lock()
	defer k.mu.Unlock()

	parts := bytes.SplitN(ciphertext, []byte(":"), 2)
	if len(parts) < 2 {
		return nil, fmt.Errorf("invalid ciphertext: missing version")
	}
	version, ciphertext := parts[0], parts[1]

	versionPath := filepath.Join(k.root, keyID, string(version))
	dek, err := os.ReadFile(versionPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read key: %w", err)
	}

	block, err := aes.NewCipher(dek)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher from dek: %w", err)
	}
	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create gcm cipher from dek: %w", err)
	}
	nonceSize := aesgcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return nil, fmt.Errorf("malformed ciphertext")
	}
	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]

	plaintext, err := aesgcm.Open(nil, nonce, ciphertext, aad)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt ciphertext with dek: %w", err)
	}

	return plaintext, nil
}

func (k *Filesystem) CreateEncryptionKey(ctx context.Context, parent, name string) (string, error) {
	k.mu.Lock()
	defer k.mu.Unlock()

	pth := filepath.Join(k.root, parent)
	if err := os.MkdirAll(pth, 0o700); err != nil {
		return "", fmt.Errorf("failed to create key directory: %w", err)
	}

	metadataPath := filepath.Join(pth, "metadata")
	b, err := os.ReadFile(metadataPath)
	if err != nil && !os.IsNotExist(err) {
		return "", fmt.Errorf("failed to read metadata: %w", err)
	}
	if len(b) > 0 {
		var metadata filesystemKeyInfo
		if err := json.Unmarshal(b, &metadata); err != nil {
			return "", fmt.Errorf("failed to parse metadata: %w", err)
		}
		if metadata.KeyType != "encryption" {
			return "", fmt.Errorf("found key, but is not encryption type")
		}

		return strings.TrimPrefix(pth, k.root), nil
	}

	// Create a metadata file
	metadata := &filesystemKeyInfo{KeyType: "encryption"}
	b, err = json.Marshal(metadata)
	if err != nil {
		return "", fmt.Errorf("failed to generate metadata: %w", err)
	}
	if err := os.WriteFile(metadataPath, b, 0o600); err != nil {
		return "", fmt.Errorf("failed to create metadata file: %w", err)
	}

	return strings.TrimPrefix(pth, k.root), nil
}

func (k *Filesystem) CreateKeyVersion(_ context.Context, parent string) (string, error) {
	k.mu.Lock()
	defer k.mu.Unlock()

	metadata, err := k.metadataForKey(parent)
	if err != nil {
		return "", fmt.Errorf("failed to get metadata for key %s: %w", parent, err)
	}

	switch t := metadata.KeyType; t {
	case "encryption":
		ek := make([]byte, 32)
		if _, err := io.ReadFull(rand.Reader, ek); err != nil {
			return "", fmt.Errorf("failed to generate encryption key: %w", err)
		}

		version := strconv.FormatInt(time.Now().UnixNano(), 10)
		versionPath := filepath.Join(k.root, parent, version)
		if err := os.WriteFile(versionPath, ek, 0o600); err != nil {
			return "", fmt.Errorf("failed to write encryption key version to disk: %w", err)
		}
		return strings.TrimPrefix(versionPath, k.root), nil
	default:
		return "", fmt.Errorf("unsupported key type: %s", t)
	}
}

func (k *Filesystem) DestroyKeyVersion(_ context.Context, id string) error {
	k.mu.Lock()
	defer k.mu.Unlock()

	versionPath := filepath.Join(k.root, id)
	if err := os.Remove(versionPath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to destroy key version: %w", err)
	}
	return nil
}

type filesystemKeyInfo struct {
	KeyType string `json:"t"`
}

func (k *Filesystem) metadataForKey(parent string) (*filesystemKeyInfo, error) {
	metadataPath := filepath.Join(k.root, parent, "metadata")
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
