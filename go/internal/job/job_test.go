package job

import (
	"context"
	"errors"
	"strings"
	"testing"
)

func task(name string, calls *[]string, err error) Task {
	return Task{
		Name: name,
		Run: func(_ context.Context) error {
			*calls = append(*calls, name)
			return err
		},
	}
}

func TestRun_AllByDefault(t *testing.T) {
	var calls []string
	r := NewRunner(task("a", &calls, nil), task("b", &calls, nil))

	if err := r.Run(context.Background(), nil); err != nil {
		t.Fatalf("Run() error = %v", err)
	}
	if got := strings.Join(calls, ","); got != "a,b" {
		t.Errorf("calls = %s, want a,b", got)
	}
}

func TestRun_Subset(t *testing.T) {
	var calls []string
	r := NewRunner(task("a", &calls, nil), task("b", &calls, nil))

	if err := r.Run(context.Background(), []string{"b"}); err != nil {
		t.Fatalf("Run() error = %v", err)
	}
	if got := strings.Join(calls, ","); got != "b" {
		t.Errorf("calls = %s, want b", got)
	}
}

func TestRun_UnknownTask(t *testing.T) {
	var calls []string
	r := NewRunner(task("a", &calls, nil))

	err := r.Run(context.Background(), []string{"nope"})
	if err == nil {
		t.Fatal("Run() expected an error for an unknown task")
	}
	if len(calls) != 0 {
		t.Errorf("no task should run on selection error, got %v", calls)
	}
}

// A failing task must not stop the tasks after it, but the run as a whole
// must still be reported failed.
func TestRun_FailureIsolation(t *testing.T) {
	var calls []string
	boom := errors.New("boom")
	r := NewRunner(task("a", &calls, boom), task("b", &calls, nil))

	err := r.Run(context.Background(), nil)
	if !errors.Is(err, boom) {
		t.Fatalf("Run() error = %v, want wrapping %v", err, boom)
	}
	if got := strings.Join(calls, ","); got != "a,b" {
		t.Errorf("calls = %s, want a,b (failure must not stop later tasks)", got)
	}
}

func TestRun_PanicIsolation(t *testing.T) {
	var calls []string
	r := NewRunner(
		Task{Name: "a", Run: func(_ context.Context) error { panic("kaboom") }},
		task("b", &calls, nil),
	)

	err := r.Run(context.Background(), nil)
	if err == nil || !strings.Contains(err.Error(), "kaboom") {
		t.Fatalf("Run() error = %v, want the panic surfaced as an error", err)
	}
	if got := strings.Join(calls, ","); got != "b" {
		t.Errorf("calls = %s, want b (panic must not stop later tasks)", got)
	}
}
