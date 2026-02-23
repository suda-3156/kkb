package keys

import (
	"context"
	"fmt"
	"sort"
	"sync"
)

type KeyManager interface {
	Encrypt(ctx context.Context, KeyID string, plaintext, aad []byte) ([]byte, error)
	Decrypt(ctx context.Context, KeyID string, ciphertext, aad []byte) ([]byte, error)
}

type EncryptionKeyManager interface {
	// CreateEncryptionKey creates a new encryption key with the given name under the given group.
	// Returns the ID (= group/name) of the created key.
	CreateEncryptionKey(ctx context.Context, group, name string) (string, error)

	// CreateKeyVersion creates a new version of the key with the given ID (= group/name).
	CreateKeyVersion(ctx context.Context, keyID string) (string, error)

	// DestroyKeyVersion destroys the key version with the given ID (= group/name/version).
	DestroyKeyVersion(ctx context.Context, keyVersionID string) error
}

type KeyManagerFunc func(context.Context, *Config) (KeyManager, error)

var (
	managers     = make(map[string]KeyManagerFunc)
	managersLock sync.RWMutex
)

func RegisterManager(name string, fn KeyManagerFunc) {
	managersLock.Lock()
	defer managersLock.Unlock()

	if _, ok := managers[name]; ok {
		panic(fmt.Sprintf("key manager %s already registered", name))
	}
	managers[name] = fn
}

func RegisteredManagers() []string {
	managersLock.RLock()
	defer managersLock.RUnlock()

	list := make([]string, 0, len(managers))
	for name := range managers {
		list = append(list, name)
	}

	sort.Strings(list)
	return list
}

func KeyManagerFor(ctx context.Context, cfg *Config) (KeyManager, error) {
	managersLock.RLock()
	defer managersLock.RUnlock()

	name := cfg.Type
	fn, ok := managers[name]
	if !ok {
		return nil, fmt.Errorf("key manager %s not registered", name)
	}

	return fn(ctx, cfg)
}
