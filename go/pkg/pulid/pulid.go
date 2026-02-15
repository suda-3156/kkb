// Reference:
// https://github.com/ent/contrib/blob/6623819401500db45747a2419172963217cef619/entgql/internal/todopulid/ent/schema/pulid/pulid.go

package pulid

import (
	"crypto/rand"
	"database/sql/driver"
	"errors"
	"fmt"
	"io"
	"strconv"
	"sync"
	"time"

	"github.com/oklog/ulid/v2"
)

// ID implements a PULID - a prefixed ULID.
// Regex: ^[0-9A-HJKMNP-TV-Z]{26}$
type ID string

// The default entropy source.
var (
	defaultEntropySource *ulid.MonotonicEntropy
	entropyOnce          sync.Once
)

func getEntropySource() *ulid.MonotonicEntropy {
	entropyOnce.Do(func() {
		// Seed the default entropy source.
		defaultEntropySource = ulid.Monotonic(rand.Reader, 0)
	})
	return defaultEntropySource
}

// newULID is an internal function for generating ULIDs.
// testTime can be provided for testing purposes to ensure consistent ULID generation.
func newULID(testTime *time.Time) ulid.ULID {
	entropy := getEntropySource()
	if testTime != nil {
		return ulid.MustNew(ulid.Timestamp(*testTime), entropy)
	}

	return ulid.MustNew(ulid.Timestamp(time.Now()), entropy)
}

// MustNew returns a new PULID for time.Now() given a prefix. This uses the default entropy source.
func MustNew(prefix string) ID {
	return ID(prefix + newULID(nil).String())
}

// UnmarshalGQL implements the graphql.Unmarshaler interface.
func (u *ID) UnmarshalGQL(v interface{}) error {
	return u.Scan(v)
}

// MarshalGQL implements the graphql.Marshaler interface.
func (u ID) MarshalGQL(w io.Writer) {
	_, _ = io.WriteString(w, strconv.Quote(string(u)))
}

// Scan implements the Scanner interface.
func (u *ID) Scan(src interface{}) error {
	if src == nil {
		return fmt.Errorf("pulid: expected a value")
	}
	switch s := src.(type) {
	case string:
		*u = ID(s)
		return nil
	case []byte:
		*u = ID(string(s))
		return nil
	default:
		return fmt.Errorf("pulid: expected a string or []byte")
	}
}

// Value implements the driver Valuer interface.
func (u ID) Value() (driver.Value, error) {
	return string(u), nil
}

// String returns the string representation of the PULID.
func (u ID) String() string {
	return string(u)
}

var ErrInvalidPulid = errors.New("invalid pulid")

// IsValid checks if the PULID is valid given a prefix.
// It checks both the prefix and the ULID part for validity.
func (u ID) IsValid(prefix string) error {
	length := len(prefix)
	prefixPart := u[:length].String()
	ulidPart := u[length:].String()

	if prefixPart != prefix {
		return ErrInvalidPulid
	}

	_, err := ulid.Parse(ulidPart)
	if err != nil {
		return ErrInvalidPulid
	}

	return nil
}
