package pulid

import (
	"regexp"
	"strings"
	"testing"
	"time"
)

const testPULID = "test_01H5VJEGFQ9X4Y8Z5T8K3JZQ9X"

// Confirms that MustNew generates a PULID with the specified prefix.
func TestMustNew(t *testing.T) {
	prefix := "test_"
	id := MustNew(prefix)
	if !strings.HasPrefix(string(id), prefix) {
		t.Errorf("expected prefix %q, got %q", prefix, id)
	}
}

// Confirms that MustNew generates a valid ULID with the correct prefix.
func TestMustNewValidULID(t *testing.T) {
	prefix := "test_"
	id := MustNew(prefix)

	// Check if the ID is a valid ULID
	regex := regexp.MustCompile(`^` + regexp.QuoteMeta(prefix) + `[0-9A-HJKMNP-TV-Z]{26}$`)
	if !regex.MatchString(string(id)) {
		t.Errorf("expected ID to match regex, got %s", id)
	}

	// Check if the length is correct
	if len(id) != len(prefix)+26 {
		t.Errorf("expected ID length %d, got %d", len(prefix)+26, len(id))
	}
}

// Confirms that MustNew generates a unique ID each time it is called.
func TestMustNewUnique(t *testing.T) {
	ids := make(map[string]struct{})
	for range 100 {
		id := MustNew("test_")
		if _, exists := ids[string(id)]; exists {
			t.Errorf("duplicate ID found: %s", id)
		}
		ids[string(id)] = struct{}{}
	}
}

// Confirms that UnmarshalGQL correctly converts a string to an ID.
func TestUnmarshalGQL(t *testing.T) {
	var id ID
	err := id.UnmarshalGQL(testPULID)
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if id != testPULID {
		t.Errorf("expected ID %q, got %q", testPULID, id)
	}
}

// Confirms that MarshalGQL correctly formats the ID as a quoted string.
func TestMarshalGQL(t *testing.T) {
	id := ID(testPULID)
	var sb strings.Builder
	id.MarshalGQL(&sb)
	expected := `"` + testPULID + `"`
	if sb.String() != expected {
		t.Errorf("expected %q, got %q", expected, sb.String())
	}
}

// Confirms that Scan correctly converts a string to an ID and handles nil values.
func TestScan(t *testing.T) {
	var id ID
	err := id.Scan(testPULID)
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if id != testPULID {
		t.Errorf("expected ID %q, got %q", testPULID, id)
	}

	err = id.Scan(nil)
	if err == nil {
		t.Errorf("expected error for nil value, got nil")
	}
}

// Confirms that Value returns the correct string representation of the ID.
func TestValue(t *testing.T) {
	id := ID(testPULID)
	val, err := id.Value()
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if val != testPULID {
		t.Errorf("expected value %q, got %q", testPULID, val)
	}
}

// Confirms that newULID generates a valid ULID.
func TestNewULID(t *testing.T) {
	now := time.Now()
	ulid := newULID(&now)

	if ulid.String() == "" {
		t.Errorf("expected non-empty ULID, got empty string")
	}

	regex := regexp.MustCompile(`^[0-9A-HJKMNP-TV-Z]{26}$`)
	if !regex.MatchString(ulid.String()) {
		t.Errorf("expected ULID to match regex, got %s", ulid.String())
	}

	nowMilli := now.UnixMilli()
	if nowMilli < 0 {
		t.Fatalf("unexpected negative timestamp: %d", nowMilli)
	}
	if ulid.Time() != uint64(nowMilli) {
		t.Errorf("expected ULID timestamp to match provided time, got %d", ulid.Time())
	}
}

func TestNewULIDWithoutTime(t *testing.T) {
	ulid := newULID(nil)

	if ulid.String() == "" {
		t.Errorf("expected non-empty ULID, got empty string")
	}

	regex := regexp.MustCompile(`^[0-9A-HJKMNP-TV-Z]{26}$`)
	if !regex.MatchString(ulid.String()) {
		t.Errorf("expected ULID to match regex, got %s", ulid.String())
	}

	// Check if the timestamp is within a reasonable range of the current time
	currentTime := time.Now().UnixMilli()
	if currentTime < 0 {
		t.Fatalf("unexpected negative timestamp: %d", currentTime)
	}
	ulidTime := ulid.Time()
	if ulidTime < uint64(currentTime)-1000 || ulidTime > uint64(currentTime)+1000 {
		t.Errorf("expected ULID timestamp to be close to current time, got %d", ulidTime)
	}
}

func TestString(t *testing.T) {
	id := ID(testPULID)
	if id.String() != testPULID {
		t.Errorf("expected %q, got %q", testPULID, id.String())
	}
}
