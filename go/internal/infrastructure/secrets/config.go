package secrets

type Config struct {
	// Type of the secret manager.
	Type string `env:"SECRET_MANAGER, default=FILESYSTEM"`

	// FilesystemRoot is the root path where secrets are managed on the filesystem.
	FilesystemRoot string `env:"SECRET_FILESYSTEM_ROOT"`
}
