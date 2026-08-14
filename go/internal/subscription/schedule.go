package subscription

import (
	"fmt"
	"time"

	"github.com/suda-3156/kkb/go/internal/date"
)

// jst is the timezone every "today" decision derives from. The daily job runs
// at JST 01:00 (= UTC 16:00 the previous day) and Transaction.date is a plain
// YYYY-MM-DD string, so mixing in the DB server's CURRENT_DATE or the process
// TZ env could disagree by a day. This single definition is the source of truth.
var jst = time.FixedZone("JST", 9*60*60)

// TodayJST returns today's date in JST.
func TodayJST() date.Date {
	return dateOf(time.Now().In(jst))
}

func dateOf(t time.Time) date.Date {
	return date.Date(t.Format("2006-01-02"))
}

func timeOf(d date.Date) (time.Time, error) {
	t, err := time.Parse("2006-01-02", d.String())
	if err != nil {
		return time.Time{}, fmt.Errorf("parse date %q: %w", d, err)
	}
	return t, nil
}

// NextOccurrence returns the occurrence following current in the series
// defined by anchor and intervalMonths. The target day-of-month is the
// anchor's day, clamped to the target month's length (sticky rounding):
// a clamped month never moves the anchor, so later months return to the
// original day (1/31 -> 2/28 -> 3/31).
func NextOccurrence(current, anchor date.Date, intervalMonths int) (date.Date, error) {
	cur, err := timeOf(current)
	if err != nil {
		return "", err
	}
	anc, err := timeOf(anchor)
	if err != nil {
		return "", err
	}

	// Month arithmetic on day 1: AddDate on day 29-31 would itself normalize
	// (Jan 31 + 1 month = Mar 3), which is exactly the drift this avoids.
	first := time.Date(cur.Year(), cur.Month(), 1, 0, 0, 0, 0, time.UTC).
		AddDate(0, intervalMonths, 0)
	day := min(anc.Day(), daysIn(first.Year(), first.Month()))

	return dateOf(time.Date(first.Year(), first.Month(), day, 0, 0, 0, 0, time.UTC)), nil
}

// FirstOccurrenceOnOrAfter returns the first occurrence of the series that is
// today or later. The anchor itself is the series' first occurrence, so a
// future anchor is returned as-is (no retroactive materialization: a past
// anchor yields the nearest upcoming date instead of the missed ones).
func FirstOccurrenceOnOrAfter(anchor date.Date, intervalMonths int, today date.Date) (date.Date, error) {
	if intervalMonths < 1 {
		return "", ErrIntervalMustBePositive
	}

	occ := anchor
	// ISO date strings order lexicographically, so plain string comparison works.
	for occ < today {
		next, err := NextOccurrence(occ, anchor, intervalMonths)
		if err != nil {
			return "", err
		}
		occ = next
	}
	return occ, nil
}

// PrevDay returns d minus one day. coveredThroughOn is always
// "next occurrence - 1 day", the last day the current payment covers.
func PrevDay(d date.Date) (date.Date, error) {
	t, err := timeOf(d)
	if err != nil {
		return "", err
	}
	return dateOf(t.AddDate(0, 0, -1)), nil
}

// NextDay returns d plus one day.
func NextDay(d date.Date) (date.Date, error) {
	t, err := timeOf(d)
	if err != nil {
		return "", err
	}
	return dateOf(t.AddDate(0, 0, 1)), nil
}

// ReactivationNextOccurrence implements the shared rule of "resume now" and
// "uncancel": nextOccurrenceOn = max(today, coveredThroughOn + 1 day).
// While the already-paid period still runs, the date does not move (no double
// billing); once it has lapsed, billing restarts today.
func ReactivationNextOccurrence(today, coveredThroughOn date.Date) (date.Date, error) {
	dayAfter, err := NextDay(coveredThroughOn)
	if err != nil {
		return "", err
	}
	return max(today, dayAfter), nil
}

func daysIn(year int, month time.Month) int {
	return time.Date(year, month+1, 0, 0, 0, 0, 0, time.UTC).Day()
}
