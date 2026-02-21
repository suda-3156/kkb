package server

import (
	"fmt"

	"github.com/suda-3156/kkb/go/internal/serverenv"
)

type Server struct {
	config *Config
	env    *serverenv.ServerEnv
}

func New(config *Config, env *serverenv.ServerEnv) (*Server, error) {
	if env.Database() == nil {
		return nil, fmt.Errorf("missing database connection in server environment")
	}

	return &Server{
		config: config,
		env:    env,
	}, nil
}

func (s *Server) Routes()