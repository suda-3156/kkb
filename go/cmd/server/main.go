package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/suda-3156/kkb/go/internal/config"
	"github.com/suda-3156/kkb/go/internal/connection"

	"github.com/suda-3156/kkb/go/ent"
	entmigrate "github.com/suda-3156/kkb/go/ent/migrate"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/extension"
	"github.com/99designs/gqlgen/graphql/handler/lru"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/suda-3156/kkb/go/graph"
	"github.com/suda-3156/kkb/go/graph/resolver"
	"github.com/vektah/gqlparser/v2/ast"
)

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

func start(cfg *config.AppConfig) *http.Server {
	slog.Info(
		"Starting HTTP server...",
		slog.Int("port", cfg.Server.Port),
	)

	srv := handler.New(graph.NewExecutableSchema(graph.Config{
		Resolvers:  &resolver.Resolver{},
		Complexity: graph.ComplexityConfig(),
	}))

	srv.AddTransport(transport.Options{})
	srv.AddTransport(transport.GET{})
	srv.AddTransport(transport.POST{})

	srv.SetQueryCache(lru.New[*ast.QueryDocument](1000))
	srv.Use(extension.FixedComplexityLimit(10))
	srv.Use(extension.Introspection{})
	srv.Use(extension.AutomaticPersistedQuery{
		Cache: lru.New[string](100),
	})

	mux := http.NewServeMux()
	mux.Handle("/", playground.Handler("GraphQL playground", "/query"))
	mux.Handle("/query", srv)

	httpServer := &http.Server{
		Addr:              fmt.Sprintf(":%d", cfg.Server.Port),
		Handler:           mux,
		ReadTimeout:       15 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	return httpServer
}

func shutdown(cfg *config.AppConfig, httpServer *http.Server, db *ent.Client, timeout time.Duration) error {
	shutdownCh := make(chan os.Signal, 1)
	signal.Notify(shutdownCh, syscall.SIGINT, syscall.SIGTERM)
	defer signal.Stop(shutdownCh)

	errCh := make(chan error, 1)
	go func() {
		slog.Info(
			"Server is ready",
			slog.String("playground", fmt.Sprintf("http://localhost:%d/", cfg.Server.Port)),
			slog.String("endpoint", fmt.Sprintf("http://localhost:%d/query", cfg.Server.Port)),
		)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	select {
	case err := <-errCh:
		return fmt.Errorf("server error: %w", err)
	case sig := <-shutdownCh:
		slog.Info("Received shutdown signal", slog.String("signal", sig.String()))
	}

	// Graceful shutdown with timeout
	slog.Info("Starting graceful shutdown...", slog.Duration("timeout", timeout))
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	slog.Info("Shutting down HTTP server...")
	if err := httpServer.Shutdown(ctx); err != nil {
		slog.Error("Failed to shutdown HTTP server gracefully", slog.String("reason", err.Error()))
	} else {
		slog.Info("HTTP server stopped successfully")
	}

	slog.Info("Closing database connection...")
	if err := db.Close(); err != nil {
		slog.Error("Failed to close database connection", slog.String("reason", err.Error()))
		return fmt.Errorf("failed to close database: %w", err)
	}
	slog.Info("Database connection closed successfully")

	slog.Info("Shutdown completed successfully")
	return nil
}

func run() error {
	cfg := config.New()

	slog.Info(
		"Starting server with configuration",
		slog.Any("config", cfg),
	)

	db, err := connection.OpenDB(cfg.GetAppConfig())
	if err != nil {
		return fmt.Errorf("failed to open database connection: %w", err)
	}
	// DB connection will be closed in shutdown function.

	if cfg.GetAppConfig().ENV == "local" {
		migrate(db)
		entDebugLog(db)
	}

	httpServer := start(cfg.GetAppConfig())

	if err := shutdown(cfg.GetAppConfig(), httpServer, db, 30*time.Second); err != nil {
		if closeErr := db.Close(); closeErr != nil {
			slog.Error("Failed to close database after error", slog.String("reason", closeErr.Error()))
		}
		return fmt.Errorf("server shutdown error: %w", err)
	}

	return nil
}

func main() {
	if err := run(); err != nil {
		slog.Error(
			"Server encountered an error",
			slog.String("reason", err.Error()),
		)
		os.Exit(1)
	}
}
