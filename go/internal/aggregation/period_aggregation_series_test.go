package aggregation

import (
	"slices"
	"testing"
	"time"

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
