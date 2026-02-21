/*
 * In the future, we will use the Cloud KMS to manage the DEK (Data Encryption Key).
 * For now, we use a key stored in the configuration file as DEK,
 * and implement the local encryption and decryption logic.
 *
 * Refs:
 * - https://github.com/suda-3156/aes-go/blob/main/gcm/gcm.go
 */
package kms

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"fmt"
	"io"

	"github.com/suda-3156/kkb/go/internal/config"
	apperr "github.com/suda-3156/kkb/go/internal/error"
)

type KMS interface {
	Encrypt(ctx context.Context, plaintext string) ([]byte, error)
	Decrypt(ctx context.Context, ciphertext []byte) (string, error)
}

type kms struct {
	dek []byte
}

func New(cfg *config.Secret) KMS {
	return &kms{
		dek: cfg.DEK,
	}
}

func (k *kms) Encrypt(ctx context.Context, plaintext string) ([]byte, error) {
	plaintextBytes := []byte(plaintext)

	if len(k.dek) != 16 && len(k.dek) != 24 && len(k.dek) != 32 {
		return nil, apperr.NewInternalServerError(
			fmt.Errorf("kms - Encryption failed: invalid DEK length: %d", len(k.dek)),
		)
	}

	if len(plaintextBytes) == 0 {
		return nil, apperr.NewInternalServerError(
			fmt.Errorf("kms - Encryption failed: plaintext is empty"),
		)
	}

	block, err := aes.NewCipher(k.dek)
	if err != nil {
		return nil, apperr.NewInternalServerError(err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, apperr.NewInternalServerError(err)
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, apperr.NewInternalServerError(err)
	}

	cipherText := gcm.Seal(nil, nonce, plaintextBytes, nil)
	cipherText = append(nonce, cipherText...)

	return cipherText, nil
}

func (k *kms) Decrypt(ctx context.Context, ciphertext []byte) (string, error) {
	if len(k.dek) != 16 && len(k.dek) != 24 && len(k.dek) != 32 {
		return "", apperr.NewInternalServerError(
			fmt.Errorf("kms - Decryption failed: invalid DEK length: %d", len(k.dek)),
		)
	}

	if len(ciphertext) == 0 {
		return "", apperr.NewInternalServerError(
			fmt.Errorf("kms - Decryption failed: ciphertext is empty"),
		)
	}

	block, err := aes.NewCipher(k.dek)
	if err != nil {
		return "", apperr.NewInternalServerError(err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", apperr.NewInternalServerError(err)
	}

	if len(ciphertext) < gcm.NonceSize() {
		return "", apperr.NewInternalServerError(
			fmt.Errorf("kms - Decryption failed: ciphertext too short"),
		)
	}

	nonce := ciphertext[:gcm.NonceSize()]
	cipherText := ciphertext[gcm.NonceSize():]

	plaintextBytes, err := gcm.Open(nil, nonce, cipherText, nil)
	if err != nil {
		return "", apperr.NewInternalServerError(err)
	}

	return string(plaintextBytes), nil
}
