//go:build integration

// Package dbtest holds the tests that need a real MySQL server.
//
// Everything in this package lives in _test.go files behind the `integration`
// build tag, so `go build ./...`, `go test ./...` and `go vet ./...` skip the
// package entirely without the tag. That is what keeps `task check` free of
// Docker. Run these with `task go:test:integration`.
//
// The schema comes from db/migrations/*.sql, applied by the MySQL entrypoint,
// so these tests run against the DDL that production actually gets.
package dbtest

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"testing"
	"time"

	"github.com/suda-3156/kkb/go/internal/aggregation"
	"github.com/suda-3156/kkb/go/internal/encryption"
	"github.com/suda-3156/kkb/go/internal/infrastructure/database"
	"github.com/suda-3156/kkb/go/internal/infrastructure/keys"
	ledgeraccount "github.com/suda-3156/kkb/go/internal/ledger_account"
	"github.com/suda-3156/kkb/go/internal/logging"
	"github.com/suda-3156/kkb/go/internal/subscription"
	"github.com/suda-3156/kkb/go/internal/transaction"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/mysql"
	"gopkg.in/yaml.v3"
)

const (
	// The service in docker-compose.yml whose image these tests reuse.
	composeDBService = "db"

	dbName     = "kkb_test"
	dbUser     = "test_user"
	dbPassword = "test_password"

	// The wrapper key is created in a throwaway directory by the FILESYSTEM key
	// manager.
	wrapperKeyGroup = "system"
	wrapperKeyName  = "ledger-encryption-key"

	// Long enough that the encryption manager never refreshes mid-test.
	encryptionCacheTTL = time.Hour

	dockerProbeTimeout = 5 * time.Second
	startupTimeout     = 3 * time.Minute
)

// Shared by every test in this package. The container is started once in
// TestMain; the managers below are stateless, so sharing them is safe.
//
// Tests are NOT isolated from each other at the database level. Each test picks
// a date range of its own so that the aggregation queries cannot see rows
// written by another test.
var (
	testDB  *database.DB
	testEM  *encryption.EncryptionManager
	testLAC *ledgeraccount.LedgerAccountManager
	testTM  *transaction.TransactionManager
	testAM  *aggregation.AggregationManager
	testSM  *subscription.SubscriptionManager
)

func TestMain(m *testing.M) {
	logging.SetDefault(logging.NewFromEnv())

	// os.Exit skips deferred calls, so teardown cannot live in a defer here.
	// It belongs to run(), which returns normally.
	code, err := run(m)
	if err != nil {
		fmt.Fprintf(os.Stderr, "dbtest: %v\n", err)
		os.Exit(1)
	}

	os.Exit(code)
}

func run(m *testing.M) (int, error) {
	ctx := context.Background()

	if err := requireDocker(ctx); err != nil {
		return 0, err
	}

	image, err := mysqlImage()
	if err != nil {
		return 0, err
	}

	scripts, err := migrationScripts()
	if err != nil {
		return 0, err
	}

	startCtx, cancel := context.WithTimeout(ctx, startupTimeout)
	defer cancel()

	ctr, err := mysql.Run(startCtx, image,
		mysql.WithDatabase(dbName),
		mysql.WithUsername(dbUser),
		mysql.WithPassword(dbPassword),
		// Copied into /docker-entrypoint-initdb.d, which the MySQL entrypoint
		// runs against MYSQL_DATABASE before it reports the server ready. A
		// failing script aborts container startup, so a broken migration shows
		// up here rather than as a confusing "table doesn't exist" later.
		mysql.WithScripts(scripts...),
	)
	defer func() {
		if err := testcontainers.TerminateContainer(ctr); err != nil {
			fmt.Fprintf(os.Stderr, "dbtest: terminate container: %v\n", err)
		}
	}()
	if err != nil {
		return 0, fmt.Errorf("start mysql container: %w", err)
	}

	host, err := ctr.Host(ctx)
	if err != nil {
		return 0, fmt.Errorf("container host: %w", err)
	}

	port, err := ctr.MappedPort(ctx, "3306/tcp")
	if err != nil {
		return 0, fmt.Errorf("container port: %w", err)
	}

	testDB, err = database.New(ctx, &database.Config{
		Name:           dbName,
		User:           dbUser,
		Password:       dbPassword,
		ConnectionMode: "tcp",
		Host:           host,
		Port:           port.Port(),
	})
	if err != nil {
		return 0, fmt.Errorf("connect to container: %w", err)
	}
	defer func() {
		if err := testDB.Close(ctx); err != nil {
			fmt.Fprintf(os.Stderr, "dbtest: close database: %v\n", err)
		}
	}()

	keysRoot, err := os.MkdirTemp("", "kkb-dbtest-keys-")
	if err != nil {
		return 0, fmt.Errorf("create key manager root: %w", err)
	}
	defer os.RemoveAll(keysRoot)

	testEM, err = newEncryptionManager(ctx, keysRoot)
	if err != nil {
		return 0, err
	}

	testLAC = ledgeraccount.New(testDB, testEM)
	testTM = transaction.New(testDB, testEM)
	testAM = aggregation.New(testDB, testEM)
	testSM = subscription.New(testDB, testEM, testTM)

	return m.Run(), nil
}

// requireDocker fails fast when the Docker daemon is unreachable. Without it a
// missing daemon surfaces as a container start timeout minutes later.
func requireDocker(ctx context.Context) error {
	provider, err := testcontainers.ProviderDocker.GetProvider()
	if err != nil {
		return fmt.Errorf("docker is required by these tests but no provider is available: %w", err)
	}

	probeCtx, cancel := context.WithTimeout(ctx, dockerProbeTimeout)
	defer cancel()

	if err := provider.Health(probeCtx); err != nil {
		return fmt.Errorf("docker is required by these tests but the daemon is unreachable "+
			"(start Docker Desktop and retry): %w", err)
	}

	return nil
}

// repoRoot returns the repository root, resolved from this file's own location
// so that it does not depend on the directory the tests were started from.
func repoRoot() (string, error) {
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		return "", fmt.Errorf("cannot locate the dbtest package on disk")
	}

	// .../main/go/internal/dbtest/main_test.go -> .../main
	return filepath.Join(filepath.Dir(thisFile), "..", "..", ".."), nil
}

// mysqlImage reads the image from docker-compose.yml rather than pinning a
// second copy of the digest here. Renovate keeps that file current through its
// docker-compose manager, and it has no manager that can see a Go constant, so
// a constant would silently fall behind.
func mysqlImage() (string, error) {
	root, err := repoRoot()
	if err != nil {
		return "", err
	}

	path := filepath.Join(root, "docker-compose.yml")

	raw, err := os.ReadFile(path)
	if err != nil {
		return "", fmt.Errorf("read %s: %w", path, err)
	}

	var compose struct {
		Services map[string]struct {
			Image string `yaml:"image"`
		} `yaml:"services"`
	}
	if err := yaml.Unmarshal(raw, &compose); err != nil {
		return "", fmt.Errorf("parse %s: %w", path, err)
	}

	image := compose.Services[composeDBService].Image
	if image == "" {
		return "", fmt.Errorf("%s: service %q has no image", path, composeDBService)
	}

	return image, nil
}

// migrationScripts returns db/migrations/*.sql in filename order. Atlas names
// files with a fixed-width timestamp prefix, so lexical order is apply order.
// The list is globbed rather than enumerated so that new migrations are picked
// up without touching this file. atlas.sum is not a .sql file and is skipped.
func migrationScripts() ([]string, error) {
	root, err := repoRoot()
	if err != nil {
		return nil, err
	}

	dir := filepath.Join(root, "db", "migrations")

	scripts, err := filepath.Glob(filepath.Join(dir, "*.sql"))
	if err != nil {
		return nil, fmt.Errorf("glob migrations in %s: %w", dir, err)
	}
	if len(scripts) == 0 {
		return nil, fmt.Errorf("no migrations found in %s", dir)
	}

	return scripts, nil
}

// newEncryptionManager builds the encryption stack the managers need: create a
// wrapper key in the FILESYSTEM key manager, then let the encryption manager
// mint its own DEK on first refresh.
func newEncryptionManager(ctx context.Context, keysRoot string) (*encryption.EncryptionManager, error) {
	km, err := keys.NewFilesystem(ctx, &keys.Config{
		Type:           "FILESYSTEM",
		FilesystemRoot: keysRoot,
	})
	if err != nil {
		return nil, fmt.Errorf("create key manager: %w", err)
	}

	ekm, ok := km.(keys.EncryptionKeyManager)
	if !ok {
		return nil, fmt.Errorf("key manager %T is not an EncryptionKeyManager", km)
	}

	keyID, err := ekm.CreateEncryptionKey(ctx, wrapperKeyGroup, wrapperKeyName)
	if err != nil {
		return nil, fmt.Errorf("create wrapper key: %w", err)
	}

	if _, err := ekm.CreateKeyVersion(ctx, keyID); err != nil {
		return nil, fmt.Errorf("create wrapper key version: %w", err)
	}

	return encryption.New(&encryption.Config{
		Database:     testDB,
		KeyManager:   km,
		WrapperKeyID: keyID,
		CacheTTL:     encryptionCacheTTL,
		AAD:          []byte("kkb-dbtest-aad"),
	}), nil
}
