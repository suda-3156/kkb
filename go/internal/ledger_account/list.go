package ledgeraccount

import (
	"context"
	"fmt"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/ledgeraccount"
	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/logging"
	"github.com/suda-3156/kkb/go/internal/pulid"
)

type Filter struct {
	PublicIDs []pulid.ID
	// IDs is used for dataloader
	IDs []int

	First  *int32
	After  *pulid.ID
	Last   *int32
	Before *pulid.ID

	Kind            *graph.LedgerAccountKind
	IncludeArchived *bool
}

func (m *LedgerAccountManager) List(
	ctx context.Context,
	filter *Filter,
) (*graph.LedgerAccountConnection, error) {
	logging.Debug(
		ctx,
		"ledger account - list called",
	)

	var scanDesc bool
	query := m.db.Client.LedgerAccount.Query().WithEncryptionKey()

	query, scanDesc = m.applyFilter(filter, query)

	lacs, err := query.All(ctx)
	if err != nil {
		return nil, fmt.Errorf("list: query: %w", err)
	}

	hasPrevPage, hasNextPage, err := m.getPageInfo(ctx, lacs, scanDesc)
	if err != nil {
		return nil, fmt.Errorf("list: page info: %w", err)
	}

	return m.convertToGraphConnection(ctx, lacs, hasPrevPage, hasNextPage)
}

func (m *LedgerAccountManager) applyFilter(
	filter *Filter,
	query *ent.LedgerAccountQuery,
) (*ent.LedgerAccountQuery, bool) {
	var scanDesc = false

	if len(filter.PublicIDs) > 0 {
		query = query.Where(ledgeraccount.PublicIDIn(filter.PublicIDs...))
	}

	if len(filter.IDs) > 0 {
		query = query.Where(ledgeraccount.IDIn(filter.IDs...))
	}

	if filter.After != nil {
		query = query.Where(ledgeraccount.PublicIDGT(*filter.After))
	}

	if filter.Before != nil {
		query = query.Where(ledgeraccount.PublicIDLT(*filter.Before))
		scanDesc = true
	}

	if filter.First != nil {
		query = query.Limit(int(*filter.First))
	}

	if filter.Last != nil {
		query = query.Limit(int(*filter.Last))
		scanDesc = true
	}

	if scanDesc {
		query = query.Order(ent.Desc(ledgeraccount.FieldPublicID))
	} else {
		query = query.Order(ent.Asc(ledgeraccount.FieldPublicID))
	}

	if filter.Kind != nil {
		query = query.Where(ledgeraccount.KindEQ(m.convertKindToEnt(*filter.Kind)))
	}

	if filter.IncludeArchived == nil || !*filter.IncludeArchived {
		query = query.Where(ledgeraccount.ArchivedAtIsNil())
	}

	return query, scanDesc
}

func (m *LedgerAccountManager) getPageInfo(
	ctx context.Context,
	lacs []*ent.LedgerAccount,
	scanDesc bool,
) (hasPrevPage, hasNextPage bool, err error) {
	if len(lacs) > 0 {
		if scanDesc {
			for i, j := 0, len(lacs)-1; i < j; i, j = i+1, j-1 {
				lacs[i], lacs[j] = lacs[j], lacs[i]
			}
		}

		startCursor := lacs[0].PublicID
		endCursor := lacs[len(lacs)-1].PublicID

		var err error
		hasPrevPage, err = m.db.Client.LedgerAccount.Query().
			Where(
				ledgeraccount.PublicIDLT(startCursor),
			).Exist(ctx)
		if err != nil {
			return false, false, fmt.Errorf("list: check hasPreviousPage: %w", err)
		}

		hasNextPage, err = m.db.Client.LedgerAccount.Query().
			Where(
				ledgeraccount.PublicIDGT(endCursor),
			).Exist(ctx)
		if err != nil {
			return false, false, fmt.Errorf("list: check hasNextPage: %w", err)
		}
	}

	return hasPrevPage, hasNextPage, nil
}
