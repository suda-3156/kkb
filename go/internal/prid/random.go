package prid

import (
	"crypto/rand"
	"math/big"
)

const (
	// Allowed characters for the random part of the PRID (URL-safe characters).
	allowedChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
)

// allowedCharsSet provides O(1) lookup for valid characters.
var allowedCharsSet = func() map[rune]struct{} {
	m := make(map[rune]struct{}, len(allowedChars))
	for _, r := range allowedChars {
		m[r] = struct{}{}
	}
	return m
}()

func generateRandomString(n int) string {
	charsetLen := big.NewInt(int64(len(allowedChars)))
	result := make([]byte, n)
	for i := range result {
		idx, err := rand.Int(rand.Reader, charsetLen)
		if err != nil {
			panic(err)
		}
		result[i] = allowedChars[idx.Int64()]
	}
	return string(result)
}

// isValidRandomPart checks if the random part of the PRID is valid (URL-safe characters).
func isValidRandomPart(s string) bool {
	if len(s) != rLen {
		return false
	}

	for _, r := range s {
		if _, ok := allowedCharsSet[r]; !ok {
			return false
		}
	}
	return true
}
