package keys

type Config struct {
	// Type is the type of the key manager.
	Type string `env:"KEY_MANAGER, default=FILESYSTEM"`

	// FilesystemRoot is the root path where keys are managed on the filesystem.
	FilesystemRoot string `env:"KEY_FILESYSTEM_ROOT"`
}
