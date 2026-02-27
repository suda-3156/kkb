package aggregation

import (
	"context"
	"fmt"
	"time"

	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/date"
)

const dateFmt = "2006-01-02"

func (m *AggregationManager) GetPeriodAggregationSeries(
	ctx context.Context,
	startDate date.Date,
	endDate date.Date,
	granularity graph.Granularity,
) (*graph.PeriodAggregationSeries, error) {
	start, err := time.Parse(dateFmt, startDate.String())
	if err != nil {
		return nil, fmt.Errorf("period aggregation series: parse start date: %w", err)
	}
	end, err := time.Parse(dateFmt, endDate.String())
	if err != nil {
		return nil, fmt.Errorf("period aggregation series: parse end date: %w", err)
	}

	var dataPoints []*graph.PeriodAggregation

	cur := start
	for !cur.After(end) {
		// Compute the start of the next period.
		var next time.Time
		switch granularity {
		case graph.GranularityDaily:
			next = cur.AddDate(0, 0, 1)
		case graph.GranularityWeekly:
			next = cur.AddDate(0, 0, 7)
		case graph.GranularityMonthly:
			next = cur.AddDate(0, 1, 0)
		default:
			return nil, fmt.Errorf("period aggregation series: unknown granularity %q", granularity)
		}

		// The period ends the day before the next period starts, clipped to endDate.
		periodEnd := next.AddDate(0, 0, -1)
		if periodEnd.After(end) {
			periodEnd = end
		}

		pStart := date.Date(cur.Format(dateFmt))
		pEnd := date.Date(periodEnd.Format(dateFmt))

		agg, err := m.GetPeriodAggregation(ctx, pStart, pEnd)
		if err != nil {
			return nil, fmt.Errorf("period aggregation series: %w", err)
		}
		dataPoints = append(dataPoints, agg)

		cur = next
	}

	return &graph.PeriodAggregationSeries{
		Granularity: granularity,
		DataPoints:  dataPoints,
	}, nil
}
