package logging

import (
	"log/slog"
	"os"
	"time"
)

// New creates a new logger with the specified log level and mode.
// level: "debug", "info", "warn", "error" (default: "info")
// mode: "dev", "prod" (default: "prod")
func New(level string, mode string) *slog.Logger {
	var config Config
	switch mode {
	case "dev":
		config = devConfig
	case "prod":
		config = prodConfig
	default:
		config = prodConfig
	}

	return config.newLogger(toSlogLevel(level))
}

// NewFromEnv creates a new logger using environment variables.
// LOG_LEVEL: "debug", "info", "warn", "error" (default: "info")
// LOG_MODE: "dev", "prod" (default: "prod")
func NewFromEnv() *slog.Logger {
	level := os.Getenv("LOG_LEVEL")
	if level == "" {
		level = "info"
	}

	mode := os.Getenv("LOG_MODE")
	if mode == "" {
		mode = "prod"
	}

	return New(level, mode)
}

const (
	levelKey   = "severity"
	messageKey = "message"
	timeKey    = "timestamp"

	apiPrefix = "logging.googleapis.com/"
	sourceKey = apiPrefix + "sourceLocation"
	// traceKey  = apiPrefix + "trace"
)

type Format string

const (
	FormatJSON   Format = "json"
	FormatTEXT   Format = "text"
	FormatPretty Format = "pretty"
)

type Config struct {
	format Format

	levelKey   string
	messageKey string
	timeKey    string
	sourceKey  string

	addSource bool

	timeFmt string
}

var devConfig = Config{
	format: FormatPretty,

	levelKey:   "L",
	messageKey: "M",
	timeKey:    "T",
	sourceKey:  "S",

	addSource: true,

	timeFmt: "15:04:05.000",
}

var prodConfig = Config{
	format: FormatJSON,

	levelKey:   levelKey,
	messageKey: messageKey,
	timeKey:    timeKey,
	sourceKey:  sourceKey,

	addSource: true,

	timeFmt: time.RFC3339Nano,
}

func (c *Config) replaceAttr(_ []string, a slog.Attr) slog.Attr {
	switch a.Key {
	case slog.LevelKey:
		a.Key = c.levelKey
	case slog.MessageKey:
		a.Key = c.messageKey
	case slog.TimeKey:
		a.Key = c.timeKey
		if t, ok := a.Value.Any().(time.Time); ok {
			a.Value = slog.StringValue(t.Format(c.timeFmt))
		}
	case slog.SourceKey:
		a.Key = c.sourceKey
	}

	return a
}

func (c *Config) newLogger(level slog.Level) *slog.Logger {
	var handler slog.Handler
	switch c.format {
	case FormatPretty:
		handler = newPrettyHandler(os.Stdout, &slog.HandlerOptions{
			AddSource: c.addSource,
			Level:     level,
		}, c.timeFmt)
	case FormatJSON:
		handler = slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
			AddSource:   c.addSource,
			Level:       level,
			ReplaceAttr: c.replaceAttr,
		})
	case FormatTEXT:
		handler = slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
			AddSource:   c.addSource,
			Level:       level,
			ReplaceAttr: c.replaceAttr,
		})
	default:
		handler = slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
			AddSource:   c.addSource,
			Level:       level,
			ReplaceAttr: c.replaceAttr,
		})
	}

	return slog.New(handler)
}

func toSlogLevel(level string) slog.Level {
	switch level {
	case "debug":
		return slog.LevelDebug
	case "info":
		return slog.LevelInfo
	case "warn":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
