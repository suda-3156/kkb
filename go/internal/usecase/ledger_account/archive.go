package ledgeraccount

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/ledgeraccount"
	graph "github.com/suda-3156/kkb/go/graph/model"
	apperr "github.com/suda-3156/kkb/go/pkg/error"
	"github.com/suda-3156/kkb/go/pkg/pulid"
)

// Archive archives a ledger account and all its descendant accounts.
func (u *UseCase) Archive(
	ctx context.Context,
	id pulid.ID,
) (*graph.LedgerAccount, error) {
	slog.InfoContext(
		ctx,
		"Ledger Account UseCase - Archive: started",
	)

	var account *graph.LedgerAccount
	var errTx error
	if err := u.db.WithTxRetry(ctx, func(ctx context.Context) error {
		account, errTx = u.archiveTx(ctx, id)
		return errTx
	}); err != nil {
		return nil, err
	}

	return account, nil
}

func (u *UseCase) archiveTx(
	ctx context.Context,
	id pulid.ID,
) (*graph.LedgerAccount, error) {
	// Get client from transaction context
	client := u.db
	tx := u.db.TxFromCtx(ctx)
	if tx != nil {
		client = tx.Client()
	}

	// Get the account to archive.
	account, err := client.LedgerAccount.Query().
		Where(ledgeraccount.PublicID(id)).
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, apperr.NewNotFoundError(
				fmt.Errorf("ledger account not found"),
			)
		}
		return nil, apperr.NewInternalServerError(err)
	}

	// Check if the account is already archived.
	if account.ArchivedAt != nil {
		return u.convertToGraph(ctx, account)
	}

	// Archive the account and its descendants.
	now := time.Now()
	encryptedNow, err := u.kms.Encrypt(ctx, now.Format(time.RFC3339))
	if err != nil {
		return nil, apperr.NewInternalServerError(err)
	}

	descendantIDs, err := u.collectDescendantIDs(ctx, client, account.ID)
	if err != nil {
		return nil, err
	}

	allIDs := append([]int{account.ID}, descendantIDs...)

	_, err = client.LedgerAccount.Update().
		Where(ledgeraccount.IDIn(allIDs...)).
		SetArchivedAt(encryptedNow).
		Save(ctx)
	if err != nil {
		return nil, apperr.NewInternalServerError(err)
	}

	// Reload the account to get updated data
	account, err = client.LedgerAccount.Get(ctx, account.ID)
	if err != nil {
		return nil, apperr.NewInternalServerError(err)
	}

	return u.convertToGraph(ctx, account)
}

// collectDescendantIDs collects all descendant account IDs using BFS (Breadth-First Search).
func (u *UseCase) collectDescendantIDs(
	ctx context.Context,
	client *ent.Client,
	parentID int,
) ([]int, error) {
	var allIDs []int
	queue := []int{parentID}
	visited := make(map[int]bool)

	for len(queue) > 0 {
		currentID := queue[0]
		queue = queue[1:]

		if visited[currentID] {
			continue
		}
		visited[currentID] = true

		// Get direct children of current account
		children, err := client.LedgerAccount.Query().
			Where(ledgeraccount.HasParentWith(ledgeraccount.ID(currentID))).
			All(ctx)
		if err != nil {
			return nil, apperr.NewInternalServerError(err)
		}

		for _, child := range children {
			if !visited[child.ID] {
				allIDs = append(allIDs, child.ID)
				queue = append(queue, child.ID)
			}
		}
	}

	return allIDs, nil
}
