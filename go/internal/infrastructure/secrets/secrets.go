package secrets

import (
	"context"
	"fmt"
	"sort"
	"sync"
)

type SecretManager interface {
	GetSecretValue(ctx context.Context, name string) (string, error)
}

type SecretManagerFunc func(context.Context, *Config) (SecretManager, error)

var (
	managers     = make(map[string]SecretManagerFunc)
	managersLock sync.RWMutex
)

func RegisterManager(name string, fn SecretManagerFunc) {
	managersLock.Lock()
	defer managersLock.Unlock()

	if _, ok := managers[name]; ok {
		panic(fmt.Sprintf("secret manager %q already registered", name))
	}
	managers[name] = fn
}

func RegisteredManagers() []string {
	managersLock.RLock()
	defer managersLock.RUnlock()

	list := make([]string, 0, len(managers))
	for k := range managers {
		list = append(list, k)
	}
	sort.Strings(list)
	return list
}

func SecretManagerFor(ctx context.Context, cfg *Config) (SecretManager, error) {
	managersLock.RLock()
	defer managersLock.RUnlock()

	name := cfg.Type
	fn, ok := managers[name]
	if !ok {
		return nil, fmt.Errorf("secret manager %q not registered", name)
	}
	return fn(ctx, cfg)
}
