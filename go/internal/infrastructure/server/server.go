package server

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"time"
)

type Server struct {
	port string
}

func New(port string) *Server {
	return &Server{
		port: port,
	}
}

// ServeHTTP observes HTTP requests and handles graceful shutdown on context cancellation.
func (s *Server) ServeHTTP(ctx context.Context, handler http.Handler) error {
	srv := &http.Server{
		Addr:    ":" + s.port,
		Handler: handler,
	}

	// The channel to receive shutdown errors
	errCh := make(chan error, 1)

	// Start a goroutine to listen for shutdown signals
	go func() {
		<-ctx.Done() // Wait for the context to be cancelled

		slog.InfoContext(ctx, "received shutdown signal, shutting down server...", slog.String("port", s.port))

		// Create a context with timeout for the shutdown process
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		// Attempt to gracefully shutdown the server
		errCh <- srv.Shutdown(shutdownCtx)
	}()

	slog.InfoContext(ctx, "server is running", slog.String("port", s.port))

	// Start the server and listen for incoming requests
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return fmt.Errorf("failed to serve: %w", err)
	}

	// Wait for the shutdown process to complete and check for errors
	if err := <-errCh; err != nil {
		return fmt.Errorf("failed to shutdown server: %w", err)
	}

	slog.InfoContext(ctx, "server stopped gracefully")
	return nil
}
