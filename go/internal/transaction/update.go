package transaction

import (
	"context"

	graph "github.com/suda-3156/kkb/go/graph/model"
)

func (m *TransactionManager) Update(
	ctx context.Context,
	input graph.UpdateTransactionInput,
) (*graph.Transaction, error)
