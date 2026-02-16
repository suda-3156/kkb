//go:build ignore

// This file is for testing the KMS (for now, local encryption and decryption) implementation.

package main

import (
	"context"
	"fmt"
	"os"

	"github.com/suda-3156/kkb/go/internal/config"
	"github.com/suda-3156/kkb/go/internal/infrastructure/kms"
)

func main() {

	mode := os.Args[1]
	key := os.Args[2]
	target := os.Args[3]

	cfg := &config.Secret{
		ENV: "local",
		DEK: []byte(key),
	}

	k := kms.New(cfg)

	switch mode {
	case "encrypt", "enc":
		// fmt.Printf("target (string): %s\n", target)
		// fmt.Printf("target (bytes): %v\n", []byte(target))
		fmt.Printf("target byte length: %d\n", len([]byte(target)))

		encrypted, err := k.Encrypt(context.Background(), target)
		if err != nil {
			panic(err)
		}

		fmt.Printf("encrypted (bytes): %v\n", encrypted)
		fmt.Printf("byte length: %d\n", len(encrypted))

	case "decrypt", "dec":
		fmt.Printf("target (string): %s\n", target)
		fmt.Printf("target (bytes): %v\n", []byte(target))

		decrypted, err := k.Decrypt(context.Background(), []byte(target))
		if err != nil {
			panic(err)
		}

		fmt.Printf("decrypted: %s\n", decrypted)

	default:
		fmt.Printf("invalid mode: %s\n", mode)
	}
}
