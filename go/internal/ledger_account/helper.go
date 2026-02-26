package ledgeraccount

import (
	"context"
	"fmt"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/schema"
	graph "github.com/suda-3156/kkb/go/graph/model"
)

func (m *LedgerAccountManager) convertKindToEnt(kind graph.LedgerAccountKind) schema.LedgerAccountKind {
	switch kind {
	case graph.LedgerAccountKindAsset:
		return schema.Asset
	case graph.LedgerAccountKindLiability:
		return schema.Liability
	case graph.LedgerAccountKindExpense:
		return schema.Expense
	case graph.LedgerAccountKindRevenue:
		return schema.Revenue
	case graph.LedgerAccountKindEquity:
		return schema.Equity
	default:
		panic("invalid ledger account kind")
	}
}

func (m *LedgerAccountManager) convertKindToGraph(kind schema.LedgerAccountKind) graph.LedgerAccountKind {
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

func (m *LedgerAccountManager) convertToGraph(ctx context.Context, lac *ent.LedgerAccount) (*graph.LedgerAccount, error) {
	keyID := lac.Edges.EncryptionKey.ID
	if keyID == 0 {
		panic("encryption key not loaded for ledger account")
	}

	name, err := m.em.Decrypt(ctx, lac.AccountName, keyID)
	if err != nil {
		return nil, fmt.Errorf("convertToGraph: decrypt name: %w", err)
	}

	var parent *graph.LedgerAccount
	if lac.Edges.Parent != nil {
		parent = &graph.LedgerAccount{
			IntID: lac.Edges.Parent.ID,
		}
	}

	return &graph.LedgerAccount{
		IntID:      lac.ID,
		ID:         lac.PublicID,
		Parent:     parent,
		Name:       name,
		Kind:       m.convertKindToGraph(lac.Kind),
		IsGroup:    lac.IsGroup,
		ArchivedAt: lac.ArchivedAt,
		CreatedAt:  lac.CreatedAt,
		UpdatedAt:  lac.UpdatedAt,
	}, nil
}

func (m *LedgerAccountManager) convertToGraphConnection(
	ctx context.Context,
	lacs []*ent.LedgerAccount,
	hasPrevPage bool,
	hasNextPage bool,
) (*graph.LedgerAccountConnection, error) {
	result := &graph.LedgerAccountConnection{}

	for _, lac := range lacs {
		converted, err := m.convertToGraph(ctx, lac)
		if err != nil {
			return nil, err
		}
		result.Nodes = append(result.Nodes, converted)
	}

	result.TotalCount = int32(len(result.Nodes)) //nolint:gosec // TODO: Consider integer overflow

	result.PageInfo = &graph.PageInfo{}
	if result.TotalCount > 0 {
		result.PageInfo.StartCursor = &result.Nodes[0].ID
		result.PageInfo.EndCursor = &result.Nodes[result.TotalCount-1].ID
	}

	result.PageInfo.HasPreviousPage = hasPrevPage
	result.PageInfo.HasNextPage = hasNextPage

	return result, nil
}
