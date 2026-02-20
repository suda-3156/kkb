package ledgeraccount

import (
	"context"
	"log/slog"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/ledgeraccount"
	graph "github.com/suda-3156/kkb/go/graph/model"
	apperr "github.com/suda-3156/kkb/go/pkg/error"
	"github.com/suda-3156/kkb/go/pkg/pulid"
)

func (u *UseCase) List(
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
	slog.InfoContext(
		ctx,
		"Ledger Account UseCase - List: started",
	)

	var scanDesc bool = false
	query := u.db.LedgerAccount.Query()

	query, scanDesc = applyConditions(
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
		return nil, apperr.NewInternalServerError(err)
	}

	hasPrevPage, hasNextPage, err := u.getPageInfo(ctx, lacs, scanDesc)
	if err != nil {
		return nil, apperr.NewInternalServerError(err)
	}

	slog.InfoContext(
		ctx,
		"Ledger Account UseCase - List: completed",
		slog.Int("count", len(lacs)),
	)

	return u.convertToGraphConnection(ctx, lacs, hasPrevPage, hasNextPage)
}

func applyConditions(
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
		query = query.Where(ledgeraccount.KindEQ(convertKindToEnt(*kind)))
	}

	if includeArchived == nil || !*includeArchived {
		query = query.Where(ledgeraccount.ArchivedAtIsNil())
	}

	return query, scanDesc
}

func (u *UseCase) getPageInfo(
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
		hasPrevPage, err = u.db.LedgerAccount.Query().
			Where(
				ledgeraccount.PublicIDLT(startCursor),
			).Exist(ctx)
		if err != nil {
			return false, false, apperr.NewInternalServerError(err)
		}

		hasNextPage, err = u.db.LedgerAccount.Query().
			Where(
				ledgeraccount.PublicIDGT(endCursor),
			).Exist(ctx)
		if err != nil {
			return false, false, apperr.NewInternalServerError(err)
		}
	}

	return hasPrevPage, hasNextPage, nil
}
