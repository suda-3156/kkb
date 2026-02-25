package transaction

import (
	"context"

	graph "github.com/suda-3156/kkb/go/graph/model"
)

func (m *TransactionManager) Create(
	ctx context.Context,
	input graph.CreateTransactionInput,
) (*graph.Transaction, error)
