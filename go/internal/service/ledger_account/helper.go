package ledgeraccount

import (
	"context"
	"time"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/schema"
	graph "github.com/suda-3156/kkb/go/graph/model"
	apperr "github.com/suda-3156/kkb/go/pkg/error"
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

func (s *Service) decryptArchivedAt(ctx context.Context, archivedAt []byte) (*time.Time, error) {
	var decrypted time.Time

	if archivedAt != nil {
		str, err := s.kms.Decrypt(ctx, archivedAt)
		if err != nil {
			return nil, apperr.NewInternalServerError(err)
		}
		decrypted, err = time.Parse(time.RFC3339, str)
		if err != nil {
			return nil, apperr.NewInternalServerError(err)
		}
	}

	return &decrypted, nil
}

func (s *Service) convertToGraph(
	ctx context.Context,
	lac *ent.LedgerAccount,
) (*graph.LedgerAccount, error) {
	decryptedName, err := s.kms.Decrypt(ctx, lac.AccountName)
	if err != nil {
		return nil, apperr.NewInternalServerError(err)
	}

	decryptedArchivedAt, err := s.decryptArchivedAt(ctx, lac.ArchivedAt)
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

func (s *Service) convertToGraphConnection(
	ctx context.Context,
	lacs []*ent.LedgerAccount,
	hasPrevPage bool,
	hasNextPage bool,
) (*graph.LedgerAccountConnection, error) {
	result := &graph.LedgerAccountConnection{}

	for _, lac := range lacs {
		converted, err := s.convertToGraph(ctx, lac)
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
