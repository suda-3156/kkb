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
func (s *Service) Archive(
	ctx context.Context,
	id pulid.ID,
) (*graph.LedgerAccount, error) {
	slog.InfoContext(
		ctx,
		"Ledger Account Service - Archive: started",
		slog.String("public_id", id.String()),
	)

	var account *graph.LedgerAccount
	var errTx error
	if err := s.db.WithTxRetry(ctx, func(ctx context.Context) error {
		account, errTx = s.archiveTx(ctx, id)
		return errTx
	}); err != nil {
		return nil, err
	}

	slog.InfoContext(
		ctx,
		"Ledger Account Service - Archive: completed",
		slog.String("public_id", id.String()),
	)

	return account, nil
}

func (s *Service) archiveTx(
	ctx context.Context,
	id pulid.ID,
) (*graph.LedgerAccount, error) {
	// Get client from transaction context
	client := s.db
	tx := s.db.TxFromCtx(ctx)
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
		return s.convertToGraph(ctx, account)
	}

	// Archive the account and its descendants.
	now := time.Now()
	encryptedNow, err := s.kms.Encrypt(ctx, now.Format(time.RFC3339))
	if err != nil {
		return nil, apperr.NewInternalServerError(err)
	}

	descendantIDs, err := s.collectDescendantIDs(ctx, client, account.ID)
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

	return s.convertToGraph(ctx, account)
}

// collectDescendantIDs collects all descendant account IDs using BFS (Breadth-First Search).
func (s *Service) collectDescendantIDs(
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
