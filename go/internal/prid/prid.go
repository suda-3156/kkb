// This package provides basic functionality for generating and handling PRIDs (Prefixed Random IDs).
package prid

import (
	"database/sql/driver"
	"errors"
	"fmt"
	"io"
	"strconv"
)

// ID implements a PRID - a prefixed random ID.
// Regex: ^[a-zA-Z0-9]+$ (URL-safe characters)
type ID string

const (
	// rLen defines the length of the random part of the PRID.
	rLen = 16
	// pLen defines the required length of the prefix.
	pLen = 4
)

var (
	ErrInvalidPrefix = fmt.Errorf("prid: prefix must be exactly %d characters long", pLen)
	ErrInvalidPRID   = errors.New("prid: invalid prid")
)

// New returns a new PRID given a prefix. The random part is generated using URL-safe characters: [a-zA-Z0-9].
// The prefix must be exactly 4 characters long, otherwise it returns an error.
func New(prefix string) (ID, error) {
	if len(prefix) != pLen {
		return "", ErrInvalidPrefix
	}

	randomPart := generateRandomString(rLen)
	return ID(prefix + randomPart), nil
}

// NewUnsafe returns a new PRID given a prefix. The random part is generated using URL-safe characters: [a-zA-Z0-9].
// The prefix must be exactly 4 characters long, otherwise it panics.
func NewUnsafe(prefix string) ID {
	id, err := New(prefix)
	if err != nil {
		panic(err)
	}
	return id
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
		return fmt.Errorf("prid: expected a value")
	}
	switch s := src.(type) {
	case string:
		*u = ID(s)
		return nil
	case []byte:
		*u = ID(string(s))
		return nil
	default:
		return fmt.Errorf("prid: expected a string or []byte")
	}
}

// Value implements the driver Valuer interface.
func (u ID) Value() (driver.Value, error) {
	return string(u), nil
}

// String returns the string representation of the PRID.
func (u ID) String() string {
	return string(u)
}

// IsValid checks if the PRID is valid given a prefix.
// It checks both the prefix and the random part for validity.
func (u ID) IsValid(prefix string) error {
	if len(prefix) != pLen {
		return ErrInvalidPrefix
	}

	if len(u) != pLen+rLen {
		return ErrInvalidPRID
	}

	prefixPart := u[:pLen].String()
	randomPart := u[pLen:].String()

	if prefixPart != prefix {
		return ErrInvalidPRID
	}

	if !isValidRandomPart(randomPart) {
		return ErrInvalidPRID
	}

	return nil
}
