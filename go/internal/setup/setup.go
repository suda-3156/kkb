// Package setup provides functions to initialize and configure the server environment.
package setup

import (
	"context"

	"github.com/sethvargo/go-envconfig"
	"github.com/suda-3156/kkb/go/internal/infrastructure/database"
	"github.com/suda-3156/kkb/go/internal/serverenv"
)

// DatabaseConfigProvider ensures that the environment config can provide database configuration.
type DatabaseConfigProvider interface {
	DatabaseConfig() *database.Config
}

// Setup initializes the server environment.
func Setup(ctx context.Context, config interface{}) (*serverenv.ServerEnv, error) {
	return SetupWith(ctx, config, envconfig.OsLookuper())
}

// SetupWith initializes the server environment with a custom environment variable lookuper.
func SetupWith(
	ctx context.Context,
	config interface{},
	lookuper envconfig.Lookuper,
) (*serverenv.ServerEnv, error) {
	var serverEnvOpts []serverenv.Option

	if provider, ok := config.(DatabaseConfigProvider); ok {
		dbConfig := provider.DatabaseConfig()
		db, err := database.New(ctx, dbConfig)
		if err != nil {
			return nil, err
		}
		serverEnvOpts = append(serverEnvOpts, serverenv.WithDatabase(db))
	}

	return serverenv.New(ctx, serverEnvOpts...), nil
}
