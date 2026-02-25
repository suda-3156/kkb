package transaction

import (
	"context"
	"fmt"
	"strconv"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/schema"
	graph "github.com/suda-3156/kkb/go/graph/model"
)

func (m *TransactionManager) convertKindToEnt(kind graph.JournalEntryKind) schema.JournalEntryKind {
	switch kind {
	case graph.JournalEntryKindDebit:
		return schema.Debit
	case graph.JournalEntryKindCredit:
		return schema.Credit
	default:
		panic("invalid journal entry kind")
	}
}

func (m *TransactionManager) convertKindToGraph(kind schema.JournalEntryKind) graph.JournalEntryKind {
	switch kind {
	case schema.Debit:
		return graph.JournalEntryKindDebit
	case schema.Credit:
		return graph.JournalEntryKindCredit
	default:
		panic("invalid journal entry kind")
	}
}

func (m *TransactionManager) convertEntryToGraph(ctx context.Context, entry *ent.JournalEntry, keyID int) (*graph.JournalEntry, error) {
	amountStr, err := m.em.Decrypt(ctx, entry.Amount, keyID)
	if err != nil {
		return nil, fmt.Errorf("convertEntryToGraph: decrypt amount: %w", err)
	}

	amount, err := strconv.ParseInt(amountStr, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("convertEntryToGraph: parse amount: %w", err)
	}

	var ledgerAccount *graph.LedgerAccount
	if entry.Edges.LedgerAccount != nil {
		ledgerAccount = &graph.LedgerAccount{
			IntID: entry.Edges.LedgerAccount.ID,
		}
	}

	return &graph.JournalEntry{
		ID:            entry.PublicID,
		LedgerAccount: ledgerAccount,
		Amount:        int32(amount),
		Kind:          m.convertKindToGraph(entry.Kind),
		CreatedAt:     entry.CreatedAt,
		UpdatedAt:     entry.UpdatedAt,
		IntID:         entry.ID,
	}, nil
}

func (m *TransactionManager) convertToGraph(ctx context.Context, txn *ent.Transaction) (*graph.Transaction, error) {
	if txn.Edges.EncryptionKey == nil {
		panic("encryption key not loaded for transaction")
	}

	keyID := txn.Edges.EncryptionKey.ID

	descStr, err := m.em.Decrypt(ctx, txn.Description, keyID)
	if err != nil {
		return nil, fmt.Errorf("convertToGraph: decrypt description: %w", err)
	}

	var entries []*graph.JournalEntry
	for _, entry := range txn.Edges.Entries {
		converted, err := m.convertEntryToGraph(ctx, entry, keyID)
		if err != nil {
			return nil, err
		}
		entries = append(entries, converted)
	}

	return &graph.Transaction{
		ID:          txn.PublicID,
		Entries:     entries,
		Date:        txn.Date,
		Description: descStr,
		CreatedAt:   txn.CreatedAt,
		UpdatedAt:   txn.UpdatedAt,
		IntID:       txn.ID,
	}, nil
}

func (m *TransactionManager) convertToGraphConnection(
	ctx context.Context,
	txns []*ent.Transaction,
	hasPrevPage bool,
	hasNextPage bool,
) (*graph.TransactionConnection, error) {
	result := &graph.TransactionConnection{}

	for _, txn := range txns {
		converted, err := m.convertToGraph(ctx, txn)
		if err != nil {
			return nil, err
		}
		result.Nodes = append(result.Nodes, converted)
	}

	result.TotalCount = int32(len(result.Nodes))

	result.PageInfo = &graph.PageInfo{}
	if result.TotalCount > 0 {
		result.PageInfo.StartCursor = &result.Nodes[0].ID
		result.PageInfo.EndCursor = &result.Nodes[result.TotalCount-1].ID
	}

	result.PageInfo.HasPreviousPage = hasPrevPage
	result.PageInfo.HasNextPage = hasNextPage

	return result, nil
}
