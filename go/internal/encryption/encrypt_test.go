package encryption

import (
	"context"
	"testing"
	"time"
)

// newTestManager builds an EncryptionManager wired with in-memory keys only,
// bypassing New (which touches the database and KMS). refreshAfter is set far
// in the future so maybeRefresh short-circuits and never hits the database.
func newTestManager(t *testing.T, keys map[int][]byte, effectiveID int) *EncryptionManager {
	t.Helper()

	allowed := make(map[int]*EncryptionKey, len(keys))
	for id, dek := range keys {
		allowed[id] = &EncryptionKey{ID: id, DEK: dek, Allowed: true}
	}

	em := &EncryptionManager{
		allowed:      allowed,
		refreshAfter: time.Now().Add(time.Hour),
	}
	if effectiveID != 0 {
		em.effective = allowed[effectiveID]
	}
	return em
}

// key of the requested length filled with a deterministic pattern.
func key(size int) []byte {
	b := make([]byte, size)
	for i := range b {
		b[i] = byte(i + 1)
	}
	return b
}

func TestEncryptDecrypt_RoundTrip(t *testing.T) {
	ctx := context.Background()

	// AES-128, AES-192, AES-256 key sizes are all valid.
	for _, size := range []int{16, 24, 32} {
		em := newTestManager(t, map[int][]byte{1: key(size)}, 1)

		for _, plaintext := range []string{"lunch", "給料", "", "x"} {
			payload, err := em.Encrypt(ctx, plaintext)
			if plaintext == "" {
				if err == nil {
					t.Errorf("Encrypt(size=%d) empty plaintext: want error", size)
				}
				continue
			}
			if err != nil {
				t.Fatalf("Encrypt(size=%d, %q) failed: %v", size, plaintext, err)
			}
			if payload.KeyID != 1 {
				t.Errorf("Encrypt KeyID = %d, want 1", payload.KeyID)
			}

			got, err := em.Decrypt(ctx, payload.Ciphertext, payload.KeyID)
			if err != nil {
				t.Fatalf("Decrypt(size=%d) failed: %v", size, err)
			}
			if got != plaintext {
				t.Errorf("round trip = %q, want %q", got, plaintext)
			}
		}
	}
}

func TestEncrypt_NonDeterministic(t *testing.T) {
	ctx := context.Background()
	em := newTestManager(t, map[int][]byte{1: key(32)}, 1)

	a, err := em.Encrypt(ctx, "same input")
	if err != nil {
		t.Fatal(err)
	}
	b, err := em.Encrypt(ctx, "same input")
	if err != nil {
		t.Fatal(err)
	}
	if string(a.Ciphertext) == string(b.Ciphertext) {
		t.Error("Encrypt produced identical ciphertext for equal plaintext; nonce reuse?")
	}
}

func TestEncrypt_Errors(t *testing.T) {
	ctx := context.Background()

	t.Run("empty plaintext", func(t *testing.T) {
		em := newTestManager(t, map[int][]byte{1: key(32)}, 1)
		if _, err := em.Encrypt(ctx, ""); err == nil {
			t.Error("want error for empty plaintext")
		}
	})

	t.Run("invalid key length", func(t *testing.T) {
		em := newTestManager(t, map[int][]byte{1: key(20)}, 1)
		if _, err := em.Encrypt(ctx, "data"); err == nil {
			t.Error("want error for 20-byte key")
		}
	})
}

func TestDecrypt_Errors(t *testing.T) {
	ctx := context.Background()

	t.Run("empty ciphertext", func(t *testing.T) {
		em := newTestManager(t, map[int][]byte{1: key(32)}, 1)
		if _, err := em.Decrypt(ctx, nil, 1); err == nil {
			t.Error("want error for empty ciphertext")
		}
	})

	t.Run("unknown key id", func(t *testing.T) {
		em := newTestManager(t, map[int][]byte{1: key(32)}, 1)
		payload, err := em.Encrypt(ctx, "data")
		if err != nil {
			t.Fatal(err)
		}
		if _, err := em.Decrypt(ctx, payload.Ciphertext, 999); err == nil {
			t.Error("want error for unknown key id")
		}
	})

	t.Run("ciphertext too short", func(t *testing.T) {
		em := newTestManager(t, map[int][]byte{1: key(32)}, 1)
		if _, err := em.Decrypt(ctx, []byte("short"), 1); err == nil {
			t.Error("want error for ciphertext shorter than nonce")
		}
	})

	t.Run("tampered ciphertext fails authentication", func(t *testing.T) {
		em := newTestManager(t, map[int][]byte{1: key(32)}, 1)
		payload, err := em.Encrypt(ctx, "sensitive data")
		if err != nil {
			t.Fatal(err)
		}
		// Flip the last byte (part of the GCM auth tag / ciphertext).
		payload.Ciphertext[len(payload.Ciphertext)-1] ^= 0xFF
		if _, err := em.Decrypt(ctx, payload.Ciphertext, 1); err == nil {
			t.Error("want authentication error for tampered ciphertext")
		}
	})

	t.Run("wrong key fails", func(t *testing.T) {
		// Encrypt under key 1, then try to decrypt claiming key 2 (a different DEK).
		em := newTestManager(t, map[int][]byte{1: key(32), 2: reversed(key(32))}, 1)
		payload, err := em.Encrypt(ctx, "sensitive data")
		if err != nil {
			t.Fatal(err)
		}
		if _, err := em.Decrypt(ctx, payload.Ciphertext, 2); err == nil {
			t.Error("want error decrypting with the wrong key")
		}
	})
}

func reversed(b []byte) []byte {
	out := make([]byte, len(b))
	for i := range b {
		out[len(b)-1-i] = b[i]
	}
	return out
}
