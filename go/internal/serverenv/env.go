// Package serverenv provides the initialized components for the server,
// such as database connections.
package serverenv

import (
	"context"

	"github.com/suda-3156/kkb/go/internal/infrastructure/database"
	"github.com/suda-3156/kkb/go/internal/infrastructure/keys"
)

// ServerEnv holds the initialized components for the server, such as database connections.
type ServerEnv struct {
	database *database.DB
	km       keys.KeyManager
}

// Option defines a function type that modifies the ServerEnv.
type Option func(*ServerEnv) *ServerEnv

// New creates a new ServerEnv with the provided options.
func New(ctx context.Context, opts ...Option) *ServerEnv {
	env := &ServerEnv{}

	for _, opt := range opts {
		env = opt(env)
	}

	return env
}

// WithDatabase is an option to set the database connection in the ServerEnv.
func WithDatabase(db *database.DB) Option {
	return func(env *ServerEnv) *ServerEnv {
		env.database = db
		return env
	}
}

// WithKeyManager is an option to set the key manager in the ServerEnv.
func WithKeyManager(km keys.KeyManager) Option {
	return func(env *ServerEnv) *ServerEnv {
		env.km = km
		return env
	}
}

// Database returns the database connection from the ServerEnv.
func (env *ServerEnv) Database() *database.DB {
	return env.database
}

// KeyManager returns the key manager from the ServerEnv.
func (env *ServerEnv) KeyManager() keys.KeyManager {
	return env.km
}

// Close closes any resources held by the ServerEnv.
func (env *ServerEnv) Close(ctx context.Context) error {
	if env.database != nil {
		return env.database.Close(ctx)
	}
	return nil
}
