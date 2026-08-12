package aggregation

import (
	"slices"
	"testing"
	"time"

	ents "github.com/suda-3156/kkb/go/ent/schema"
	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/date"
)

func periodStrings(periods []period) [][2]string {
	out := make([][2]string, 0, len(periods))
	for _, p := range periods {
		out = append(out, [2]string{p.start.String(), p.end.String()})
	}
	return out
}

func TestSplitPeriods(t *testing.T) {
	tests := []struct {
		name        string
		start       string
		end         string
		granularity graph.Granularity
		want        [][2]string
	}{
		{
			name: "daily", start: "2026-08-01", end: "2026-08-03",
			granularity: graph.GranularityDaily,
			want: [][2]string{
				{"2026-08-01", "2026-08-01"},
				{"2026-08-02", "2026-08-02"},
				{"2026-08-03", "2026-08-03"},
			},
		},
		{
			name: "single day", start: "2026-08-01", end: "2026-08-01",
			granularity: graph.GranularityDaily,
			want:        [][2]string{{"2026-08-01", "2026-08-01"}},
		},
		{
			name: "weekly clips the last bucket to endDate", start: "2026-01-01", end: "2026-01-20",
			granularity: graph.GranularityWeekly,
			want: [][2]string{
				{"2026-01-01", "2026-01-07"},
				{"2026-01-08", "2026-01-14"},
				{"2026-01-15", "2026-01-20"},
			},
		},
		{
			name: "monthly from the 1st", start: "2026-01-01", end: "2026-03-31",
			granularity: graph.GranularityMonthly,
			want: [][2]string{
				{"2026-01-01", "2026-01-31"},
				{"2026-02-01", "2026-02-28"},
				{"2026-03-01", "2026-03-31"},
			},
		},
		{
			// Regression: AddDate normalizes 01-31 + 1 month to 03-03, which
			// skipped February entirely and shifted every later bucket.
			name: "monthly anchored on a month end", start: "2026-01-31", end: "2026-04-30",
			granularity: graph.GranularityMonthly,
			want: [][2]string{
				{"2026-01-31", "2026-02-27"},
				{"2026-02-28", "2026-03-30"},
				{"2026-03-31", "2026-04-29"},
				{"2026-04-30", "2026-04-30"},
			},
		},
		{
			name: "monthly over a leap February", start: "2024-01-31", end: "2024-03-31",
			granularity: graph.GranularityMonthly,
			want: [][2]string{
				{"2024-01-31", "2024-02-28"},
				{"2024-02-29", "2024-03-30"},
				{"2024-03-31", "2024-03-31"},
			},
		},
		{
			name: "monthly across a year boundary", start: "2025-11-01", end: "2026-01-31",
			granularity: graph.GranularityMonthly,
			want: [][2]string{
				{"2025-11-01", "2025-11-30"},
				{"2025-12-01", "2025-12-31"},
				{"2026-01-01", "2026-01-31"},
			},
		},
		{
			name: "end before start", start: "2026-08-10", end: "2026-08-01",
			granularity: graph.GranularityDaily,
			want:        nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := splitPeriods(date.Date(tt.start), date.Date(tt.end), tt.granularity)
			if err != nil {
				t.Fatalf("splitPeriods() unexpected error: %v", err)
			}
			if s := periodStrings(got); !slices.Equal(s, tt.want) {
				t.Errorf("splitPeriods(%s, %s, %s) = %v, want %v",
					tt.start, tt.end, tt.granularity, s, tt.want)
			}
		})
	}
}

// The buckets must tile the requested range: no gap, no overlap, nothing
// outside it. Charts read the series as a partition of the period.
func TestSplitPeriods_Contiguous(t *testing.T) {
	granularities := []graph.Granularity{
		graph.GranularityDaily,
		graph.GranularityWeekly,
		graph.GranularityMonthly,
	}
	ranges := [][2]string{
		{"2026-01-01", "2026-12-31"},
		{"2026-01-29", "2026-06-30"},
		{"2026-01-31", "2027-01-31"},
		{"2024-02-29", "2025-03-01"},
	}

	for _, g := range granularities {
		for _, r := range ranges {
			t.Run(string(g)+" "+r[0], func(t *testing.T) {
				got, err := splitPeriods(date.Date(r[0]), date.Date(r[1]), g)
				if err != nil {
					t.Fatalf("splitPeriods() unexpected error: %v", err)
				}
				if len(got) == 0 {
					t.Fatal("splitPeriods() returned no buckets")
				}

				parse := func(d date.Date) time.Time {
					ts, err := time.Parse(dateFmt, d.String())
					if err != nil {
						t.Fatalf("bad date %q: %v", d, err)
					}
					return ts
				}

				if first := got[0].start; first != date.Date(r[0]) {
					t.Errorf("first bucket starts at %s, want %s", first, r[0])
				}
				if last := got[len(got)-1].end; last != date.Date(r[1]) {
					t.Errorf("last bucket ends at %s, want %s", last, r[1])
				}
				for i, p := range got {
					if parse(p.end).Before(parse(p.start)) {
						t.Errorf("bucket %d ends before it starts: %s..%s", i, p.start, p.end)
					}
					if i == 0 {
						continue
					}
					if want := parse(got[i-1].end).AddDate(0, 0, 1); !parse(p.start).Equal(want) {
						t.Errorf("bucket %d starts at %s, want %s (the day after %s)",
							i, p.start, want.Format(dateFmt), got[i-1].end)
					}
				}
			})
		}
	}
}

func TestSplitPeriods_Errors(t *testing.T) {
	tests := []struct {
		name        string
		start       string
		end         string
		granularity graph.Granularity
	}{
		{"unknown granularity", "2026-08-01", "2026-08-31", graph.Granularity("HOURLY")},
		{"unparsable start", "2026-08", "2026-08-31", graph.GranularityDaily},
		{"unparsable end", "2026-08-01", "not a date", graph.GranularityDaily},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := splitPeriods(date.Date(tt.start), date.Date(tt.end), tt.granularity); err == nil {
				t.Error("splitPeriods() error = nil, want an error")
			}
		})
	}
}

func TestAddMonths(t *testing.T) {
	tests := []struct {
		name string
		from string
		n    int
		want string
	}{
		{"mid month", "2026-08-15", 1, "2026-09-15"},
		{"clamps to a shorter month", "2026-01-31", 1, "2026-02-28"},
		{"clamps to a leap February", "2024-01-31", 1, "2024-02-29"},
		{"clamps to a 30 day month", "2026-01-31", 3, "2026-04-30"},
		{"does not drift back", "2026-01-31", 2, "2026-03-31"},
		{"crosses the year", "2026-12-31", 1, "2027-01-31"},
		{"zero months", "2026-08-15", 0, "2026-08-15"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			from, err := time.Parse(dateFmt, tt.from)
			if err != nil {
				t.Fatalf("bad test input %q: %v", tt.from, err)
			}
			if got := addMonths(from, tt.n).Format(dateFmt); got != tt.want {
				t.Errorf("addMonths(%s, %d) = %s, want %s", tt.from, tt.n, got, tt.want)
			}
		})
	}
}

func TestDaysInMonth(t *testing.T) {
	tests := []struct {
		year  int
		month time.Month
		want  int
	}{
		{2026, time.January, 31},
		{2026, time.February, 28},
		{2024, time.February, 29},
		{2000, time.February, 29}, // divisible by 400
		{1900, time.February, 28}, // divisible by 100 but not 400
		{2026, time.April, 30},
		{2026, time.December, 31},
	}
	for _, tt := range tests {
		t.Run(tt.month.String(), func(t *testing.T) {
			if got := daysInMonth(tt.year, tt.month); got != tt.want {
				t.Errorf("daysInMonth(%d, %s) = %d, want %d", tt.year, tt.month, got, tt.want)
			}
		})
	}
}

// datedRow is a row as sumByDate returns it: one (date, account, entry kind)
// combination and its sum.
func datedRow(on string, lacID int, kind ents.JournalEntryKind, sum int32) datedLacAmountRow {
	return datedLacAmountRow{Date: on, LedgerAccountID: lacID, Kind: kind.String(), Sum: sum}
}

// aggSummary flattens one data point into (start, end, expenses, revenue),
// which is enough to see both the bucketing and the arithmetic.
type aggSummary struct {
	start    string
	end      string
	expenses int32
	revenue  int32
}

func seriesSummaries(dataPoints []*graph.PeriodAggregation) []aggSummary {
	out := make([]aggSummary, 0, len(dataPoints))
	for _, dp := range dataPoints {
		out = append(out, aggSummary{
			start:    dp.StartDate.String(),
			end:      dp.EndDate.String(),
			expenses: dp.Expenses.TotalAmount,
			revenue:  dp.Revenue.TotalAmount,
		})
	}
	return out
}

func TestFoldPeriodAggregationSeries(t *testing.T) {
	kinds := map[int]ents.LedgerAccountKind{
		1: ents.Expense,
		2: ents.Revenue,
		3: ents.Asset, // counter entry
	}

	t.Run("routes every row to the bucket that covers its date", func(t *testing.T) {
		periods, err := splitPeriods("2026-01-01", "2026-03-31", graph.GranularityMonthly)
		if err != nil {
			t.Fatalf("splitPeriods() unexpected error: %v", err)
		}

		rows := []datedLacAmountRow{
			datedRow("2026-01-01", 1, ents.Debit, 100),  // first day of bucket 0
			datedRow("2026-01-31", 1, ents.Debit, 200),  // last day of bucket 0
			datedRow("2026-02-01", 1, ents.Debit, 400),  // first day of bucket 1
			datedRow("2026-03-31", 2, ents.Credit, 900), // last day of bucket 2
			datedRow("2026-02-10", 3, ents.Debit, 5000), // counter entry, ignored
		}

		got, err := foldPeriodAggregationSeries(periods, rows, kinds)
		if err != nil {
			t.Fatalf("foldPeriodAggregationSeries() unexpected error: %v", err)
		}

		want := []aggSummary{
			{"2026-01-01", "2026-01-31", 300, 0},
			{"2026-02-01", "2026-02-28", 400, 0},
			{"2026-03-01", "2026-03-31", 0, 900},
		}
		if s := seriesSummaries(got); !slices.Equal(s, want) {
			t.Errorf("series = %+v, want %+v", s, want)
		}
	})

	// Regression guard for the whole point of this fold: the database returns no
	// row for a period with no entries, so an empty bucket has to be put back.
	// Dropping it would shift every later data point of the series.
	t.Run("keeps buckets that have no rows", func(t *testing.T) {
		periods, err := splitPeriods("2026-08-01", "2026-08-03", graph.GranularityDaily)
		if err != nil {
			t.Fatalf("splitPeriods() unexpected error: %v", err)
		}

		rows := []datedLacAmountRow{datedRow("2026-08-02", 1, ents.Debit, 700)}

		got, err := foldPeriodAggregationSeries(periods, rows, kinds)
		if err != nil {
			t.Fatalf("foldPeriodAggregationSeries() unexpected error: %v", err)
		}

		want := []aggSummary{
			{"2026-08-01", "2026-08-01", 0, 0},
			{"2026-08-02", "2026-08-02", 700, 0},
			{"2026-08-03", "2026-08-03", 0, 0},
		}
		if s := seriesSummaries(got); !slices.Equal(s, want) {
			t.Errorf("series = %+v, want %+v", s, want)
		}
		for i, dp := range got {
			if i == 1 {
				continue
			}
			if dp.Expenses.ByAccount != nil || dp.Revenue.ByAccount != nil {
				t.Errorf("empty bucket %d has a breakdown: %+v", i, dp)
			}
		}
	})

	// Buckets are anchored on startDate rather than on the calendar, so a series
	// starting on a month end has boundaries no SQL date function would produce.
	// The rows have to follow those boundaries, not the calendar months.
	t.Run("follows buckets anchored on a month end", func(t *testing.T) {
		periods, err := splitPeriods("2026-01-31", "2026-03-30", graph.GranularityMonthly)
		if err != nil {
			t.Fatalf("splitPeriods() unexpected error: %v", err)
		}

		rows := []datedLacAmountRow{
			datedRow("2026-02-27", 1, ents.Debit, 10), // last day of bucket 0
			datedRow("2026-02-28", 1, ents.Debit, 20), // first day of bucket 1
		}

		got, err := foldPeriodAggregationSeries(periods, rows, kinds)
		if err != nil {
			t.Fatalf("foldPeriodAggregationSeries() unexpected error: %v", err)
		}

		want := []aggSummary{
			{"2026-01-31", "2026-02-27", 10, 0},
			{"2026-02-28", "2026-03-30", 20, 0},
		}
		if s := seriesSummaries(got); !slices.Equal(s, want) {
			t.Errorf("series = %+v, want %+v", s, want)
		}
	})

	// The query and the buckets are built from the same two dates, so a row
	// outside every bucket means the two have drifted apart. Silently dropping
	// it would lose money from the series.
	t.Run("a row no bucket covers is an error", func(t *testing.T) {
		periods, err := splitPeriods("2026-08-01", "2026-08-03", graph.GranularityDaily)
		if err != nil {
			t.Fatalf("splitPeriods() unexpected error: %v", err)
		}

		rows := []datedLacAmountRow{datedRow("2026-08-04", 1, ents.Debit, 700)}

		if _, err := foldPeriodAggregationSeries(periods, rows, kinds); err == nil {
			t.Error("foldPeriodAggregationSeries() error = nil, want an error for the uncovered row")
		}
	})

	t.Run("an unknown ledger account is an error", func(t *testing.T) {
		periods, err := splitPeriods("2026-08-01", "2026-08-01", graph.GranularityDaily)
		if err != nil {
			t.Fatalf("splitPeriods() unexpected error: %v", err)
		}

		rows := []datedLacAmountRow{datedRow("2026-08-01", 99, ents.Debit, 700)}

		if _, err := foldPeriodAggregationSeries(periods, rows, kinds); err == nil {
			t.Error("foldPeriodAggregationSeries() error = nil, want an error for the unknown account")
		}
	})
}

func TestBucketOf(t *testing.T) {
	periods, err := splitPeriods("2026-01-01", "2026-03-31", graph.GranularityMonthly)
	if err != nil {
		t.Fatalf("splitPeriods() unexpected error: %v", err)
	}

	tests := []struct {
		date  string
		want  int
		found bool
	}{
		{"2025-12-31", 0, false}, // before the first bucket
		{"2026-01-01", 0, true},
		{"2026-01-31", 0, true},
		{"2026-02-01", 1, true},
		{"2026-02-28", 1, true},
		{"2026-03-01", 2, true},
		{"2026-03-31", 2, true},
		{"2026-04-01", 0, false}, // after the last bucket
	}
	for _, tt := range tests {
		t.Run(tt.date, func(t *testing.T) {
			got, found := bucketOf(periods, tt.date)
			if found != tt.found || (found && got != tt.want) {
				t.Errorf("bucketOf(%s) = (%d, %t), want (%d, %t)", tt.date, got, found, tt.want, tt.found)
			}
		})
	}
}
