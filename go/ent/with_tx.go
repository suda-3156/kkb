// References:
//   https://entgo.io/ja/docs/transactions/
//   https://zenn.dev/spiegel/books/a-study-in-postgresql/viewer/crud-with-ent
//   https://zenn.dev/cloud_ace/articles/transaction-architecture#%E3%83%88%E3%83%A9%E3%83%B3%E3%82%B6%E3%82%AF%E3%82%B7%E3%83%A7%E3%83%B3%E3%81%AB%E3%81%8A%E3%81%91%E3%82%8B%E5%90%84%E3%83%AC%E3%82%A4%E3%83%A4%E3%83%BC%E3%81%AE%E9%96%A2%E5%BF%83%E4%BA%8B

// Usage: place this file in the ent/ directory
/* Example:
type userRepository struct {
	client *ent.Client
}

func (r *userRepository) FindUserByID(ctx context.Context, ID int) (*ent.User, error) {
	client := r.client

	tx := r.client.TxFromCtx(ctx)
	if tx != nil {
		client = tx.Client()
	}

	u, err := client.User.Query().
		Where(entUser.ID(ID)).
		Only(ctx)
	if err != nil {
		return nil, err
	}

	return u, nil
}
*/

package ent

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/avast/retry-go"
)

func (c *Client) WithTx(ctx context.Context, fn func(ctx context.Context) error) error {
	tx, err := c.BeginTx(ctx, &sql.TxOptions{
		Isolation: sql.LevelSerializable,
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

	ctx = context.WithValue(ctx, ctxTxKey{}, tx)

	if err := fn(ctx); err != nil {
		if rerr := tx.Rollback(); rerr != nil {
			err = fmt.Errorf("%w: rolling back transaction: %v", err, rerr)
		}
		return fmt.Errorf("running transaction: %w (rollback succeeded)", err)
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("committing transaction: %w", err)
	}
	return nil
}

func (c *Client) retry(ctx context.Context, fn func(ctx context.Context) error) error {
	return retry.Do(
		// 引数に格納されたfn関数を実行
		func() error {
			if err := fn(ctx); err != nil {
				return err
			}
			return nil
		},
		// 最大4回試行する
		retry.Attempts(4),
		// リトライする条件を指定
		retry.RetryIf(func(err error) bool {
			return shouldRetry(errors.Unwrap(err))
		}),
		// 最後の処理のみのエラーを出力する
		retry.LastErrorOnly(true),
		// 指数バックオフ形式で再試行間隔を調節
		retry.Delay(200*time.Millisecond),
		retry.DelayType(retry.BackOffDelay),
	)
}

func (c *Client) WithTxRetry(ctx context.Context, fn func(ctx context.Context) error) error {
	if err := c.retry(ctx, func(ctx context.Context) error {
		return c.WithTx(ctx, fn)
	}); err != nil {
		return err

	}
	return nil
}

func shouldRetry(err error) bool {
	return !IsValidationError(err) &&
		!IsConstraintError(err) &&
		!IsNotFound(err) &&
		!IsNotSingular(err) &&
		!IsNotLoaded(err)
}

type ctxTxKey struct{}

func (c *Client) TxFromCtx(ctx context.Context) *Tx {
	tx, ok := ctx.Value(ctxTxKey{}).(*Tx)
	if !ok {
		return nil
	}
	return tx
}
