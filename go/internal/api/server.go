package api

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/extension"
	"github.com/99designs/gqlgen/graphql/handler/lru"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/suda-3156/kkb/go/graph"
	"github.com/suda-3156/kkb/go/graph/resolver"
	"github.com/suda-3156/kkb/go/internal/encryption"
	"github.com/suda-3156/kkb/go/internal/serverenv"
	"github.com/vektah/gqlparser/v2/ast"
)

type Server struct {
	cfg *Config
	env *serverenv.ServerEnv

	em *encryption.EncryptionManager
}

func New(ctx context.Context, cfg *Config, env *serverenv.ServerEnv) (*Server, error) {
	slog.InfoContext(ctx, "initializing GraphQL server")

	if env.Database() == nil {
		return nil, fmt.Errorf("missing database connection in server environment")
	}
	if env.KeyManager() == nil {
		return nil, fmt.Errorf("missing key manager in server environment")
	}

	// Initialize the encryption manager.
	slog.DebugContext(ctx, "initializing encryption manager")

	if len(cfg.EncryptionManger.AAD) == 0 {
		return nil, fmt.Errorf("encryption AAD must be provided via ENCRYPTION_AAD environment variable")
	}
	emConfig := &encryption.Config{
		Database:     env.Database(),
		KeyManager:   env.KeyManager(),
		WrapperKeyID: cfg.EncryptionManger.WrapperKeyID,
		CacheTTL:     cfg.EncryptionManger.CacheTTL,
		AAD:          cfg.EncryptionManger.AAD,
	}
	em := encryption.New(emConfig)

	slog.DebugContext(ctx, "encryption manager initialized successfully")

	slog.InfoContext(ctx, "GraphQL server initialized successfully")

	return &Server{
		cfg: cfg,
		env: env,
		em:  em,
	}, nil
}

func (s *Server) ServeMux(ctx context.Context) *http.ServeMux {

	srv := handler.New(graph.NewExecutableSchema(graph.Config{
		Resolvers: resolver.New(
			s.env.Database(), s.em,
		),
		Complexity: graph.ComplexityConfig(),
	}))

	srv.AddTransport(transport.Options{})
	srv.AddTransport(transport.GET{})
	srv.AddTransport(transport.POST{})

	srv.SetQueryCache(lru.New[*ast.QueryDocument](1000))
	srv.Use(extension.FixedComplexityLimit(50))
	srv.Use(extension.Introspection{})
	srv.Use(extension.AutomaticPersistedQuery{
		Cache: lru.New[string](100),
	})

	mux := http.NewServeMux()
	mux.Handle("/", playground.Handler("GraphQL playground", "/query"))
	mux.Handle("/query", srv)

	slog.InfoContext(
		ctx,
		"GraphQL server initialized",
		slog.String("playground", "/"),
		slog.String("queryEndpoint", "/query"),
	)

	return mux
}
