package aggregation

import (
	"context"
	"fmt"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/journalentry"
	"github.com/suda-3156/kkb/go/ent/ledgeraccount"
	ents "github.com/suda-3156/kkb/go/ent/schema"
	"github.com/suda-3156/kkb/go/ent/transaction"
	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/date"
	"github.com/suda-3156/kkb/go/internal/prid"
)

func (m *AggregationManager) GetChildAccountBreakdown(
	ctx context.Context,
	parentPublicID prid.ID,
	startDate date.Date,
	endDate date.Date,
) (*graph.ChildAccountBreakdown, error) {
	// Fetch the parent account with its direct children and encryption keys.
	parent, err := m.db.Client.LedgerAccount.Query().
		Where(ledgeraccount.PublicID(parentPublicID)).
		WithChildren(func(q *ent.LedgerAccountQuery) {
			q.WithEncryptionKey()
		}).
		WithEncryptionKey().
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, ErrAccountNotFound
		}
		return nil, fmt.Errorf("child account breakdown: fetch parent: %w", err)
	}

	parentGraph, err := m.convertLedgerAccountToGraph(ctx, parent)
	if err != nil {
		return nil, fmt.Errorf("child account breakdown: convert parent: %w", err)
	}

	if len(parent.Edges.Children) == 0 {
		return &graph.ChildAccountBreakdown{
			Parent:      parentGraph,
			StartDate:   startDate,
			EndDate:     endDate,
			TotalAmount: 0,
			Children:    []*graph.AccountAmountSummary{},
		}, nil
	}

	// Build child ID list and the kinds the arithmetic keys off.
	childIDs := make([]int, len(parent.Edges.Children))
	childKinds := make([]accountKind, len(parent.Edges.Children))
	for i, child := range parent.Edges.Children {
		childIDs[i] = child.ID
		childKinds[i] = accountKind{id: child.ID, kind: child.Kind}
	}

	// Sum journal entries per child account in the date range.
	var rows []lacAmountRow
	err = m.db.Client.JournalEntry.Query().
		Where(
			journalentry.HasLedgerAccountWith(ledgeraccount.IDIn(childIDs...)),
			journalentry.HasTransactionWith(
				transaction.DateGTE(startDate),
				transaction.DateLTE(endDate),
			),
		).
		GroupBy(journalentry.LedgerAccountColumn, journalentry.FieldKind).
		Aggregate(ent.Sum(journalentry.FieldAmount)).
		Scan(ctx, &rows)
	if err != nil {
		return nil, fmt.Errorf("child account breakdown: aggregate entries: %w", err)
	}

	childAmounts, totalAmount := foldChildBreakdown(childKinds, rows)

	// Build the children summary, preserving order of parent.Edges.Children.
	children := make([]*graph.AccountAmountSummary, 0, len(parent.Edges.Children))
	for _, child := range parent.Edges.Children {
		children = append(children, &graph.AccountAmountSummary{
			LedgerAccount: &graph.LedgerAccount{IntID: child.ID},
			TotalAmount:   childAmounts[child.ID],
			Ratio:         ratio(childAmounts[child.ID], totalAmount),
		})
	}

	return &graph.ChildAccountBreakdown{
		Parent:      parentGraph,
		StartDate:   startDate,
		EndDate:     endDate,
		TotalAmount: totalAmount,
		Children:    children,
	}, nil
}

// foldChildBreakdown computes the signed amount of every child account in the
// period and their total. Rows of an account that is not a child of the parent
// are ignored.
func foldChildBreakdown(
	children []accountKind,
	rows []lacAmountRow,
) (amounts map[int]int32, total int32) {
	kinds := make(map[int]ents.LedgerAccountKind, len(children))
	for _, child := range children {
		kinds[child.id] = child.kind
	}

	amounts = make(map[int]int32, len(children))
	for _, row := range rows {
		kind, ok := kinds[row.LedgerAccountID]
		if !ok {
			continue
		}
		amount := signedAmount(kind, row.Kind, row.Sum)
		amounts[row.LedgerAccountID] += amount
		total += amount
	}

	return amounts, total
}
