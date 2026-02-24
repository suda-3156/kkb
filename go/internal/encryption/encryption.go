package encryption

import (
	"context"
	"crypto/rand"
	"fmt"
	"sync"
	"time"

	"entgo.io/ent/dialect/sql"
	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/ledgerencryptionkey"
	"github.com/suda-3156/kkb/go/internal/infrastructure/database"
	"github.com/suda-3156/kkb/go/internal/infrastructure/keys"
)

type EncryptionKey struct {
	ID            int
	WrappedCipher []byte
	AAD           []byte
	Allowed       bool
	CreatedAt     time.Time
	UpdatedAt     time.Time

	DEK []byte // Unwrapped Ledger Encryption Key.
}

type EncryptionManager struct {
	// Dependencies
	db *database.DB
	km keys.KeyManager

	// Key ID of the wrapper key used for encrypting DEKs.
	wrapperKeyID string
	// AAD for ledger data encryption, not for key wrapping.
	aad []byte

	// To protect concurrent access to the cache
	mu sync.RWMutex

	// Keys currently available for decryption
	allowed map[int]*EncryptionKey
	// Pointer to the effective key used for encryption, which is the most recently created allowed key.
	effective *EncryptionKey

	// Cache refresh management
	refreshAfter time.Time
	cacheTTL     time.Duration
}

func New(config *Config) *EncryptionManager {
	now := time.Now()

	em := &EncryptionManager{
		db:           config.Database,
		km:           config.KeyManager,
		wrapperKeyID: config.WrapperKeyID,
		aad:          config.AAD,
		allowed:      make(map[int]*EncryptionKey),
		cacheTTL:     config.CacheTTL,
		refreshAfter: now.Add(-2 * config.CacheTTL), // Force refresh on first use
	}

	if err := em.maybeRefresh(context.Background()); err != nil {
		panic(fmt.Sprintf("failed to initialize encryption manager: %v", err))
	}

	return em
}

func (em *EncryptionManager) expired() bool {
	em.mu.RLock()
	defer em.mu.RUnlock()
	return time.Now().After(em.refreshAfter)
}

func (em *EncryptionManager) maybeRefresh(ctx context.Context) error {
	if !em.expired() {
		return nil
	}

	em.mu.Lock()
	defer em.mu.Unlock()

	// Fetch allowed keys from database
	allowed, err := em.db.Client.LedgerEncryptionKey.Query().
		Where(ledgerencryptionkey.Allowed(true)).
		Order(ledgerencryptionkey.ByCreatedAt(sql.OrderDesc())).
		All(ctx)
	if err != nil {
		return fmt.Errorf("failed to query allowed keys: %w", err)
	}

	var effective *ent.LedgerEncryptionKey
	if len(allowed) > 0 {
		effective = allowed[0] // The most recently created allowed key is the effective key.
	}

	// If cache IDs contains all allowed keys in the database
	// and the effective key ID is the same as the cached one, no need to refresh.
	needed, err := em.isRefreshNeeded(allowed, effective)
	if err != nil {
		return fmt.Errorf("failed to check if refresh is needed: %w", err)
	}
	if !needed {
		return nil
	}

	// Refresh cache
	// Clear the old cache
	em.allowed = make(map[int]*EncryptionKey)
	em.effective = nil

	if err := em.refreshCache(ctx, allowed, effective); err != nil {
		return fmt.Errorf("failed to refresh cache: %w", err)
	}

	em.refreshAfter = time.Now().Add(em.cacheTTL)
	return nil
}

// Must be called with write lock held
func (em *EncryptionManager) isRefreshNeeded(
	allowed []*ent.LedgerEncryptionKey, effective *ent.LedgerEncryptionKey,
) (bool, error) {
	if em.effective == nil {
		return true, nil
	}

	// If the effective key ID is different, we must refresh.
	if em.effective.ID != effective.ID {
		return true, nil
	}

	// If the set of allowed keys in the database is not in the cache, we must refresh.
	allowedIDs := make(map[int]struct{})
	for _, key := range allowed {
		allowedIDs[key.ID] = struct{}{}
	}

	for new := range allowedIDs {
		if _, ok := em.allowed[new]; !ok {
			return true, nil
		}
	}

	for old := range em.allowed {
		if _, ok := allowedIDs[old]; !ok {
			delete(em.allowed, old)
		}
	}

	return false, nil
}

// Must be called with write lock held
func (em *EncryptionManager) refreshCache(
	ctx context.Context, allowed []*ent.LedgerEncryptionKey, effective *ent.LedgerEncryptionKey,
) error {
	if len(allowed) == 0 {
		// No allowed keys in the database, create a new one and cache it.
		dek, err := em.createKey(ctx)
		if err != nil {
			return fmt.Errorf("failed to create new key: %w", err)
		}

		em.allowed = map[int]*EncryptionKey{dek.ID: dek}
		em.effective = dek

		return nil
	}

	// Unwrap allowed keys and cache them.
	for _, key := range allowed {
		unwrapped, err := em.km.Decrypt(ctx, em.wrapperKeyID, key.WrappedCipher, key.Aad)
		if err != nil {
			return fmt.Errorf("failed to unwrap key %d: %w", key.ID, err)
		}
		em.allowed[key.ID] = &EncryptionKey{
			ID:            key.ID,
			WrappedCipher: key.WrappedCipher,
			AAD:           key.Aad,
			Allowed:       key.Allowed,
			CreatedAt:     key.CreatedAt,
			UpdatedAt:     key.UpdatedAt,
			DEK:           unwrapped,
		}
	}

	em.effective = em.allowed[effective.ID]

	return nil
}

func (em *EncryptionManager) createKey(ctx context.Context) (*EncryptionKey, error) {
	// Generate a new DEK (Ledger Encryption Key)
	dek := make([]byte, 32) // AES-256
	if _, err := rand.Read(dek); err != nil {
		return nil, fmt.Errorf("failed to generate DEK: %w", err)
	}

	aad := make([]byte, 16)
	if _, err := rand.Read(aad); err != nil {
		return nil, fmt.Errorf("failed to generate random data: %w", err)
	}

	// Wrap the DEK with the wrapper key
	wrapped, err := em.km.Encrypt(ctx, em.wrapperKeyID, dek, aad)
	if err != nil {
		return nil, fmt.Errorf("failed to wrap encryption key: %w", err)
	}

	// Store the wrapped key in the database
	var key *ent.LedgerEncryptionKey
	var errTx error
	if err := em.db.Client.WithTx(ctx, func(ctx context.Context, client *ent.Client) error {
		key, errTx = client.LedgerEncryptionKey.Create().
			SetWrappedCipher(wrapped).
			SetAad(aad).
			SetAllowed(true).
			Save(ctx)

		return errTx
	}); err != nil {
		return nil, fmt.Errorf("failed to persist created encryption key: %w", err)
	}

	return &EncryptionKey{
		ID:            key.ID,
		WrappedCipher: key.WrappedCipher,
		AAD:           key.Aad,
		Allowed:       key.Allowed,
		CreatedAt:     key.CreatedAt,
		UpdatedAt:     key.UpdatedAt,
		DEK:           dek,
	}, nil
}
