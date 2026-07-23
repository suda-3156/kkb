package ptrutil

import "testing"

func TestTo(t *testing.T) {
	p := To(42)
	if p == nil {
		t.Fatal("To() returned nil")
	}
	if *p != 42 {
		t.Errorf("*To(42) = %d, want 42", *p)
	}

	s := To("hello")
	if *s != "hello" {
		t.Errorf(`*To("hello") = %q, want "hello"`, *s)
	}
}

func TestDeref(t *testing.T) {
	t.Run("non-nil returns pointed value", func(t *testing.T) {
		v := 7
		if got := Deref(&v, 99); got != 7 {
			t.Errorf("Deref(&7, 99) = %d, want 7", got)
		}
	})

	t.Run("nil returns default", func(t *testing.T) {
		if got := Deref(nil, 99); got != 99 {
			t.Errorf("Deref(nil, 99) = %d, want 99", got)
		}
	})

	t.Run("string default", func(t *testing.T) {
		if got := Deref(nil, "fallback"); got != "fallback" {
			t.Errorf("Deref(nil, fallback) = %q", got)
		}
	})
}
