package ledgeraccount

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/ledgeraccount"
	graph "github.com/suda-3156/kkb/go/graph/model"
	apperr "github.com/suda-3156/kkb/go/internal/error"
	"github.com/suda-3156/kkb/go/internal/logging"
	"github.com/suda-3156/kkb/go/internal/pulid"
)

// Archive archives a ledger account and all its descendant accounts.
func (m *LedgerAccountManager) Archive(
	ctx context.Context,
	id pulid.ID,
) (*graph.LedgerAccount, error) {
	logging.Debug(
		ctx,
		"ledger account - archive called",
		slog.String("public_id", id.String()),
	)

	var account *graph.LedgerAccount
	var errTx error
	if err := m.db.Client.WithTx(ctx, func(ctx context.Context, client *ent.Client) error {
		account, errTx = m.archiveTx(ctx, client, id)
		return errTx
	}); err != nil {
		return nil, err
	}

	return account, nil
}

func (m *LedgerAccountManager) archiveTx(
	ctx context.Context,
	client *ent.Client,
	id pulid.ID,
) (*graph.LedgerAccount, error) {
	// Get the account to archive.
	account, err := client.LedgerAccount.Query().
		Where(ledgeraccount.PublicID(id)).
		WithEncryptionKey().
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
		return m.convertToGraph(ctx, account)
	}

	// Archive the account and its descendants.
	now := time.Now()

	descendantIDs, err := m.collectDescendantIDs(ctx, client, account.ID)
	if err != nil {
		return nil, err
	}

	allIDs := append([]int{account.ID}, descendantIDs...)

	_, err = client.LedgerAccount.Update().
		Where(ledgeraccount.IDIn(allIDs...)).
		SetArchivedAt(now).
		Save(ctx)
	if err != nil {
		return nil, apperr.NewInternalServerError(err)
	}

	// Reload the account to get updated data (with EncryptionKey edge for convertToGraph)
	account, err = client.LedgerAccount.Query().
		Where(ledgeraccount.ID(account.ID)).
		WithEncryptionKey().
		Only(ctx)
	if err != nil {
		return nil, apperr.NewInternalServerError(err)
	}

	return m.convertToGraph(ctx, account)
}

// collectDescendantIDs collects all descendant account IDs using BFS (Breadth-First Search).
func (m *LedgerAccountManager) collectDescendantIDs(
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
