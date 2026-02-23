package keys

type Config struct {
	// Type of the key manager.
	Type string `env:"KEY_MANAGER, default=FILESYSTEM"`

	// The root path where keys are managed on the filesystem.
	FilesystemRoot string `env:"KEY_FILESYSTEM_ROOT"`
}
