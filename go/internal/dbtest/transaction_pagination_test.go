//go:build integration

package dbtest

import (
	"slices"
	"testing"
	"time"

	"github.com/suda-3156/kkb/go/ent"
	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/date"
	"github.com/suda-3156/kkb/go/internal/prid"
	"github.com/suda-3156/kkb/go/internal/transaction"
)

func TestTransactionPaginationOrders(t *testing.T) {
	ctx := t.Context()
	encrypted, err := testEM.Encrypt(ctx, t.Name())
	if err != nil {
		t.Fatalf("encrypt description: %v", err)
	}

	t1 := time.Date(2090, 1, 1, 9, 0, 0, 0, time.UTC)
	t2 := time.Date(2090, 1, 2, 9, 0, 0, 0, time.UTC)
	t3 := time.Date(2090, 1, 3, 9, 0, 0, 0, time.UTC)
	t4 := time.Date(2090, 1, 4, 9, 0, 0, 0, time.UTC)

	createPaginationTransaction(t, "txn_zzzzzzzzzzzzzzzz", "2090-01-02", t1, encrypted.Ciphertext, encrypted.KeyID)
	createPaginationTransaction(t, "txn_aaaaaaaaaaaaaaaa", "2090-01-03", t2, encrypted.Ciphertext, encrypted.KeyID)
	createPaginationTransaction(t, "txn_mmmmmmmmmmmmmmmm", "2090-01-03", t2, encrypted.Ciphertext, encrypted.KeyID)
	createPaginationTransaction(t, "txn_bbbbbbbbbbbbbbbb", "2090-01-01", t3, encrypted.Ciphertext, encrypted.KeyID)
	// This row must not affect pageInfo for the January date filter.
	createPaginationTransaction(t, "txn_xxxxxxxxxxxxxxxx", "2090-02-01", t4, encrypted.Ciphertext, encrypted.KeyID)

	start := date.Date("2090-01-01")
	end := date.Date("2090-01-31")

	tests := []struct {
		name  string
		order graph.TransactionOrder
		want  []prid.ID
	}{
		{
			name:  "transaction date",
			order: graph.TransactionOrderTransactionDateDesc,
			want: []prid.ID{
				"txn_aaaaaaaaaaaaaaaa",
				"txn_mmmmmmmmmmmmmmmm",
				"txn_zzzzzzzzzzzzzzzz",
				"txn_bbbbbbbbbbbbbbbb",
			},
		},
		{
			name:  "created at",
			order: graph.TransactionOrderCreatedAtDesc,
			want: []prid.ID{
				"txn_bbbbbbbbbbbbbbbb",
				"txn_aaaaaaaaaaaaaaaa",
				"txn_mmmmmmmmmmmmmmmm",
				"txn_zzzzzzzzzzzzzzzz",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			first := int32(2)
			page1, err := testTM.List(ctx, &transaction.Filter{
				First:     &first,
				Order:     tt.order,
				StartDate: &start,
				EndDate:   &end,
			})
			if err != nil {
				t.Fatalf("list first page: %v", err)
			}
			assertTransactionIDs(t, page1.Nodes, tt.want[:2])
			if page1.PageInfo.HasPreviousPage {
				t.Error("first page hasPreviousPage = true, want false")
			}
			if !page1.PageInfo.HasNextPage {
				t.Error("first page hasNextPage = false, want true")
			}
			if page1.PageInfo.EndCursor == nil {
				t.Fatal("first page endCursor is nil")
			}

			page2, err := testTM.List(ctx, &transaction.Filter{
				First:     &first,
				After:     page1.PageInfo.EndCursor,
				Order:     tt.order,
				StartDate: &start,
				EndDate:   &end,
			})
			if err != nil {
				t.Fatalf("list second page: %v", err)
			}
			assertTransactionIDs(t, page2.Nodes, tt.want[2:])
			if !page2.PageInfo.HasPreviousPage {
				t.Error("second page hasPreviousPage = false, want true")
			}
			if page2.PageInfo.HasNextPage {
				t.Error("second page hasNextPage = true, want false")
			}
			if page2.PageInfo.StartCursor == nil {
				t.Fatal("second page startCursor is nil")
			}

			last := int32(2)
			backward, err := testTM.List(ctx, &transaction.Filter{
				Last:      &last,
				Before:    page2.PageInfo.StartCursor,
				Order:     tt.order,
				StartDate: &start,
				EndDate:   &end,
			})
			if err != nil {
				t.Fatalf("list backward page: %v", err)
			}
			assertTransactionIDs(t, backward.Nodes, tt.want[:2])
			if backward.PageInfo.HasPreviousPage {
				t.Error("backward page hasPreviousPage = true, want false")
			}
			if !backward.PageInfo.HasNextPage {
				t.Error("backward page hasNextPage = false, want true")
			}
		})
	}
}

func createPaginationTransaction(
	t *testing.T,
	publicID prid.ID,
	on string,
	createdAt time.Time,
	description []byte,
	keyID int,
) *ent.Transaction {
	t.Helper()

	txn, err := testDB.Client.Transaction.Create().
		SetPublicID(publicID).
		SetDate(mustDate(t, on)).
		SetDescription(description).
		SetCreatedAt(createdAt).
		SetUpdatedAt(createdAt).
		SetEncryptionKeyID(keyID).
		Save(t.Context())
	if err != nil {
		t.Fatalf("create transaction %s: %v", publicID, err)
	}
	return txn
}

func assertTransactionIDs(t *testing.T, txns []*graph.Transaction, want []prid.ID) {
	t.Helper()

	got := make([]prid.ID, len(txns))
	for i, txn := range txns {
		got[i] = txn.ID
	}
	if !slices.Equal(got, want) {
		t.Errorf("transaction IDs = %v, want %v", got, want)
	}
}
