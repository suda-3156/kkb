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

	// Build child ID list and lookup map.
	childIDs := make([]int, len(parent.Edges.Children))
	childLacMap := make(map[int]*ent.LedgerAccount)
	for i, child := range parent.Edges.Children {
		childIDs[i] = child.ID
		childLacMap[child.ID] = child
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

	// Compute signed net amount per child based on account kind.
	childAmounts := make(map[int]int32)
	for _, row := range rows {
		child, ok := childLacMap[row.LedgerAccountID]
		if !ok {
			continue
		}
		amount := row.Sum
		switch child.Kind {
		case ents.Asset, ents.Expense:
			// Normal debit balance: credit reduces balance.
			if row.Kind == ents.Credit.String() {
				amount = -amount
			}
		case ents.Liability, ents.Revenue, ents.Equity:
			// Normal credit balance: debit reduces balance.
			if row.Kind == ents.Debit.String() {
				amount = -amount
			}
		}
		childAmounts[row.LedgerAccountID] += amount
	}

	var totalAmount int32
	for _, amt := range childAmounts {
		totalAmount += amt
	}

	// Build the children summary, preserving order of parent.Edges.Children.
	children := make([]*graph.AccountAmountSummary, 0, len(parent.Edges.Children))
	for _, child := range parent.Edges.Children {
		amount := childAmounts[child.ID]
		var ratio float64
		if totalAmount != 0 {
			ratio = float64(amount) / float64(totalAmount)
		}
		children = append(children, &graph.AccountAmountSummary{
			LedgerAccount: &graph.LedgerAccount{IntID: child.ID},
			TotalAmount:   amount,
			Ratio:         ratio,
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
