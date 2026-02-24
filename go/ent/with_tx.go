// References:
//   https://entgo.io/ja/docs/transactions/
//   https://zenn.dev/spiegel/books/a-study-in-postgresql/viewer/crud-with-ent
//   https://zenn.dev/cloud_ace/articles/transaction-architecture

// Place this file in the ent directory
/* Example:
func createUser(
	ctx context.Context,
	client *ent.Client,
	name []byte,
) (*ent.User, error) {
	var created *ent.User
	if err := client.WithTx(ctx, func(ctx context.Context, client *ent.Client) error {
		var err error
		created, err = client.User.Query().
			Where(user.Name(name)).
			WithEncryptionKey().
			WithParent().
			ForUpdate(entsql.WithLockAction(entsql.NoWait)).
			Only(ctx)

		if err != nil {
			if ent.IsLockNoWaitError(err) {
				return nil, apperr.NewConflictError(
					fmt.Errorf("ledger account is currently being modified, please try again"),
				)
			}
			if ent.IsNotFound(err) {
				return nil, apperr.NewNotFoundError(
					fmt.Errorf("ledger account not found"),
				)
			}

			return apperr.NewInternalServerError(err)
		}

		return nil
	}); err != nil {
		return nil, err
	}
	return created, nil
}
*/

package ent

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/go-sql-driver/mysql"
)

func (c *Client) WithTx(ctx context.Context, fn func(ctx context.Context, client *Client) error) error {
	tx, err := c.BeginTx(ctx, &sql.TxOptions{
		Isolation: sql.LevelReadCommitted,
	})
	if err != nil {
		return err
	}
	defer func() {
		if v := recover(); v != nil {
			tx.Rollback()
			panic(v)
		}
	}()

	if err := fn(ctx, tx.Client()); err != nil {
		if rerr := tx.Rollback(); rerr != nil {
			return fmt.Errorf("running transaction: %w: rolling back transaction: %v", err, rerr)
		}
		return fmt.Errorf("running transaction: %w (rollback succeeded)", err)
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("committing transaction: %w", err)
	}
	return nil
}

// IsLockNoWaitError returns true if the error is a MySQL NOWAIT lock error (ER_LOCK_NOWAIT).
// This occurs when a SELECT FOR UPDATE NOWAIT cannot acquire a lock immediately.
func IsLockNoWaitError(err error) bool {
	var mysqlErr *mysql.MySQLError
	if errors.As(err, &mysqlErr) {
		return mysqlErr.Number == 3572 // ER_LOCK_NOWAIT
	}
	return false
}
