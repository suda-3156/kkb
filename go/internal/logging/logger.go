package logging

import (
	"context"
	"log/slog"
	"runtime"
	"time"
)

// Logger wraps *slog.Logger and adds custom severity levels:
// Notice, Critical, Alert, Emergency.
//
// With and WithGroup are overridden so they return *Logger,
// keeping method chaining with the custom levels intact.
type Logger struct {
	*slog.Logger
}

// With returns a new Logger with the given attributes pre-stored.
func (l *Logger) With(args ...any) *Logger {
	return &Logger{l.Logger.With(args...)}
}

// WithGroup returns a new Logger with subsequent attributes nested under name.
func (l *Logger) WithGroup(name string) *Logger {
	return &Logger{l.Logger.WithGroup(name)}
}

// logSkip is the single internal implementation for all log calls.
// skip is passed to runtime.Callers to find the actual caller's PC:
//   - Logger method → caller  : skip = 3  (Callers, logSkip, Method, caller)
//   - Package-level → Logger method → caller : skip = 4
func (l *Logger) logSkip(ctx context.Context, skip int, level slog.Level, msg string, args ...any) {
	if !l.Enabled(ctx, level) {
		return
	}
	var pcs [1]uintptr
	runtime.Callers(skip, pcs[:])
	r := slog.NewRecord(time.Now(), level, msg, pcs[0])
	r.Add(args...)
	_ = l.Handler().Handle(ctx, r)
}

// Log logs at LevelDefault.
func (l *Logger) Log(ctx context.Context, msg string, args ...any) {
	l.logSkip(ctx, 3, LevelDefault, msg, args...)
}

// Debug logs at LevelDebug.
func (l *Logger) Debug(ctx context.Context, msg string, args ...any) {
	l.logSkip(ctx, 3, LevelDebug, msg, args...)
}

// Info logs at LevelInfo.
func (l *Logger) Info(ctx context.Context, msg string, args ...any) {
	l.logSkip(ctx, 3, LevelInfo, msg, args...)
}

// Notice logs at LevelNotice.
func (l *Logger) Notice(ctx context.Context, msg string, args ...any) {
	l.logSkip(ctx, 3, LevelNotice, msg, args...)
}

// Warning logs at LevelWarning.
func (l *Logger) Warning(ctx context.Context, msg string, args ...any) {
	l.logSkip(ctx, 3, LevelWarning, msg, args...)
}

// Error logs at LevelError.
func (l *Logger) Error(ctx context.Context, msg string, args ...any) {
	l.logSkip(ctx, 3, LevelError, msg, args...)
}

// Critical logs at LevelCritical.
func (l *Logger) Critical(ctx context.Context, msg string, args ...any) {
	l.logSkip(ctx, 3, LevelCritical, msg, args...)
}

// Alert logs at LevelAlert.
func (l *Logger) Alert(ctx context.Context, msg string, args ...any) {
	l.logSkip(ctx, 3, LevelAlert, msg, args...)
}

// Emergency logs at LevelEmergency.
func (l *Logger) Emergency(ctx context.Context, msg string, args ...any) {
	l.logSkip(ctx, 3, LevelEmergency, msg, args...)
}

// Package-level default logger
var defaultLogger = &Logger{slog.Default()}

// SetDefault sets the package-level default logger and also calls
// slog.SetDefault so that bare slog.* calls use the same handler.
func SetDefault(l *Logger) {
	defaultLogger = l
	slog.SetDefault(l.Logger)
}

// Default returns the current package-level logger.
func Default() *Logger {
	return defaultLogger
}

// Package-level logging functions (all accept context as first argument)

func Debug(ctx context.Context, msg string, args ...any) {
	defaultLogger.logSkip(ctx, 4, LevelDebug, msg, args...)
}

func Info(ctx context.Context, msg string, args ...any) {
	defaultLogger.logSkip(ctx, 4, LevelInfo, msg, args...)
}

func Notice(ctx context.Context, msg string, args ...any) {
	defaultLogger.logSkip(ctx, 4, LevelNotice, msg, args...)
}

func Warning(ctx context.Context, msg string, args ...any) {
	defaultLogger.logSkip(ctx, 4, LevelWarning, msg, args...)
}

func Error(ctx context.Context, msg string, args ...any) {
	defaultLogger.logSkip(ctx, 4, LevelError, msg, args...)
}

func Critical(ctx context.Context, msg string, args ...any) {
	defaultLogger.logSkip(ctx, 4, LevelCritical, msg, args...)
}

func Alert(ctx context.Context, msg string, args ...any) {
	defaultLogger.logSkip(ctx, 4, LevelAlert, msg, args...)
}

func Emergency(ctx context.Context, msg string, args ...any) {
	defaultLogger.logSkip(ctx, 4, LevelEmergency, msg, args...)
}
