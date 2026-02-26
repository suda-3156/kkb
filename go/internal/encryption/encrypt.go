package encryption

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"fmt"
	"io"
)

type EncryptionPayload struct {
	Ciphertext []byte
	KeyID      int
}

func (em *EncryptionManager) Encrypt(
	ctx context.Context,
	plaintext string,
) (*EncryptionPayload, error) {
	// Input validation
	if plaintext == "" {
		return nil, fmt.Errorf("plaintext cannot be empty")
	}

	// Check cache first
	if err := em.maybeRefresh(ctx); err != nil {
		return nil, fmt.Errorf("encrypt: refresh cache: %w", err)
	}

	// Get the effective key for encryption
	var dek []byte
	var kid int
	{ //nolint:gocritic // Avoid locking for the entire encryption process
		em.mu.RLock()
		dek = em.effective.DEK
		kid = em.effective.ID
		em.mu.RUnlock()
	}

	if len(dek) != 16 && len(dek) != 24 && len(dek) != 32 {
		return nil, fmt.Errorf("key length must be 16, 24, or 32 bytes, got %d", len(dek))
	}

	// Encrypt
	block, err := aes.NewCipher(dek)
	if err != nil {
		return nil, fmt.Errorf("encrypt: create cipher: %w", err)
	}

	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("encrypt: create GCM: %w", err)
	}

	nonce := make([]byte, aesgcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, fmt.Errorf("encrypt: generate nonce: %w", err)
	}

	ciphertext := aesgcm.Seal(nonce, nonce, []byte(plaintext), nil)

	return &EncryptionPayload{
		Ciphertext: ciphertext,
		KeyID:      kid,
	}, nil
}
