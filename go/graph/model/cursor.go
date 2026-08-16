package model

import (
	"fmt"
	"io"
	"strconv"
)

// Cursor is an opaque position in a paginated result set.
type Cursor string

func (c Cursor) String() string {
	return string(c)
}

// MarshalGQL implements graphql.Marshaler.
func (c Cursor) MarshalGQL(w io.Writer) {
	_, _ = io.WriteString(w, strconv.Quote(string(c)))
}

// UnmarshalGQL implements graphql.Unmarshaler.
func (c *Cursor) UnmarshalGQL(v any) error {
	s, ok := v.(string)
	if !ok {
		return fmt.Errorf("cursor must be a string")
	}
	*c = Cursor(s)
	return nil
}
