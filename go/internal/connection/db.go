package connection

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"

	"entgo.io/ent/dialect"
	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/internal/config"

	entsql "entgo.io/ent/dialect/sql"
	_ "github.com/go-sql-driver/mysql"
)

func OpenDB(cfg *config.AppConfig) (*ent.Client, error) {
	var dbPool *sql.DB
	var err error

	if cfg.DB.TCP != (config.TCP{}) {
		slog.Info("OpenDB: Using TCP connection")
		dbPool, err = connectWithTCP(cfg)
	} else {
		return nil, errors.New("OpenDB: No valid database connection configuration found")
	}

	if err != nil {
		return nil, fmt.Errorf("OpenDB: Failed opening connection to db: %w", err)
	}

	drv := entsql.OpenDB(dialect.MySQL, dbPool)
	client := ent.NewClient(ent.Driver(drv))

	if err := client.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("OpenDB: failed pinging database: %w", err)
	}

	slog.Info("OpenDB: Successfully connected to database")

	return client, nil
}

func connectWithTCP(cfg *config.AppConfig) (*sql.DB, error) {
	var (
		dbUser = cfg.DB.Username
		dbPwd  = cfg.DB.Password
		dbHost = cfg.DB.TCP.Host
		dbPort = cfg.DB.TCP.Port
		dbName = cfg.DB.Database
	)

	dbURI := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?parseTime=true",
		dbUser, dbPwd, dbHost, dbPort, dbName)

	dbPool, err := sql.Open("mysql", dbURI)
	if err != nil {
		return nil, fmt.Errorf("connectWithTCP: failed to open sql: %w", err)
	}
	return dbPool, nil
}

// func connectWithConnector(cfg *config.AppConfig) (*sql.DB, error) {
// 	var (
// 		dbUser                 = cfg.DB.Username
// 		dbPwd                  = cfg.DB.Password
// 		dbName                 = cfg.DB.Database
// 		instanceConnectionName = cfg.ProjectID + ":" + cfg.DB.CloudSQLConn.Region + ":" + cfg.DB.CloudSQLConn.InstanceName
// 	)

// 	d, err := cloudsqlconn.NewDialer(
// 		context.Background(),
// 		cloudsqlconn.WithLazyRefresh(),
// 	)
// 	if err != nil {
// 		return nil, fmt.Errorf("connectWithConnector: failed to create dialer: %w", err)
// 	}

// 	var opts []cloudsqlconn.DialOption
// 	opts = append(opts, cloudsqlconn.WithPrivateIP())

// 	mysql.RegisterDialContext("cloudsqlconn",
// 		func(ctx context.Context, _ string) (net.Conn, error) {
// 			return d.Dial(ctx, instanceConnectionName, opts...)
// 		})

// 	dbURI := fmt.Sprintf("%s:%s@cloudsqlconn(localhost:3306)/%s?parseTime=true",
// 		dbUser, dbPwd, dbName)

// 	dbPool, err := sql.Open("mysql", dbURI)
// 	if err != nil {
// 		return nil, fmt.Errorf("connectWithConnector: failed to open sql: %w", err)
// 	}
// 	return dbPool, nil
// }
