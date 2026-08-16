package transaction

import (
	"errors"
	"testing"
	"time"

	"github.com/suda-3156/kkb/go/ent"
	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/date"
	"github.com/suda-3156/kkb/go/internal/prid"
)

func TestTransactionCursorRoundTrip(t *testing.T) {
	txn := &ent.Transaction{
		PublicID:  prid.ID("txn_abcdefghijklmnop"),
		Date:      date.Date("2026-08-16"),
		CreatedAt: time.Date(2026, 8, 16, 12, 34, 56, 123456000, time.UTC),
	}

	for _, order := range graph.AllTransactionOrder {
		t.Run(order.String(), func(t *testing.T) {
			encoded, err := encodeTransactionCursor(txn, order)
			if err != nil {
				t.Fatalf("encodeTransactionCursor() error = %v", err)
			}

			decoded, err := decodeTransactionCursor(encoded, order)
			if err != nil {
				t.Fatalf("decodeTransactionCursor() error = %v", err)
			}
			if decoded.Order != order {
				t.Errorf("Order = %v, want %v", decoded.Order, order)
			}
			if decoded.PublicID != txn.PublicID {
				t.Errorf("PublicID = %v, want %v", decoded.PublicID, txn.PublicID)
			}
			if !decoded.CreatedAt.Equal(txn.CreatedAt) {
				t.Errorf("CreatedAt = %v, want %v", decoded.CreatedAt, txn.CreatedAt)
			}
			if order == graph.TransactionOrderTransactionDateDesc && decoded.Date != txn.Date {
				t.Errorf("Date = %v, want %v", decoded.Date, txn.Date)
			}
		})
	}
}

func TestDecodeTransactionCursorRejectsWrongOrder(t *testing.T) {
	txn := &ent.Transaction{
		PublicID:  prid.ID("txn_abcdefghijklmnop"),
		Date:      date.Date("2026-08-16"),
		CreatedAt: time.Date(2026, 8, 16, 12, 34, 56, 0, time.UTC),
	}
	encoded, err := encodeTransactionCursor(txn, graph.TransactionOrderCreatedAtDesc)
	if err != nil {
		t.Fatalf("encodeTransactionCursor() error = %v", err)
	}

	_, err = decodeTransactionCursor(encoded, graph.TransactionOrderTransactionDateDesc)
	if !errors.Is(err, ErrInvalidCursor) {
		t.Fatalf("decodeTransactionCursor() error = %v, want %v", err, ErrInvalidCursor)
	}
}

func TestValidatePagination(t *testing.T) {
	one := int32(1)
	zero := int32(0)

	tests := []struct {
		name   string
		filter *Filter
	}{
		{name: "nil filter"},
		{name: "missing order", filter: &Filter{First: &one}},
		{name: "missing direction", filter: &Filter{Order: graph.TransactionOrderCreatedAtDesc}},
		{name: "both directions", filter: &Filter{First: &one, Last: &one, Order: graph.TransactionOrderCreatedAtDesc}},
		{name: "zero first", filter: &Filter{First: &zero, Order: graph.TransactionOrderCreatedAtDesc}},
		{name: "zero last", filter: &Filter{Last: &zero, Order: graph.TransactionOrderCreatedAtDesc}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := validatePagination(tt.filter); !errors.Is(err, ErrInvalidPagination) {
				t.Errorf("validatePagination() error = %v, want %v", err, ErrInvalidPagination)
			}
		})
	}

	if err := validatePagination(&Filter{First: &one, Order: graph.TransactionOrderCreatedAtDesc}); err != nil {
		t.Errorf("validatePagination() error = %v for valid filter", err)
	}
}
