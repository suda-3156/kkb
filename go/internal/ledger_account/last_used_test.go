package ledgeraccount

import (
	"context"
	"errors"
	"regexp"
	"strings"
	"testing"
	"time"

	"entgo.io/ent/dialect"
	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/internal/date"
	"github.com/suda-3156/kkb/go/internal/infrastructure/database"
)

// errCaptured stops the query right after the SQL has been built. The tests
// below are about the SQL text, not about rows coming back.
var errCaptured = errors.New("captured")

// captureDriver records the statement ent produces instead of running it. The
// aggregation joins transactions through an escape hatch that ent cannot
// type-check, so the shape of the statement is worth asserting on directly -
// and doing it this way keeps the test runnable without a database.
type captureDriver struct {
	dialect.Driver
	query string
	args  []any
}

func (d *captureDriver) Query(_ context.Context, query string, args, _ any) error {
	d.query = query
	if a, ok := args.([]any); ok {
		d.args = a
	}
	return errCaptured
}

func (*captureDriver) Dialect() string { return dialect.MySQL }

func managerWithCapture(t *testing.T) (*LedgerAccountManager, *captureDriver) {
	t.Helper()

	drv := &captureDriver{}
	return &LedgerAccountManager{
		db: &database.DB{Client: ent.NewClient(ent.Driver(drv))},
	}, drv
}

func TestLastUsedByIDs_Query(t *testing.T) {
	m, drv := managerWithCapture(t)

	_, err := m.LastUsedByIDs(context.Background(), []int{7, 9})
	if !errors.Is(err, errCaptured) {
		t.Fatalf("LastUsedByIDs() error = %v, want the capture sentinel", err)
	}

	query := drv.query

	// One statement, one join, one grouping: this is what keeps the account
	// picker from aggregating once per account.
	if got := strings.Count(query, "JOIN"); got != 1 {
		t.Errorf("query has %d JOINs, want 1:\n%s", got, query)
	}

	// ent aliases the joined table, so the alias is read out of the statement
	// rather than hard-coded; only the two sides matching matters.
	join := regexp.MustCompile(
		"JOIN `transactions` AS `(\\w+)` ON `journal_entries`\\.`transaction_entries` = `(\\w+)`\\.`id`",
	).FindStringSubmatch(query)
	if len(join) != 3 || join[1] != join[2] {
		t.Fatalf("join does not connect entries to transactions:\n%s", query)
	}
	txns := join[1]

	// Both sort keys have to come from the same statement.
	if !strings.Contains(query, "MAX(`"+txns+"`.`date`) AS `last_used_at`") {
		t.Errorf("query does not aggregate the transaction date:\n%s", query)
	}
	if !strings.Contains(query, "MAX(`"+txns+"`.`created_at`) AS `last_recorded_at`") {
		t.Errorf("query does not aggregate the recorded time:\n%s", query)
	}

	if !strings.Contains(query, "GROUP BY `journal_entries`.`ledger_account_journal_entries`") {
		t.Errorf("query does not group per ledger account:\n%s", query)
	}

	// The requested accounts have to reach the statement as bound parameters.
	if len(drv.args) != 2 || drv.args[0] != 7 || drv.args[1] != 9 {
		t.Errorf("query args = %v, want the requested account IDs", drv.args)
	}
}

func TestLastUsedByIDs_NoIDs(t *testing.T) {
	m, drv := managerWithCapture(t)

	got, err := m.LastUsedByIDs(context.Background(), nil)
	if err != nil {
		t.Fatalf("LastUsedByIDs() unexpected error: %v", err)
	}
	if len(got) != 0 {
		t.Errorf("LastUsedByIDs() = %v, want empty", got)
	}
	// An empty ID list must not reach the database: `IN ()` is a syntax error.
	if drv.query != "" {
		t.Errorf("LastUsedByIDs() queried the database for no IDs:\n%s", drv.query)
	}
}

func TestFoldLastUsed(t *testing.T) {
	recorded := time.Date(2026, 8, 6, 21, 30, 0, 0, time.UTC)

	got := foldLastUsed([]lastUsedRow{
		{LedgerAccountID: 7, LastUsedAt: "2026-08-01", LastRecordedAt: recorded},
	})

	want := LastUsed{Date: date.Date("2026-08-01"), RecordedAt: recorded}
	if got[7] != want {
		t.Errorf("foldLastUsed()[7] = %+v, want %+v", got[7], want)
	}

	// Accounts without transactions are absent rather than zero-valued, so the
	// resolver can tell "never used" from "used on the zero date".
	if _, ok := got[8]; ok {
		t.Errorf("foldLastUsed() invented an entry for an unused account")
	}
}
