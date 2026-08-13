// Package job is the task registry for the daily Cloud Run Job. The job is a
// single Cloud Run resource; tasks register here and the runner executes them
// in order. New periodic work (GCP cost import, DEK rotation, ...) becomes a
// new Task, not a new binary.
package job

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"

	"github.com/suda-3156/kkb/go/internal/logging"
)

type Task struct {
	Name string
	Run  func(ctx context.Context) error
}

type Runner struct {
	tasks []Task
}

func NewRunner(tasks ...Task) *Runner {
	return &Runner{tasks: tasks}
}

// Names returns the registered task names in execution order.
func (r *Runner) Names() []string {
	names := make([]string, 0, len(r.tasks))
	for _, t := range r.tasks {
		names = append(names, t.Name)
	}
	return names
}

// Run executes the selected tasks sequentially. An empty selection means all
// of them; an unknown name is an error. One task's failure or panic does not
// stop the following tasks, but any failure makes Run return an error, so the
// job execution as a whole is reported failed (that is what the Cloud
// Monitoring alert watches). Frequency splits later become separate Cloud Run
// Jobs invoking the same binary with different -tasks, with no code change.
func (r *Runner) Run(ctx context.Context, selection []string) error {
	selected, err := r.selectTasks(selection)
	if err != nil {
		return err
	}

	var failures []error
	for _, task := range selected {
		logging.Info(ctx, "job - task starting", slog.String("task", task.Name))

		if err := runTask(ctx, task); err != nil {
			logging.Error(
				ctx,
				"job - task failed",
				slog.String("task", task.Name),
				slog.Any("error", err),
			)
			failures = append(failures, fmt.Errorf("task %s: %w", task.Name, err))
			continue
		}

		logging.Info(ctx, "job - task finished", slog.String("task", task.Name))
	}

	if len(failures) > 0 {
		return fmt.Errorf("%d of %d tasks failed: %w",
			len(failures), len(selected), errors.Join(failures...))
	}
	return nil
}

func (r *Runner) selectTasks(selection []string) ([]Task, error) {
	if len(selection) == 0 {
		return r.tasks, nil
	}

	byName := make(map[string]Task, len(r.tasks))
	for _, t := range r.tasks {
		byName[t.Name] = t
	}

	selected := make([]Task, 0, len(selection))
	for _, name := range selection {
		task, ok := byName[name]
		if !ok {
			return nil, fmt.Errorf("unknown task %q (known: %s)",
				name, strings.Join(r.Names(), ", "))
		}
		selected = append(selected, task)
	}
	return selected, nil
}

// runTask converts a panic into an error so that one panicking task cannot
// take down the tasks scheduled after it.
func runTask(ctx context.Context, task Task) (err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("panicked: %v", r)
		}
	}()
	return task.Run(ctx)
}
