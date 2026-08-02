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
	periods, err := splitPeriods(startDate, endDate, granularity)
	if err != nil {
		return nil, fmt.Errorf("period aggregation series: %w", err)
	}

	var dataPoints []*graph.PeriodAggregation
	for _, p := range periods {
		agg, err := m.GetPeriodAggregation(ctx, p.start, p.end)
		if err != nil {
			return nil, fmt.Errorf("period aggregation series: %w", err)
		}
		dataPoints = append(dataPoints, agg)
	}

	return &graph.PeriodAggregationSeries{
		Granularity: granularity,
		DataPoints:  dataPoints,
	}, nil
}

// period is one bucket of the series, both ends inclusive.
type period struct {
	start date.Date
	end   date.Date
}

// splitPeriods cuts [startDate, endDate] into consecutive buckets of the given
// granularity. Buckets are anchored on startDate rather than on the calendar,
// and the last one is clipped to endDate, so it may be shorter than the others.
// An endDate before startDate yields no buckets.
func splitPeriods(startDate, endDate date.Date, granularity graph.Granularity) ([]period, error) {
	start, err := time.Parse(dateFmt, startDate.String())
	if err != nil {
		return nil, fmt.Errorf("parse start date: %w", err)
	}
	end, err := time.Parse(dateFmt, endDate.String())
	if err != nil {
		return nil, fmt.Errorf("parse end date: %w", err)
	}

	switch granularity {
	case graph.GranularityDaily, graph.GranularityWeekly, graph.GranularityMonthly:
	default:
		return nil, fmt.Errorf("unknown granularity %q", granularity)
	}

	var periods []period
	for i := 0; ; i++ {
		cur := periodStart(start, granularity, i)
		if cur.After(end) {
			break
		}

		// The bucket ends the day before the next one starts, clipped to endDate.
		periodEnd := periodStart(start, granularity, i+1).AddDate(0, 0, -1)
		if periodEnd.After(end) {
			periodEnd = end
		}

		periods = append(periods, period{
			start: date.Date(cur.Format(dateFmt)),
			end:   date.Date(periodEnd.Format(dateFmt)),
		})
	}

	return periods, nil
}

// periodStart returns the first day of the i-th bucket after start. Every
// bucket is measured from start, never from its predecessor, so a month-end
// anchor such as 01-31 keeps returning to the 31st (01-31, 02-28, 03-31, ...)
// instead of drifting earlier every month.
func periodStart(start time.Time, granularity graph.Granularity, i int) time.Time {
	switch granularity {
	case graph.GranularityDaily:
		return start.AddDate(0, 0, i)
	case graph.GranularityWeekly:
		return start.AddDate(0, 0, 7*i)
	case graph.GranularityMonthly:
		return addMonths(start, i)
	}
	return start
}

// addMonths adds n months to t, clamping the day to the last day of the target
// month. time.AddDate normalizes instead of clamping, turning 01-31 + 1 month
// into 03-03, which would shift every following bucket of a series.
func addMonths(t time.Time, n int) time.Time {
	year, month, day := t.Date()
	// Do the month arithmetic on the 1st, which never overflows.
	first := time.Date(year, month, 1, 0, 0, 0, 0, t.Location()).AddDate(0, n, 0)
	if last := daysInMonth(first.Year(), first.Month()); day > last {
		day = last
	}
	return time.Date(first.Year(), first.Month(), day, 0, 0, 0, 0, t.Location())
}

// daysInMonth returns the number of days in the given month, leap years
// included: day 0 of the next month is the last day of this one.
func daysInMonth(year int, month time.Month) int {
	return time.Date(year, month+1, 0, 0, 0, 0, 0, time.UTC).Day()
}
