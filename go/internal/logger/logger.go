package logger

import (
	"context"
	"log"
	"log/slog"
	"time"
)

type logHandler struct {
	slog.Handler
}

// traceIDKey is a custom type for context keys to avoid collisions
type traceIDKey struct{}

// TraceIDKey is the key used to store trace ID in context
var TraceIDKey = traceIDKey{}

func Setup(logLevel string) *slog.Logger {
	lggr := slog.New(
		New(
			slog.NewJSONHandler(log.Writer(), Options(logLevel)),
			// projectID,
		),
	)
	slog.SetDefault(lggr)
	return lggr
}

func New(h slog.Handler) *logHandler {
	return &logHandler{Handler: h}
}

//nolint:gocritic // hugeParam: slog.Handler interface requires value receiver for slog.Record
func (h *logHandler) Handle(ctx context.Context, r slog.Record) error {
	v, ok := ctx.Value(TraceIDKey).(string)
	if !ok || v == "" {
		return h.Handler.Handle(ctx, r)
	}

	r.AddAttrs(slog.String("trace_id", v))

	return h.Handler.Handle(ctx, r)
}

// logLevelMap maps string log level names to slog.Level values.
var logLevelMap = map[string]slog.Level{
	"debug": slog.LevelDebug,
	"info":  slog.LevelInfo,
	"warn":  slog.LevelWarn,
	"error": slog.LevelError,
}

// severityMap maps slog.Level to GCP-compatible severity strings.
var severityMap = map[slog.Level]string{
	slog.LevelDebug: "DEBUG",
	slog.LevelInfo:  "INFO",
	slog.LevelWarn:  "WARN",
	slog.LevelError: "ERROR",
}

func parseLogLevel(defaultLogLevel string) slog.Level {
	if level, ok := logLevelMap[defaultLogLevel]; ok {
		return level
	}
	slog.Warn("Unknown log level, defaulting to debug",
		slog.String("log_level", defaultLogLevel),
	)
	return slog.LevelDebug
}

func replaceAttr(_ []string, a slog.Attr) slog.Attr {
	switch a.Key {
	case slog.LevelKey:
		a.Key = "severity" // GCP compatible
		if lvl, ok := a.Value.Any().(slog.Level); ok {
			if severity, exists := severityMap[lvl]; exists {
				a.Value = slog.StringValue(severity)
			}
		}
	case "time":
		if t, ok := a.Value.Any().(time.Time); ok {
			a.Value = slog.StringValue(t.Format("2006-01-02 15:04:05"))
		}
	case "msg":
		a.Key = "message" // GCP compatible
	}
	return a
}

func Options(defaultLogLevel string) *slog.HandlerOptions {
	return &slog.HandlerOptions{
		ReplaceAttr: replaceAttr,
		Level:       parseLogLevel(defaultLogLevel),
	}
}
