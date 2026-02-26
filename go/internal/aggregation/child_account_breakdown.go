package aggregation

import (
	"context"
	"fmt"
	"strconv"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/journalentry"
	"github.com/suda-3156/kkb/go/ent/ledgeraccount"
	"github.com/suda-3156/kkb/go/ent/transaction"
	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/date"
	"github.com/suda-3156/kkb/go/internal/logging"
	"github.com/suda-3156/kkb/go/internal/pulid"
)

// ChildAccountBreakdown returns the amount and ratio for each direct child of the
// specified parent account within the given date range.
func (m *AggregationManager) ChildAccountBreakdown(
	ctx context.Context,
	parentID pulid.ID,
	startDate date.Date,
	endDate date.Date,
) (*graph.ChildAccountBreakdown, error) {
	logging.Debug(ctx, "aggregation - child account breakdown called")

	// Fetch parent account.
	parent, err := m.db.Client.LedgerAccount.Query().
		Where(ledgeraccount.PublicID(parentID)).
		WithEncryptionKey().
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, ErrParentAccountNotFound
		}
		return nil, fmt.Errorf("child account breakdown: get parent: %w", err)
	}

	// Fetch all journal entries whose ledger account is a direct child of the parent
	// and whose transaction falls within the date range.
	entries, err := m.db.Client.JournalEntry.Query().
		Where(
			journalentry.HasLedgerAccountWith(
				ledgeraccount.HasParentWith(ledgeraccount.PublicID(parentID)),
			),
			journalentry.HasTransactionWith(
				transaction.DateGTE(startDate),
				transaction.DateLTE(endDate),
			),
		).
		WithLedgerAccount(func(lq *ent.LedgerAccountQuery) {
			lq.WithEncryptionKey()
		}).
		WithTransaction(func(tq *ent.TransactionQuery) {
			tq.WithEncryptionKey()
		}).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("child account breakdown: query entries: %w", err)
	}

	// Accumulate amounts per child account.
	byAccount := map[int]*accountAgg{}
	for _, entry := range entries {
		if entry.Edges.LedgerAccount == nil ||
			entry.Edges.Transaction == nil ||
			entry.Edges.Transaction.Edges.EncryptionKey == nil {
			continue
		}

		lac := entry.Edges.LedgerAccount
		keyID := entry.Edges.Transaction.Edges.EncryptionKey.ID

		amountStr, err := m.em.Decrypt(ctx, entry.Amount, keyID)
		if err != nil {
			return nil, fmt.Errorf("child account breakdown: decrypt amount: %w", err)
		}
		amount, err := strconv.ParseInt(amountStr, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("child account breakdown: parse amount: %w", err)
		}

		if agg, ok := byAccount[lac.ID]; ok {
			agg.totalAmount += amount
		} else {
			byAccount[lac.ID] = &accountAgg{entAccount: lac, totalAmount: amount}
		}
	}

	children, total, err := m.buildAccountAmountSummaries(ctx, byAccount)
	if err != nil {
		return nil, fmt.Errorf("child account breakdown: build summaries: %w", err)
	}

	parentGraph, err := m.convertLedgerAccountToGraph(ctx, parent)
	if err != nil {
		return nil, fmt.Errorf("child account breakdown: convert parent: %w", err)
	}

	return &graph.ChildAccountBreakdown{
		Parent:      parentGraph,
		StartDate:   startDate,
		EndDate:     endDate,
		TotalAmount: int32(total), //nolint:gosec
		Children:    children,
	}, nil
}
