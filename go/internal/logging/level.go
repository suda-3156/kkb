package logging

import "log/slog"

// Values follow Google Cloud Logging's numeric severity convention.
// See: https://docs.cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#logseverity
//
//  DEFAULT   =   0 (The log entry has no assigned severity level.)
//	DEBUG     = 100 (Debug or trace information.)
//	INFO      = 200 (Routine information, such as ongoing status or performance.)
//	NOTICE    = 300 (Normal but significant events, such as start up, shut down, or a configuration change.)
//	WARNING   = 400 (Warning events might cause problems.)
//	ERROR     = 500 (Error events are likely to cause problems.)
//	CRITICAL  = 600 (Critical events cause more severe problems or outages.)
//	ALERT     = 700 (A person must take an action immediately.)
//	EMERGENCY = 800 (One or more systems are unusable.)

const (
	LevelDefault   = slog.Level(0)
	LevelDebug     = slog.Level(100)
	LevelInfo      = slog.Level(200)
	LevelNotice    = slog.Level(300)
	LevelWarning   = slog.Level(400)
	LevelError     = slog.Level(500)
	LevelCritical  = slog.Level(600)
	LevelAlert     = slog.Level(700)
	LevelEmergency = slog.Level(800)
)

var levelNames = map[slog.Level]string{
	LevelDefault:   "DEFAULT",
	LevelDebug:     "DEBUG",
	LevelInfo:      "INFO",
	LevelNotice:    "NOTICE",
	LevelWarning:   "WARNING",
	LevelError:     "ERROR",
	LevelCritical:  "CRITICAL",
	LevelAlert:     "ALERT",
	LevelEmergency: "EMERGENCY",
}

func levelStringer(level slog.Level) string {
	if s, ok := levelNames[level]; ok {
		return s
	}
	return "DEFAULT"
}
