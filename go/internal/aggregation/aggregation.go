package aggregation

import (
	"context"
	"fmt"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/schema"
	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/encryption"
	"github.com/suda-3156/kkb/go/internal/infrastructure/database"
)

type AggregationManager struct {
	db *database.DB
	em *encryption.EncryptionManager
}

func New(db *database.DB, em *encryption.EncryptionManager) *AggregationManager {
	return &AggregationManager{db: db, em: em}
}

func (m *AggregationManager) convertLedgerAccountToGraph(ctx context.Context, lac *ent.LedgerAccount) (*graph.LedgerAccount, error) {
	if lac.Edges.EncryptionKey == nil {
		return nil, fmt.Errorf("convertLedgerAccountToGraph: encryption key not loaded for account %d", lac.ID)
	}
	name, err := m.em.Decrypt(ctx, lac.AccountName, lac.Edges.EncryptionKey.ID)
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
