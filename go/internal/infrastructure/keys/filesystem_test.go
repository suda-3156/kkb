package keys

import (
	"bytes"
	"context"
	"testing"
)

func newTestFilesystem(t *testing.T) (fs *Filesystem, keyID string) {
	t.Helper()
	ctx := context.Background()

	km, err := NewFilesystem(ctx, &Config{FilesystemRoot: t.TempDir()})
	if err != nil {
		t.Fatalf("NewFilesystem: %v", err)
	}
	fs = km.(*Filesystem)

	keyID, err = fs.CreateEncryptionKey(ctx, "group", "name")
	if err != nil {
		t.Fatalf("CreateEncryptionKey: %v", err)
	}
	if _, err := fs.CreateKeyVersion(ctx, keyID); err != nil {
		t.Fatalf("CreateKeyVersion: %v", err)
	}
	return fs, keyID
}

func TestFilesystemEncryptDecryptRoundTrip(t *testing.T) {
	fs, keyID := newTestFilesystem(t)
	ctx := context.Background()
	plaintext := []byte("secret")
	aad := []byte("aad")

	ciphertext, err := fs.Encrypt(ctx, keyID, plaintext, aad)
	if err != nil {
		t.Fatalf("Encrypt: %v", err)
	}

	got, err := fs.Decrypt(ctx, keyID, ciphertext, aad)
	if err != nil {
		t.Fatalf("Decrypt: %v", err)
	}
	if !bytes.Equal(got, plaintext) {
		t.Errorf("Decrypt = %q, want %q", got, plaintext)
	}

	if _, err := fs.Decrypt(ctx, keyID, ciphertext, []byte("other")); err == nil {
		t.Error("Decrypt with different aad succeeded, want error")
	}
}

func TestFilesystemEncryptUsesFreshNonce(t *testing.T) {
	fs, keyID := newTestFilesystem(t)
	ctx := context.Background()
	plaintext := []byte("secret")

	first, err := fs.Encrypt(ctx, keyID, plaintext, nil)
	if err != nil {
		t.Fatalf("Encrypt: %v", err)
	}
	second, err := fs.Encrypt(ctx, keyID, plaintext, nil)
	if err != nil {
		t.Fatalf("Encrypt: %v", err)
	}

	if bytes.Equal(first, second) {
		t.Error("encrypting the same plaintext twice produced identical ciphertexts")
	}
}
