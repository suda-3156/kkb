package logging

import (
	"log/slog"
	"os"
	"time"
)

// New creates a new logger with the specified log level and mode.
// level: "default", "debug", "info", "notice", "warning", "error", "critical", "alert", "emergency" (default: "info")
// mode: "dev", "prod" (default: "prod")
func New(level string, mode string) *Logger {
	var config Config
	switch mode {
	case "dev":
		config = devConfig
	case "prod":
		config = prodConfig
	default:
		config = prodConfig
	}

	return &Logger{config.newLogger(toSlogLevel(level))}
}

// NewFromEnv creates a new logger using environment variables.
func NewFromEnv() *Logger {
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
		if l, ok := a.Value.Any().(slog.Level); ok {
			a.Value = slog.StringValue(levelStringer(l))
		}
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
	case "default":
		return LevelDefault
	case "debug":
		return LevelDebug
	case "info":
		return LevelInfo
	case "notice":
		return LevelNotice
	case "warning":
		return LevelWarning
	case "error":
		return LevelError
	case "critical":
		return LevelCritical
	case "alert":
		return LevelAlert
	case "emergency":
		return LevelEmergency
	default:
		return LevelInfo
	}
}
