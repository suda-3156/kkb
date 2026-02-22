package ledgeraccount

import (
	"context"
	"time"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/schema"
	graph "github.com/suda-3156/kkb/go/graph/model"
	apperr "github.com/suda-3156/kkb/go/internal/error"
)

func convertKindToEnt(kind graph.LedgerAccountKind) schema.LedgerAccountKind {
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

func (m *LedgerAccountManager) decryptArchivedAt(_ context.Context, archivedAt []byte) (*time.Time, error) {
	var decrypted time.Time
	var err error

	if archivedAt != nil {
		str := string(archivedAt) // TODO: implement decryption
		// if err != nil {
		// 	return nil, apperr.NewInternalServerError(err)
		// }
		decrypted, err = time.Parse(time.RFC3339, str)
		if err != nil {
			return nil, apperr.NewInternalServerError(err)
		}
	}

	return &decrypted, nil
}

func (m *LedgerAccountManager) convertToGraph(
	ctx context.Context,
	lac *ent.LedgerAccount,
) (*graph.LedgerAccount, error) {
	decryptedName := string(lac.AccountName) // TODO: implement decryption
	// if err != nil {
	// 	return nil, apperr.NewInternalServerError(err)
	// }

	decryptedArchivedAt, err := m.decryptArchivedAt(ctx, lac.ArchivedAt)
	if err != nil {
		return nil, apperr.NewInternalServerError(err)
	}

	var parent *graph.LedgerAccount
	if lac.Edges.Parent != nil {
		parent = &graph.LedgerAccount{
			IntID: lac.Edges.Parent.ID,
		}
	} else {
		parent = nil
	}

	return &graph.LedgerAccount{
		ID:         lac.PublicID,
		Parent:     parent,
		Name:       decryptedName,
		Kind:       convertKindToGraph(lac.Kind),
		IsGroup:    lac.IsGroup,
		ArchivedAt: decryptedArchivedAt,
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
