package logging

import (
	"context"
	"log/slog"
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

// log is a helper method to log at a specific level.
func (l *Logger) log(ctx context.Context, level slog.Level, msg string, args ...any) {
	l.Logger.Log(ctx, level, msg, args...)
}

// Log logs at LevelDefault.
func (l *Logger) Log(ctx context.Context, msg string, args ...any) {
	l.Logger.Log(ctx, LevelDefault, msg, args...)
}

// Debug logs at LevelDebug.
func (l *Logger) Debug(ctx context.Context, msg string, args ...any) {
	l.log(ctx, LevelDebug, msg, args...)
}

// Info logs at LevelInfo.
func (l *Logger) Info(ctx context.Context, msg string, args ...any) {
	l.log(ctx, LevelInfo, msg, args...)
}

// Notice logs at LevelNotice.
func (l *Logger) Notice(ctx context.Context, msg string, args ...any) {
	l.log(ctx, LevelNotice, msg, args...)
}

// Warning logs at LevelWarning.
func (l *Logger) Warning(ctx context.Context, msg string, args ...any) {
	l.log(ctx, LevelWarning, msg, args...)
}

// Error logs at LevelError.
func (l *Logger) Error(ctx context.Context, msg string, args ...any) {
	l.log(ctx, LevelError, msg, args...)
}

// Critical logs at LevelCritical.
func (l *Logger) Critical(ctx context.Context, msg string, args ...any) {
	l.log(ctx, LevelCritical, msg, args...)
}

// Alert logs at LevelAlert.
func (l *Logger) Alert(ctx context.Context, msg string, args ...any) {
	l.log(ctx, LevelAlert, msg, args...)
}

// Emergency logs at LevelEmergency.
func (l *Logger) Emergency(ctx context.Context, msg string, args ...any) {
	l.log(ctx, LevelEmergency, msg, args...)
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
	defaultLogger.Debug(ctx, msg, args...)
}

func Info(ctx context.Context, msg string, args ...any) {
	defaultLogger.Info(ctx, msg, args...)
}

func Notice(ctx context.Context, msg string, args ...any) {
	defaultLogger.Notice(ctx, msg, args...)
}

func Warning(ctx context.Context, msg string, args ...any) {
	defaultLogger.Warning(ctx, msg, args...)
}

func Error(ctx context.Context, msg string, args ...any) {
	defaultLogger.Error(ctx, msg, args...)
}

func Critical(ctx context.Context, msg string, args ...any) {
	defaultLogger.Critical(ctx, msg, args...)
}

func Alert(ctx context.Context, msg string, args ...any) {
	defaultLogger.Alert(ctx, msg, args...)
}

func Emergency(ctx context.Context, msg string, args ...any) {
	defaultLogger.Emergency(ctx, msg, args...)
}
