package transaction

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"time"

	"github.com/suda-3156/kkb/go/ent"
	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/cursor"
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
	c := transactionCursor{
		Version:   transactionCursorVersion,
		Order:     order,
		CreatedAt: txn.CreatedAt,
		PublicID:  txn.PublicID,
	}
	if order == graph.TransactionOrderTransactionDateDesc {
		c.Date = txn.Date
	}
	return c
}

func encodeTransactionCursor(txn *ent.Transaction, order graph.TransactionOrder) (cursor.Cursor, error) {
	payload, err := json.Marshal(newTransactionCursor(txn, order))
	if err != nil {
		return "", fmt.Errorf("encode transaction cursor: %w", err)
	}
	return cursor.Cursor(base64.RawURLEncoding.EncodeToString(payload)), nil
}

func decodeTransactionCursor(encoded cursor.Cursor, order graph.TransactionOrder) (transactionCursor, error) {
	payload, err := base64.RawURLEncoding.DecodeString(encoded.String())
	if err != nil {
		return transactionCursor{}, fmt.Errorf("%w: decode base64", ErrInvalidCursor)
	}

	var decoded transactionCursor
	if err := json.Unmarshal(payload, &decoded); err != nil {
		return transactionCursor{}, fmt.Errorf("%w: decode payload", ErrInvalidCursor)
	}
	if decoded.Version != transactionCursorVersion || decoded.Order != order {
		return transactionCursor{}, fmt.Errorf("%w: cursor does not match transaction order", ErrInvalidCursor)
	}
	if decoded.CreatedAt.IsZero() || decoded.PublicID.IsValid("txn_") != nil {
		return transactionCursor{}, fmt.Errorf("%w: incomplete cursor", ErrInvalidCursor)
	}
	if order == graph.TransactionOrderTransactionDateDesc {
		if _, err := date.NewDate(decoded.Date.String()); err != nil {
			return transactionCursor{}, fmt.Errorf("%w: invalid transaction date", ErrInvalidCursor)
		}
	}

	return decoded, nil
}
