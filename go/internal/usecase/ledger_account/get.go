package ledgeraccount

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/ledgeraccount"
	graph "github.com/suda-3156/kkb/go/graph/model"
	apperr "github.com/suda-3156/kkb/go/pkg/error"
	"github.com/suda-3156/kkb/go/pkg/pulid"
)

func (u *UseCase) Get(
	ctx context.Context,
	publicID *pulid.ID,
	ID *int,
) (*graph.LedgerAccount, error) {
	slog.InfoContext(
		ctx,
		"Ledger Account UseCase - Get: started",
		slog.String("public_id", func() string {
			if publicID != nil {
				return publicID.String()
			}
			return "nil"
		}()),
		slog.Int("id", func() int {
			if ID != nil {
				return *ID
			}
			return 0
		}()),
	)

	if publicID == nil && ID == nil {
		return nil, apperr.NewBadRequestError(
			fmt.Errorf("either publicID or ID is required"),
		)
	}

	// Get the account from the database.
	query := u.db.LedgerAccount.Query()
	if publicID != nil {
		query = query.Where(ledgeraccount.PublicID(*publicID))
	}

	if ID != nil {
		query = query.Where(ledgeraccount.ID(*ID))
	}

	account, err := query.Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, apperr.NewNotFoundError(
				fmt.Errorf("ledger account not found: %w", err),
			)
		}

		return nil, apperr.NewInternalServerError(err)
	}

	slog.InfoContext(
		ctx,
		"Ledger Account UseCase - Get: completed",
		slog.String("public_id", func() string {
			if publicID != nil {
				return publicID.String()
			}
			return "nil"
		}()),
		slog.Int("id", func() int {
			if ID != nil {
				return *ID
			}
			return 0
		}()),
	)

	return u.convertToGraph(ctx, account)
}
