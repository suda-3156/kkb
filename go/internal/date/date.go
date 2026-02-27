package date

import (
	"errors"
	"fmt"
	"io"
	"regexp"
	"time"
)

var (
	// ErrInvalidDateFormat is returned when the date string does not match YYYY-MM-DD.
	ErrInvalidDateFormat = errors.New("invalid date format: expected YYYY-MM-DD")
	// ErrInvalidDate is returned when the date string is not a real calendar date.
	ErrInvalidDate = errors.New("invalid date")
)

// Date represents a date in YYYY-MM-DD format
type Date string

var dateRegex = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)

// NewDate creates a new Date from a string
func NewDate(s string) (*Date, error) {
	if !dateRegex.MatchString(s) {
		return nil, fmt.Errorf("%w: got %s", ErrInvalidDateFormat, s)
	}

	// Validate that it's a real date
	_, err := time.Parse("2006-01-02", s)
	if err != nil {
		return nil, fmt.Errorf("%w: %s", ErrInvalidDate, s)
	}

	return (*Date)(&s), nil
}

// String returns the string representation of the date
func (d Date) String() string {
	return string(d)
}

// MarshalGQL implements the graphql.Marshaler interface
func (d Date) MarshalGQL(w io.Writer) {
	fmt.Fprintf(w, `"%s"`, d)
}

// UnmarshalGQL implements the graphql.Unmarshaler interface
func (d *Date) UnmarshalGQL(v interface{}) error {
	s, ok := v.(string)
	if !ok {
		return fmt.Errorf("date must be a string")
	}

	date, err := NewDate(s)
	if err != nil {
		return err
	}

	*d = *date
	return nil
}
