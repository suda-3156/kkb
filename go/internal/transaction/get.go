package transaction

import (
	"context"

	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/pulid"
)

func (m *TransactionManager) GetByPublicID(
	ctx context.Context,
	publicID pulid.ID,
) (*graph.Transaction, error)

func (m *TransactionManager) GetByInternalID(
	ctx context.Context,
	ID int,
) (*graph.Transaction, error)
