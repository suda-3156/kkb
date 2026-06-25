package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"ariga.io/atlas/atlasexec"
	"github.com/suda-3156/kkb/go/internal/infrastructure/database"
	"github.com/suda-3156/kkb/go/internal/logging"
	"github.com/suda-3156/kkb/go/internal/setup"
)

var (
	pathFlag = flag.String("path", "/db/migrations/", "path to migrations folder")
)

func main() {
	flag.Parse()

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
		//nolint: gocritic // we don't need to check error here
		os.Exit(1)
	}

	logging.Info(ctx, "successful shutdown")
}

func run(ctx context.Context) error {
	logging.Info(ctx, "starting migration", slog.String("path", *pathFlag))

	var cfg database.Config
	env, err := setup.Setup(ctx, &cfg)
	if err != nil {
		return fmt.Errorf("setup.Setup: %w", err)
	}
	defer env.Close(ctx)

	workdir, err := atlasexec.NewWorkingDir(
		atlasexec.WithMigrations(
			os.DirFS(*pathFlag),
		),
	)
	if err != nil {
		return fmt.Errorf("atlasexec.NewWorkingDir: %w", err)
	}
	defer workdir.Close()

	client, err := atlasexec.NewClient(workdir.Path(), "atlas")
	if err != nil {
		return fmt.Errorf("atlasexec.NewClient: %w", err)
	}

	status, err := client.MigrateStatus(ctx, &atlasexec.MigrateStatusParams{
		URL: cfg.AtlasURL(),
	})
	if err != nil {
		return fmt.Errorf("client.MigrateStatus: %w", err)
	}

	logging.Info(ctx, "migration status", slog.Group("status",
		slog.String("migration_status", status.Status),
		slog.String("current_version", status.Current),
		slog.String("next_version", status.Next),
		slog.Int("applied_count", len(status.Applied)),
		slog.Int("pending_count", len(status.Pending)),
	))

	if len(status.Pending) == 0 {
		logging.Notice(ctx, "no pending migrations")
		return nil
	}

	result, err := client.MigrateApply(ctx, &atlasexec.MigrateApplyParams{
		URL: cfg.AtlasURL(),
	})
	if err != nil {
		return fmt.Errorf("client.MigrateApply: %w", err)
	}

	logging.Notice(ctx, "migration applied", slog.Group("result",
		slog.String("current_version", result.Current),
		slog.Time("started_at", result.Start),
		slog.Time("ended_at", result.End),
		slog.Int("applied_count", len(result.Applied)),
	))

	return nil
}
