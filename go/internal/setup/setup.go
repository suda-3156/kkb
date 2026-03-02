// Package setup provides functions to initialize and configure the server environment.
package setup

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/sethvargo/go-envconfig"
	"github.com/suda-3156/kkb/go/internal/infrastructure/database"
	"github.com/suda-3156/kkb/go/internal/infrastructure/keys"
	"github.com/suda-3156/kkb/go/internal/infrastructure/secrets"
	"github.com/suda-3156/kkb/go/internal/logging"
	"github.com/suda-3156/kkb/go/internal/serverenv"
)

// DatabaseConfigProvider ensures that the environment config can provide database configuration.
type DatabaseConfigProvider interface {
	DatabaseConfig() *database.Config
}

// KeyManagerConfigProvider is a marker interface indicating the key manager
// should be installed.
type KeyManagerConfigProvider interface {
	KeyManagerConfig() *keys.Config
}

// SecretManagerConfigProvider is a marker interface indicating the secret manager
// should be installed.
type SecretManagerConfigProvider interface {
	SecretManagerConfig() *secrets.Config
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
	var mutators []envconfig.Mutator

	var serverEnvOpts []serverenv.Option

	var sm secrets.SecretManager
	if provider, ok := config.(SecretManagerConfigProvider); ok {
		logging.Info(
			ctx,
			"configuring secret manager",
		)

		smConfig := provider.SecretManagerConfig()
		if err := envconfig.Process(ctx, &envconfig.Config{
			Target:   smConfig,
			Lookuper: lookuper,
			Mutators: mutators,
		}); err != nil {
			return nil, fmt.Errorf("setup: process secret manager env: %w", err)
		}

		var err error
		sm, err = secrets.SecretManagerFor(ctx, smConfig)
		if err != nil {
			return nil, fmt.Errorf("setup: init secret manager: %w", err)
		}

		mutators = append(mutators, secrets.Resolver(sm, smConfig))

		serverEnvOpts = append(serverEnvOpts, serverenv.WithSecretManager(sm))

		logging.Info(
			ctx,
			"secret manager configured",
			slog.Any("config", smConfig),
		)
	}

	if err := envconfig.ProcessWith(ctx, &envconfig.Config{
		Target:   config,
		Lookuper: lookuper,
		Mutators: mutators,
	}); err != nil {
		return nil, fmt.Errorf("setup: process env: %w", err)
	}
	logging.Info(
		ctx,
		"environment variables processed",
		slog.Any("config", config),
	)

	// Database configuration
	if provider, ok := config.(DatabaseConfigProvider); ok {
		logging.Info(
			ctx,
			"configuring database",
		)

		dbConfig := provider.DatabaseConfig()
		db, err := database.New(ctx, dbConfig)
		if err != nil {
			return nil, err
		}

		serverEnvOpts = append(serverEnvOpts, serverenv.WithDatabase(db))

		logging.Info(
			ctx,
			"database configured",
			slog.Any("config", dbConfig),
		)
	}

	// Key manager configuration
	if provider, ok := config.(KeyManagerConfigProvider); ok {
		logging.Info(
			ctx,
			"configuring key manager",
		)

		kmConfig := provider.KeyManagerConfig()
		if err := envconfig.Process(ctx, &envconfig.Config{
			Target:   kmConfig,
			Lookuper: lookuper,
			Mutators: mutators,
		}); err != nil {
			return nil, fmt.Errorf("setup: process key manager env: %w", err)
		}

		km, err := keys.KeyManagerFor(ctx, kmConfig)
		if err != nil {
			return nil, fmt.Errorf("setup: init key manager: %w", err)
		}

		serverEnvOpts = append(serverEnvOpts, serverenv.WithKeyManager(km))

		logging.Info(
			ctx,
			"key manager configured",
			slog.Any("config", kmConfig),
		)
	}

	return serverenv.New(ctx, serverEnvOpts...), nil
}
