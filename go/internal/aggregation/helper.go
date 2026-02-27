package aggregation

import (
	"context"
	"fmt"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/schema"
	graph "github.com/suda-3156/kkb/go/graph/model"
)

func (m *AggregationManager) convertLedgerAccountToGraph(ctx context.Context, lac *ent.LedgerAccount) (*graph.LedgerAccount, error) {
	if lac.Edges.EncryptionKey == nil {
		return nil, fmt.Errorf("encryption key not loaded for ledger account %d", lac.ID)
	}

	keyID := lac.Edges.EncryptionKey.ID

	name, err := m.em.Decrypt(ctx, lac.AccountName, keyID)
	if err != nil {
		return nil, fmt.Errorf("convertLedgerAccountToGraph: decrypt name: %w", err)
	}

	return &graph.LedgerAccount{
		IntID:      lac.ID,
		ID:         lac.PublicID,
		Name:       name,
		Kind:       convertKindToGraph(lac.Kind),
		IsGroup:    lac.IsGroup,
		ArchivedAt: lac.ArchivedAt,
		CreatedAt:  lac.CreatedAt,
		UpdatedAt:  lac.UpdatedAt,
	}, nil
}

func convertKindToGraph(kind schema.LedgerAccountKind) graph.LedgerAccountKind {
	switch kind {
	case schema.Asset:
		return graph.LedgerAccountKindAsset
	case schema.Liability:
		return graph.LedgerAccountKindLiability
	case schema.Expense:
		return graph.LedgerAccountKindExpense
	case schema.Revenue:
		return graph.LedgerAccountKindRevenue
	case schema.Equity:
		return graph.LedgerAccountKindEquity
	default:
		panic("invalid ledger account kind")
	}
}
