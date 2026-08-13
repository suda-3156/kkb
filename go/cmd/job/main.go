// The daily periodic job, run as a Cloud Run Job. It ships inside the backend
// image (containers/backend.dockerfile) and the Job resource overrides the
// command to /bin/job; the schedule lives in terraform (var.tasks_schedule).
//
// This file is wiring only: it never touches the environment. Each task owns
// its Config and initializes its own dependencies inside Run (internal/tasks/*),
// so a task's requirements stay compiler-checked per task. If tasks ever need
// per-task alerting, cadence, or timeouts, the intended evolution is one
// cmd/<task> binary and one Cloud Run Job per task over this same image;
// keeping main this thin is what keeps that split cheap.
package main

import (
	"context"
	"flag"
	"log/slog"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"github.com/suda-3156/kkb/go/internal/job"
	"github.com/suda-3156/kkb/go/internal/logging"
	"github.com/suda-3156/kkb/go/internal/tasks/subscriptions"
)

var tasksFlag = flag.String("tasks", "", "comma-separated task names to run (default: all)")

func main() {
	flag.Parse()

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer func() {
		stop()
		if r := recover(); r != nil {
			logging.Critical(ctx, "job panicked", slog.Any("error", r))
		}
	}()

	logging.SetDefault(logging.NewFromEnv())

	runner := job.NewRunner(
		job.Task{Name: subscriptions.Name, Run: subscriptions.Run},
	)

	var selection []string
	if *tasksFlag != "" {
		selection = strings.Split(*tasksFlag, ",")
	}

	err := runner.Run(ctx, selection)
	stop()

	if err != nil {
		logging.Critical(ctx, "job error", slog.Any("error", err))
		//nolint:gocritic // A non-zero exit is what marks the execution failed.
		os.Exit(1)
	}

	logging.Info(ctx, "job finished successfully")
}
