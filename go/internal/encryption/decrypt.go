package encryption

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"fmt"
)

func (em *EncryptionManager) Decrypt(
	ctx context.Context,
	ciphertext []byte,
	keyID int,
) (string, error) {
	// Input validation
	if len(ciphertext) == 0 {
		return "", fmt.Errorf("ciphertext cannot be empty")
	}

	// Check cache first
	if err := em.maybeRefresh(ctx); err != nil {
		return "", fmt.Errorf("decrypt: refresh cache: %w", err)
	}

	// Get the key for decryption
	var dek []byte
	{
		em.mu.RLock()
		defer em.mu.RUnlock()
		key, ok := em.allowed[keyID]
		if !ok {
			return "", fmt.Errorf("key ID %d not found", keyID)
		}
		dek = key.DEK
	}

	if len(dek) != 16 && len(dek) != 24 && len(dek) != 32 {
		return "", fmt.Errorf("key length must be 16, 24, or 32 bytes, got %d", len(dek))
	}

	// Decrypt
	block, err := aes.NewCipher(dek)
	if err != nil {
		return "", fmt.Errorf("decrypt: create cipher: %w", err)
	}

	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("decrypt: create GCM: %w", err)
	}

	if len(ciphertext) < aesgcm.NonceSize() {
		return "", fmt.Errorf("ciphertext too short")
	}

	nonce, ciphertext := ciphertext[:aesgcm.NonceSize()], ciphertext[aesgcm.NonceSize():]

	plaintext, err := aesgcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", fmt.Errorf("decrypt: aes-gcm open: %w", err)
	}

	return string(plaintext), nil
}
