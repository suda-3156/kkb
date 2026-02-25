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

func (m *LedgerAccountManager) List(
	ctx context.Context,
	first *int32,
	publicIDs []pulid.ID,
	IDs []int,
	after *pulid.ID,
	last *int32,
	before *pulid.ID,
	kind *graph.LedgerAccountKind,
	includeArchived *bool,
) (*graph.LedgerAccountConnection, error) {
	logging.Debug(
		ctx,
		"ledger account - list called",
	)

	var scanDesc bool = false
	query := m.db.Client.LedgerAccount.Query().WithEncryptionKey()

	query, scanDesc = m.applyFilter(
		first,
		publicIDs,
		IDs,
		after,
		last,
		before,
		kind,
		includeArchived,
		query,
	)

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
	first *int32,
	publicIDs []pulid.ID,
	IDs []int,
	after *pulid.ID,
	last *int32,
	before *pulid.ID,
	kind *graph.LedgerAccountKind,
	includeArchived *bool,
	query *ent.LedgerAccountQuery,
) (*ent.LedgerAccountQuery, bool) {
	var scanDesc = false

	if len(publicIDs) > 0 {
		query = query.Where(ledgeraccount.PublicIDIn(publicIDs...))
	}

	if len(IDs) > 0 {
		query = query.Where(ledgeraccount.IDIn(IDs...))
	}

	if after != nil {
		query = query.Where(ledgeraccount.PublicIDGT(*after))
	}

	if before != nil {
		query = query.Where(ledgeraccount.PublicIDLT(*before))
		scanDesc = true
	}

	if first != nil {
		query = query.Limit(int(*first))
	}

	if last != nil {
		query = query.Limit(int(*last))
		scanDesc = true
	}

	if scanDesc {
		query = query.Order(ent.Desc(ledgeraccount.FieldPublicID))
	} else {
		query = query.Order(ent.Asc(ledgeraccount.FieldPublicID))
	}

	if kind != nil {
		query = query.Where(ledgeraccount.KindEQ(m.convertKindToEnt(*kind)))
	}

	if includeArchived == nil || !*includeArchived {
		query = query.Where(ledgeraccount.ArchivedAtIsNil())
	}

	return query, scanDesc
}

func (m *LedgerAccountManager) getPageInfo(
	ctx context.Context,
	lacs []*ent.LedgerAccount,
	scanDesc bool,
) (hasPrevPage bool, hasNextPage bool, err error) {
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
