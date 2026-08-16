package transaction

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"time"

	"github.com/suda-3156/kkb/go/ent"
	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/date"
	"github.com/suda-3156/kkb/go/internal/prid"
)

const transactionCursorVersion = 1

type transactionCursor struct {
	Version   int                    `json:"v"`
	Order     graph.TransactionOrder `json:"o"`
	Date      date.Date              `json:"d,omitempty"`
	CreatedAt time.Time              `json:"c"`
	PublicID  prid.ID                `json:"i"`
}

func newTransactionCursor(txn *ent.Transaction, order graph.TransactionOrder) transactionCursor {
	cursor := transactionCursor{
		Version:   transactionCursorVersion,
		Order:     order,
		CreatedAt: txn.CreatedAt,
		PublicID:  txn.PublicID,
	}
	if order == graph.TransactionOrderTransactionDateDesc {
		cursor.Date = txn.Date
	}
	return cursor
}

func encodeTransactionCursor(txn *ent.Transaction, order graph.TransactionOrder) (graph.Cursor, error) {
	payload, err := json.Marshal(newTransactionCursor(txn, order))
	if err != nil {
		return "", fmt.Errorf("encode transaction cursor: %w", err)
	}
	return graph.Cursor(base64.RawURLEncoding.EncodeToString(payload)), nil
}

func decodeTransactionCursor(encoded graph.Cursor, order graph.TransactionOrder) (transactionCursor, error) {
	payload, err := base64.RawURLEncoding.DecodeString(encoded.String())
	if err != nil {
		return transactionCursor{}, fmt.Errorf("%w: decode base64", ErrInvalidCursor)
	}

	var cursor transactionCursor
	if err := json.Unmarshal(payload, &cursor); err != nil {
		return transactionCursor{}, fmt.Errorf("%w: decode payload", ErrInvalidCursor)
	}
	if cursor.Version != transactionCursorVersion || cursor.Order != order {
		return transactionCursor{}, fmt.Errorf("%w: cursor does not match transaction order", ErrInvalidCursor)
	}
	if cursor.CreatedAt.IsZero() || cursor.PublicID.IsValid("txn_") != nil {
		return transactionCursor{}, fmt.Errorf("%w: incomplete cursor", ErrInvalidCursor)
	}
	if order == graph.TransactionOrderTransactionDateDesc {
		if _, err := date.NewDate(cursor.Date.String()); err != nil {
			return transactionCursor{}, fmt.Errorf("%w: invalid transaction date", ErrInvalidCursor)
		}
	}

	return cursor, nil
}
