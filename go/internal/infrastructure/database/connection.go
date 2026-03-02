package database

import (
	"context"
	"database/sql"
	"fmt"
	"net"

	"cloud.google.com/go/cloudsqlconn"
	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
	"github.com/go-sql-driver/mysql"
	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/internal/logging"
)

type DB struct {
	Client *ent.Client
}

func New(ctx context.Context, cfg *Config) (*DB, error) {
	logging.Info(ctx, "initializing database connection")

	if cfg.ConnectionMode == "cloudsqlconn" && cfg.ConnectionName == "" {
		return nil, fmt.Errorf("connection name is required with Cloud SQL Connector")
	}

	pool, err := connect(ctx, cfg)
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

func connect(ctx context.Context, cfg *Config) (*sql.DB, error) {
	if cfg.ConnectionMode != "cloudsqlconn" {
		logging.Info(ctx, "connecting to database via TCP")
		return sql.Open("mysql", cfg.ConnectionURL())
	}

	logging.Info(ctx, "connecting to database via Cloud SQL Connector")
	dialer, err := cloudsqlconn.NewDialer(
		ctx,
		cloudsqlconn.WithLazyRefresh(),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create Cloud SQL Connector dialer: %w", err)
	}

	var opts []cloudsqlconn.DialOption
	opts = append(opts, cloudsqlconn.WithPrivateIP())

	mysql.RegisterDialContext("cloudsqlconn",
		func(ctx context.Context, addr string) (net.Conn, error) {
			return dialer.Dial(ctx, cfg.ConnectionName, opts...)
		})

	return sql.Open("cloudsqlconn", cfg.ConnectionURL())
}
