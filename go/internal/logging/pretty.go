package logging

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"reflect"
	"runtime"
	"strings"
	"sync"
)

// groupOrAttr holds either a pending group name or a concrete attribute.
// Groups are rendered as YAML-style keys that indent subsequent entries.
type groupOrAttr struct {
	group string    // non-empty: this is a group opener
	attr  slog.Attr // valid when group == ""
}

// prettyHandler is a custom slog.Handler that formats log records as
// human-readable, YAML-like output.
//
// Output format:
//
//	<timestamp> <LEVEL> [<file>:<line>] <message>
//	  key: value
//	  group:
//	    nested_key: nested_value
type prettyHandler struct {
	mu      *sync.Mutex
	w       io.Writer
	opts    slog.HandlerOptions
	timeFmt string
	goas    []groupOrAttr // accumulated WithGroup / WithAttrs state
}

func newPrettyHandler(w io.Writer, opts *slog.HandlerOptions, timeFmt string) *prettyHandler {
	h := &prettyHandler{
		mu:      &sync.Mutex{},
		w:       w,
		timeFmt: timeFmt,
	}
	if opts != nil {
		h.opts = *opts
	}
	return h
}

func (h *prettyHandler) clone() *prettyHandler {
	cloned := *h
	cloned.goas = make([]groupOrAttr, len(h.goas))
	copy(cloned.goas, h.goas)
	return &cloned
}

// Enabled reports whether the handler handles records at the given level.
func (h *prettyHandler) Enabled(_ context.Context, level slog.Level) bool {
	return level >= h.opts.Level.Level()
}

// Handle formats and writes a single log record.
//
//nolint:gocritic // r slog.Record is heavy to copy, but slog.Handler.Handle requires it to be passed by value.
func (h *prettyHandler) Handle(_ context.Context, r slog.Record) error {
	var sb strings.Builder

	// Timestamp
	if !r.Time.IsZero() && h.timeFmt != "" {
		sb.WriteString(r.Time.Format(h.timeFmt))
		sb.WriteString(" ")
	}

	// Level (padded to 5 characters)
	sb.WriteString(prettyLevel(r.Level))
	sb.WriteString(" ")

	// Source location
	if h.opts.AddSource && r.PC != 0 {
		fs := runtime.CallersFrames([]uintptr{r.PC})
		f, _ := fs.Next()
		if f.File != "" {
			file := f.File
			if idx := strings.LastIndex(file, "/"); idx >= 0 {
				file = file[idx+1:]
			}
			fmt.Fprintf(&sb, "[%s:%d] ", file, f.Line)
		}
	}

	// Message
	sb.WriteString(r.Message)

	// Attributes: pre-stored (WithGroup / WithAttrs) + record-level
	hasPreAttrs := len(h.goas) > 0
	hasRecordAttrs := r.NumAttrs() > 0
	if hasPreAttrs || hasRecordAttrs {
		sb.WriteByte('\n')

		// Replay pre-stored group/attr state
		indent := 1
		for _, goa := range h.goas {
			if goa.group != "" {
				writePrettyIndent(&sb, indent)
				sb.WriteString(goa.group)
				sb.WriteString(":\n")
				indent++
			} else {
				writePrettyAttr(&sb, goa.attr, indent)
			}
		}

		// Record-level attributes
		r.Attrs(func(a slog.Attr) bool {
			writePrettyAttr(&sb, a, indent)
			return true
		})
	} else {
		sb.WriteByte('\n')
	}

	h.mu.Lock()
	defer h.mu.Unlock()
	_, err := io.WriteString(h.w, sb.String())
	return err
}

// WithAttrs returns a new handler with the given attributes pre-stored.
func (h *prettyHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	c := h.clone()
	for _, a := range attrs {
		c.goas = append(c.goas, groupOrAttr{attr: a})
	}
	return c
}

// WithGroup returns a new handler where subsequent attributes are nested
// under the given group name.
func (h *prettyHandler) WithGroup(name string) slog.Handler {
	if name == "" {
		return h
	}
	c := h.clone()
	c.goas = append(c.goas, groupOrAttr{group: name})
	return c
}

// prettyLevel returns the level string padded to 5 characters.
//
//	DEBUG      → "DEBUG"
//	INFO       → "INFO "
//	NOTICE     → "NOTIC"
//	WARN       → "WARN "
//	ERROR      → "ERROR"
//	CRITICAL   → "CRIT "
//	ALERT      → "ALERT"
//	EMERGENCY  → "EMERG"
func prettyLevel(level slog.Level) string {
	switch level {
	case LevelDefault:
		return ""
	case LevelDebug:
		return "DEBUG"
	case LevelInfo:
		return "INFO "
	case LevelNotice:
		return "NOTIC"
	case LevelWarning:
		return "WARN "
	case LevelError:
		return "ERROR"
	case LevelCritical:
		return "CRIT "
	case LevelAlert:
		return "ALERT"
	case LevelEmergency:
		return "EMERG"
	default:
		s := level.String()
		if len(s) >= 5 {
			return s[:5]
		}
		return s + strings.Repeat(" ", 5-len(s))
	}
}

// writePrettyIndent writes 2-space indentation for the given depth.
func writePrettyIndent(sb *strings.Builder, depth int) {
	for range depth {
		sb.WriteString("  ")
	}
}

// writePrettyAttr recursively writes a single attribute in YAML-like format.
func writePrettyAttr(sb *strings.Builder, a slog.Attr, indent int) {
	a.Value = a.Value.Resolve()

	// Skip zero-value attrs
	if a.Equal(slog.Attr{}) {
		return
	}

	if a.Value.Kind() == slog.KindGroup {
		children := a.Value.Group()
		if len(children) == 0 {
			return
		}
		// Inline group (empty key) → flatten one level
		if a.Key == "" {
			for _, child := range children {
				writePrettyAttr(sb, child, indent)
			}
			return
		}
		writePrettyIndent(sb, indent)
		sb.WriteString(a.Key)
		sb.WriteString(":\n")
		for _, child := range children {
			writePrettyAttr(sb, child, indent+1)
		}
		return
	}

	writePrettyIndent(sb, indent)
	sb.WriteString(a.Key)
	expanded := reflectExpand(a.Value.Any())
	if expanded.Kind() == slog.KindGroup {
		children := expanded.Group()
		if len(children) == 0 {
			sb.WriteString(": {}\n")
			return
		}
		sb.WriteString(":\n")
		for _, child := range children {
			writePrettyAttr(sb, child, indent+1)
		}
		return
	}
	sb.WriteString(": ")
	//nolint:gocritic,staticcheck // For better readability, not use fmt.Fprintf
	sb.WriteString(fmt.Sprintf("%v", expanded.Any()))
	sb.WriteByte('\n')
}

// reflectExpand converts any value to a slog.Value, recursively expanding
// structs (and pointers to structs), slices, arrays, and maps so that all
// fields are visible in the pretty log output.
func reflectExpand(v any) slog.Value {
	if v == nil {
		return slog.AnyValue(nil)
	}
	// Let slog.LogValuer implementations describe themselves.
	if lv, ok := v.(slog.LogValuer); ok {
		return reflectExpand(lv.LogValue().Resolve().Any())
	}
	return reflectValue(reflect.ValueOf(v))
}

// reflectValue recursively converts a reflect.Value into a slog.Value.
func reflectValue(rv reflect.Value) slog.Value {
	// Dereference pointer chains.
	for rv.Kind() == reflect.Pointer {
		if rv.IsNil() {
			return slog.StringValue("<nil>")
		}
		rv = rv.Elem()
	}
	// Unwrap interfaces.
	if rv.Kind() == reflect.Interface {
		if rv.IsNil() {
			return slog.StringValue("<nil>")
		}
		rv = rv.Elem()
	}
	switch rv.Kind() {
	case reflect.Struct:
		rt := rv.Type()
		attrs := make([]slog.Attr, 0, rt.NumField())
		for i := range rt.NumField() {
			f := rt.Field(i)
			if !f.IsExported() {
				continue
			}
			attrs = append(attrs, slog.Attr{
				Key:   f.Name,
				Value: reflectValue(rv.Field(i)),
			})
		}
		return slog.GroupValue(attrs...)
	case reflect.Slice, reflect.Array:
		if rv.Len() == 0 {
			return slog.StringValue("[]")
		}
		attrs := make([]slog.Attr, 0, rv.Len())
		for i := range rv.Len() {
			attrs = append(attrs, slog.Attr{
				Key:   fmt.Sprintf("[%d]", i),
				Value: reflectValue(rv.Index(i)),
			})
		}
		return slog.GroupValue(attrs...)
	case reflect.Map:
		if rv.Len() == 0 {
			return slog.StringValue("{}")
		}
		attrs := make([]slog.Attr, 0, rv.Len())
		for _, key := range rv.MapKeys() {
			attrs = append(attrs, slog.Attr{
				Key:   fmt.Sprintf("%v", key.Interface()),
				Value: reflectValue(rv.MapIndex(key)),
			})
		}
		return slog.GroupValue(attrs...)
	default:
		return slog.AnyValue(rv.Interface())
	}
}
