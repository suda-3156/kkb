package ledgeraccount

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/ledgeraccount"
	"github.com/suda-3156/kkb/go/ent/schema"
	"github.com/suda-3156/kkb/go/ent/subscription"
	"github.com/suda-3156/kkb/go/ent/subscriptionentry"
	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/logging"
	"github.com/suda-3156/kkb/go/internal/prid"
)

// Archive archives a ledger account and all its descendant accounts.
func (m *LedgerAccountManager) Archive(
	ctx context.Context,
	id prid.ID,
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
		return nil, fmt.Errorf("archive: %w", err)
	}

	return account, nil
}

func (m *LedgerAccountManager) archiveTx(
	ctx context.Context,
	client *ent.Client,
	id prid.ID,
) (*graph.LedgerAccount, error) {
	// Get the account to archive.
	account, err := client.LedgerAccount.Query().
		Where(ledgeraccount.PublicID(id)).
		WithEncryptionKey().
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, ErrAccountNotFound
		}
		return nil, fmt.Errorf("archive: query account: %w", err)
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

	// A running subscription materializes transactions from its template
	// entries, and transaction creation refuses archived accounts: archiving a
	// referenced account would make the daily job fail. CANCELED subscriptions
	// don't block (the account would otherwise be unarchivable forever); if
	// one is uncanceled later, the materialization failure is isolated per
	// subscription and surfaces through the job alert.
	inUse, err := client.SubscriptionEntry.Query().
		Where(
			subscriptionentry.HasLedgerAccountWith(ledgeraccount.IDIn(allIDs...)),
			subscriptionentry.HasSubscriptionWith(
				subscription.StatusIn(schema.Active, schema.Paused),
			),
		).
		Exist(ctx)
	if err != nil {
		return nil, fmt.Errorf("archive: query subscription entries: %w", err)
	}
	if inUse {
		return nil, ErrAccountUsedBySubscription
	}

	_, err = client.LedgerAccount.Update().
		Where(ledgeraccount.IDIn(allIDs...)).
		SetArchivedAt(now).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("archive: bulk update: %w", err)
	}

	// Reload the account to get updated data (with EncryptionKey edge for convertToGraph)
	account, err = client.LedgerAccount.Query().
		Where(ledgeraccount.ID(account.ID)).
		WithEncryptionKey().
		Only(ctx)
	if err != nil {
		return nil, fmt.Errorf("archive: reload after update: %w", err)
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
			return nil, fmt.Errorf("archive: query children of id=%d: %w", currentID, err)
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
