// Package serverenv provides the initialized components for the server,
// such as database connections.
package serverenv

import (
	"context"

	"github.com/suda-3156/kkb/go/internal/infrastructure/database"
)

// ServerEnv holds the initialized components for the server, such as database connections.
type ServerEnv struct {
	database *database.DB
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

// Database returns the database connection from the ServerEnv.
func (env *ServerEnv) Database() *database.DB {
	return env.database
}

// Close closes any resources held by the ServerEnv.
func (env *ServerEnv) Close() error {
	if env.database != nil {
		return env.database.Close()
	}
	return nil
}
