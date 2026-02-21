package keys

import (
	"bytes"
	"context"
	"crypto/aes"
	"crypto/cipher"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sync"
)

func init() {
	RegisterManager("FILESYSTEM", NewFilesystem)
}

var (
	_ KeyManager = (*Filesystem)(nil)
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

func (k *Filesystem) Encrypt(ctx context.Context, KeyID string, plaintext []byte) ([]byte, error) {
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
	ciphertext := aesgcm.Seal(nonce, nonce, plaintext, nil)

	// Append the keyID to the ciphertext so we know which key was used for encryption when decrypting.
	id := []byte(latest.Name() + ":")
	ciphertext = append(id, ciphertext...)

	return ciphertext, nil
}

func (k *Filesystem) Decrypt(ctx context.Context, keyID string, ciphertext []byte) ([]byte, error) {
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

	plaintext, err := aesgcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt ciphertext with dek: %w", err)
	}

	return plaintext, nil
}
