package database

import (
	"context"
	"database/sql"
	"fmt"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
	_ "github.com/go-sql-driver/mysql"
	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/internal/logging"
)

type DB struct {
	Client *ent.Client
}

func New(ctx context.Context, cfg *Config) (*DB, error) {
	logging.Info(ctx, "initializing database connection")

	pool, err := sql.Open("mysql", cfg.ConnectionURL())
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	drv := entsql.OpenDB(dialect.MySQL, pool)
	client := ent.NewClient(ent.Driver(drv))

	if err := client.Ping(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	logging.Info(ctx, "database connection established successfully")

	if cfg.DebugLog {
		logging.Notice(ctx, "enable ent debug logging for database operations")
		client = client.Debug()
	}

	return &DB{
		Client: client,
	}, nil
}

func (db *DB) Close(ctx context.Context) error {
	logging.Info(ctx, "closing database connection")
	return db.Client.Close()
}
