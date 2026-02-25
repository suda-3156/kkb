package transaction

import (
	"context"

	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/pulid"
)

func (m *TransactionManager) Delete(
	ctx context.Context,
	publicID pulid.ID,
) (*graph.DeleteTransactionPayload, error)
