package subscription

import (
	"errors"
	"testing"

	"github.com/suda-3156/kkb/go/internal/date"
)

func d(s string) date.Date { return date.Date(s) }

// TestNextOccurrence covers the sticky month-end rounding: the target day is
// always the anchor's day, clamped only for months that lack it, so a clamped
// month never shifts the following ones.
func TestNextOccurrence(t *testing.T) {
	tests := []struct {
		name     string
		current  string
		anchor   string
		interval int
		want     string
	}{
		{"plain monthly", "2026-08-15", "2026-03-15", 1, "2026-09-15"},
		{"31st clamps to february", "2026-01-31", "2026-01-31", 1, "2026-02-28"},
		{"clamped month returns to the 31st", "2026-02-28", "2026-01-31", 1, "2026-03-31"},
		{"30th clamps to february only", "2026-01-30", "2026-01-30", 1, "2026-02-28"},
		{"31st clamps to 30-day month", "2026-03-31", "2026-01-31", 1, "2026-04-30"},
		{"leap february keeps the 29th", "2028-01-31", "2028-01-31", 1, "2028-02-29"},
		{"yearly on leap day clamps", "2028-02-29", "2028-02-29", 12, "2029-02-28"},
		{"yearly clamp returns on next leap year", "2031-02-28", "2028-02-29", 12, "2032-02-29"},
		{"quarterly", "2026-11-30", "2026-08-31", 3, "2027-02-28"},
		{"year boundary", "2026-12-15", "2026-03-15", 1, "2027-01-15"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := NextOccurrence(d(tt.current), d(tt.anchor), tt.interval)
			if err != nil {
				t.Fatalf("NextOccurrence() error = %v", err)
			}
			if got != d(tt.want) {
				t.Errorf("NextOccurrence() = %s, want %s", got, tt.want)
			}
		})
	}
}

// TestFirstOccurrenceOnOrAfter covers the creation rule: the anchor is the
// series' first occurrence, and a past anchor yields the nearest upcoming
// date instead of the missed ones (no retroactive materialization).
func TestFirstOccurrenceOnOrAfter(t *testing.T) {
	tests := []struct {
		name     string
		anchor   string
		interval int
		today    string
		want     string
	}{
		// The example from the spec: registered 3/15, entered into kkb 8/12.
		{"past anchor advances to the next hit", "2026-03-15", 1, "2026-08-12", "2026-08-15"},
		{"registered today bills today", "2026-08-13", 1, "2026-08-13", "2026-08-13"},
		{"future anchor is returned as-is", "2026-09-01", 1, "2026-08-13", "2026-09-01"},
		{"lands exactly on today", "2026-05-13", 1, "2026-08-13", "2026-08-13"},
		{"yearly past anchor", "2024-04-01", 12, "2026-08-13", "2027-04-01"},
		{"month-end anchor stays sticky while advancing", "2026-01-31", 1, "2026-02-28", "2026-02-28"},
		{"month-end anchor passes clamped month", "2026-01-31", 1, "2026-03-01", "2026-03-31"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := FirstOccurrenceOnOrAfter(d(tt.anchor), tt.interval, d(tt.today))
			if err != nil {
				t.Fatalf("FirstOccurrenceOnOrAfter() error = %v", err)
			}
			if got != d(tt.want) {
				t.Errorf("FirstOccurrenceOnOrAfter() = %s, want %s", got, tt.want)
			}
		})
	}
}

func TestFirstOccurrenceOnOrAfter_InvalidInterval(t *testing.T) {
	_, err := FirstOccurrenceOnOrAfter(d("2026-08-13"), 0, d("2026-08-13"))
	if !errors.Is(err, ErrIntervalMustBePositive) {
		t.Errorf("error = %v, want %v", err, ErrIntervalMustBePositive)
	}
}

func TestPrevDayNextDay(t *testing.T) {
	tests := []struct {
		in       string
		wantPrev string
		wantNext string
	}{
		{"2026-08-15", "2026-08-14", "2026-08-16"},
		{"2026-03-01", "2026-02-28", "2026-03-02"},
		{"2028-03-01", "2028-02-29", "2028-03-02"},
		{"2026-01-01", "2025-12-31", "2026-01-02"},
	}

	for _, tt := range tests {
		prev, err := PrevDay(d(tt.in))
		if err != nil {
			t.Fatalf("PrevDay(%s) error = %v", tt.in, err)
		}
		if prev != d(tt.wantPrev) {
			t.Errorf("PrevDay(%s) = %s, want %s", tt.in, prev, tt.wantPrev)
		}

		next, err := NextDay(d(tt.in))
		if err != nil {
			t.Fatalf("NextDay(%s) error = %v", tt.in, err)
		}
		if next != d(tt.wantNext) {
			t.Errorf("NextDay(%s) = %s, want %s", tt.in, next, tt.wantNext)
		}
	}
}

// TestReactivationNextOccurrence covers the rule shared by resume and
// uncancel, including the four scenarios tabulated in the spec.
func TestReactivationNextOccurrence(t *testing.T) {
	tests := []struct {
		name    string
		today   string
		covered string
		want    string
	}{
		// 10/15 materialized -> covered 11/14; paused 10/20, resumed 10/25:
		// still covered, the date does not move.
		{"resume within covered period", "2026-10-25", "2026-11-14", "2026-11-15"},
		// 11/15 skipped, resumed 11/20: lapsed, billing restarts today.
		{"resume after covered period lapsed", "2026-11-20", "2026-11-14", "2026-11-20"},
		// 9/15 materialized -> covered 10/14; canceled 10/1, uncanceled 10/10.
		{"uncancel within covered period", "2026-10-10", "2026-10-14", "2026-10-15"},
		// Same, but uncanceled 12/1: long lapsed.
		{"uncancel long after covered period", "2026-12-01", "2026-10-14", "2026-12-01"},
		// Boundary: the covered day itself is still usable, billing starts
		// the day after.
		{"today is the last covered day", "2026-11-14", "2026-11-14", "2026-11-15"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ReactivationNextOccurrence(d(tt.today), d(tt.covered))
			if err != nil {
				t.Fatalf("ReactivationNextOccurrence() error = %v", err)
			}
			if got != d(tt.want) {
				t.Errorf("ReactivationNextOccurrence() = %s, want %s", got, tt.want)
			}
		})
	}
}
