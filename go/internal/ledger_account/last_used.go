package ledgeraccount

import (
	"context"
	"fmt"
	"time"

	"entgo.io/ent/dialect/sql"
	"github.com/suda-3156/kkb/go/ent/journalentry"
	"github.com/suda-3156/kkb/go/ent/predicate"
	"github.com/suda-3156/kkb/go/ent/transaction"
	"github.com/suda-3156/kkb/go/internal/date"
	"github.com/suda-3156/kkb/go/internal/logging"
)

// LastUsed is when a ledger account was last used, as a sort key for the
// account picker.
//
// Date alone is not enough: it has day granularity, so every account used on
// the same day ties, and the ties pile up exactly where the ordering matters
// most (the accounts used today). RecordedAt breaks them.
type LastUsed struct {
	// Date is the transaction date of the most recent transaction using the
	// account.
	Date date.Date
	// RecordedAt is when that transaction was written down.
	RecordedAt time.Time
}

// lastUsedRow is one row of the aggregation. The tags name the columns as they
// come back from the query, which is how ent's scanner matches them.
type lastUsedRow struct {
	LedgerAccountID int       `json:"ledger_account_journal_entries"`
	LastUsedAt      string    `json:"last_used_at"`
	LastRecordedAt  time.Time `json:"last_recorded_at"`
}

// LastUsedByIDs returns the last use of each of the given accounts in a single
// query. Accounts that were never used are absent from the map.
//
// This runs once per batch of accounts, never once per account: it is called
// from the dataloader for exactly that reason.
func (m *LedgerAccountManager) LastUsedByIDs(
	ctx context.Context,
	ids []int,
) (map[int]LastUsed, error) {
	logging.Debug(ctx, "ledger account - last used by ids called")

	if len(ids) == 0 {
		return map[int]LastUsed{}, nil
	}

	// The dates live on transactions, so the aggregation has to join. ent has no
	// query builder for that, so the join is added to the selector from inside
	// the first aggregate function - the documented escape hatch. Both columns
	// are unique across the two tables, so nothing needs disambiguating beyond
	// the qualification below.
	txns := sql.Table(transaction.Table)

	var rows []lastUsedRow
	err := m.db.Client.JournalEntry.Query().
		Where(predicate.JournalEntry(func(s *sql.Selector) {
			s.Where(sql.InInts(s.C(journalentry.LedgerAccountColumn), ids...))
		})).
		GroupBy(journalentry.LedgerAccountColumn).
		Aggregate(
			func(s *sql.Selector) string {
				s.Join(txns).On(s.C(journalentry.TransactionColumn), txns.C(transaction.FieldID))
				return sql.As(sql.Max(txns.C(transaction.FieldDate)), "last_used_at")
			},
			func(_ *sql.Selector) string {
				return sql.As(sql.Max(txns.C(transaction.FieldCreatedAt)), "last_recorded_at")
			},
		).
		Scan(ctx, &rows)
	if err != nil {
		return nil, fmt.Errorf("last used by ids: aggregate journal entries: %w", err)
	}

	return foldLastUsed(rows), nil
}

// foldLastUsed turns the rows into a lookup keyed by ledger account ID. The
// dates come straight from the database, where they were validated on write.
func foldLastUsed(rows []lastUsedRow) map[int]LastUsed {
	result := make(map[int]LastUsed, len(rows))
	for _, row := range rows {
		result[row.LedgerAccountID] = LastUsed{
			Date:       date.Date(row.LastUsedAt),
			RecordedAt: row.LastRecordedAt,
		}
	}
	return result
}
