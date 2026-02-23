package database

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
	_ "github.com/go-sql-driver/mysql"
	"github.com/suda-3156/kkb/go/ent"
)

type DB struct {
	Client *ent.Client
}

func New(ctx context.Context, cfg *Config) (*DB, error) {
	slog.InfoContext(ctx, "initializing database connection")

	pool, err := sql.Open("mysql", cfg.ConnectionURL())
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	drv := entsql.OpenDB(dialect.MySQL, pool)
	client := ent.NewClient(ent.Driver(drv))

	if err := client.Ping(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	slog.InfoContext(ctx, "database connection established successfully")

	return &DB{
		Client: client,
	}, nil
}

func (db *DB) Close() error {
	slog.Info("closing database connection")
	return db.Client.Close()
}
