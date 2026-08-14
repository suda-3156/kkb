package transaction

import (
	"context"

	"github.com/suda-3156/kkb/go/ent"
	graph "github.com/suda-3156/kkb/go/graph/model"
)

// ToGraph converts a loaded ent transaction into the GraphQL model, decrypting
// the description. The encryption key edge and the entries edge (with their
// ledger accounts) must be loaded. Exported for the subscription package,
// whose occurrence history and calendar embed full transactions.
func (m *TransactionManager) ToGraph(ctx context.Context, txn *ent.Transaction) (*graph.Transaction, error) {
	return m.convertToGraph(ctx, txn)
}
