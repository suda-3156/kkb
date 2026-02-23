package main

import (
	"context"
	"fmt"
	"log/slog"
	"os/signal"
	"syscall"

	"github.com/suda-3156/kkb/go/ent"
	entmigrate "github.com/suda-3156/kkb/go/ent/migrate"
	"github.com/suda-3156/kkb/go/internal/api"
	"github.com/suda-3156/kkb/go/internal/infrastructure/server"
	"github.com/suda-3156/kkb/go/internal/setup"
)

// TODO: Temporal implement:
func migrate(client *ent.Client) {
	slog.Warn("Auto-migrating database schema in local environment...")
	err := client.Debug().Schema.Create(
		context.Background(),
		entmigrate.WithDropIndex(true),
		entmigrate.WithDropColumn(true),
	)
	if err != nil {
		slog.Error("Failed to migrate schema", slog.String("reason", err.Error()))
	}
	slog.Info("Database schema migrated successfully.")
}

func entDebugLog(client *ent.Client) {
	slog.Warn("Enabling Ent debug logging in local environment...")
	// Errors are intentionally ignored - this is just for debug logging confirmation
	_, _ = client.Debug().LedgerAccount.Query().All(context.Background())
}

// ---↑

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer func() {
		stop()
		if r := recover(); r != nil {
			slog.ErrorContext(ctx, "application panicked", slog.Any("error", r))
		}
	}()

	slog.SetLogLoggerLevel(slog.LevelDebug)

	err := run(ctx)
	stop()

	if err != nil {
		slog.ErrorContext(ctx, "application error", slog.Any("error", err))
	}

	slog.InfoContext(ctx, "successful shutdown")
}

func run(ctx context.Context) error {
	var cfg api.Config
	env, err := setup.Setup(ctx, &cfg)
	if err != nil {
		return fmt.Errorf("setup.Setup: %w", err)
	}
	defer env.Close()

	srv, err := api.New(ctx, &cfg, env)
	if err != nil {
		return fmt.Errorf("api.New: %w", err)
	}

	// TODO: Temporal implement
	migrate(env.Database().Client)
	entDebugLog(env.Database().Client)

	server := server.New(cfg.Port)

	return server.ServeHTTP(ctx, srv.ServeMux(ctx))
}
