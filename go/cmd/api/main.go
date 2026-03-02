package main

import (
	"context"
	"fmt"
	"log/slog"
	"os/signal"
	"syscall"

	"github.com/suda-3156/kkb/go/internal/api"
	"github.com/suda-3156/kkb/go/internal/infrastructure/server"
	"github.com/suda-3156/kkb/go/internal/logging"
	"github.com/suda-3156/kkb/go/internal/setup"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer func() {
		stop()
		if r := recover(); r != nil {
			logging.Critical(ctx, "application panicked", slog.Any("error", r))
		}
	}()

	logging.SetDefault(logging.NewFromEnv())

	err := run(ctx)
	stop()

	if err != nil {
		logging.Critical(ctx, "application error", slog.Any("error", err))
	}

	logging.Info(ctx, "successful shutdown")
}

func run(ctx context.Context) error {
	var cfg api.Config
	env, err := setup.Setup(ctx, &cfg)
	if err != nil {
		return fmt.Errorf("setup.Setup: %w", err)
	}
	defer env.Close(ctx)

	srv, err := api.New(ctx, &cfg, env)
	if err != nil {
		return fmt.Errorf("api.New: %w", err)
	}

	//nolint: gocritic // This is intended shadow import
	server := server.New(cfg.Port)

	return server.ServeHTTP(ctx, srv.Handler(ctx))
}
