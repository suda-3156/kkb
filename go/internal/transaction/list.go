package transaction

import (
	"context"

	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/date"
	"github.com/suda-3156/kkb/go/internal/pulid"
)

func (m *TransactionManager) List(
	ctx context.Context,
	first *int32,
	publicIDs []pulid.ID,
	IDs []int,
	after *pulid.ID,
	last *int32,
	before *pulid.ID,
	startDate *date.Date,
	endDate *date.Date,
) (*graph.TransactionConnection, error)
