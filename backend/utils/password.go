package utils

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
)

const (
	saltLength = 16
	timeCost   = 3
	memory     = 64 * 1024
	threads    = 4
	keyLength  = 32
)

// HashPassword cria um hash da senha usando Argon2 (compatível com argon2 do Node.js)
func HashPassword(password string) (string, error) {
	// Gerar salt aleatório
	salt := make([]byte, saltLength)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}

	// Gerar hash usando Argon2ID (compatível com argon2 do Node.js)
	hash := argon2.IDKey([]byte(password), salt, timeCost, memory, threads, keyLength)

	// Formato: $argon2id$v=19$m=65536,t=3,p=4$base64(salt)$base64(hash)
	saltB64 := base64.RawStdEncoding.EncodeToString(salt)
	hashB64 := base64.RawStdEncoding.EncodeToString(hash)
	
	return fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s", 
		argon2.Version, memory, timeCost, threads, saltB64, hashB64), nil
}

// VerifyPassword verifica se a senha corresponde ao hash
// Retorna true se a senha está correta, false caso contrário
func VerifyPassword(hashedPassword, password string) bool {
	// Validações básicas
	if hashedPassword == "" || password == "" {
		return false
	}
	
	// Parse do hash
	salt, hash, err := parseArgon2Hash(hashedPassword)
	if err != nil {
		return false
	}

	// Validar tamanho do salt
	if len(salt) < saltLength {
		return false
	}

	// Gerar hash da senha fornecida com os mesmos parâmetros
	computedHash := argon2.IDKey([]byte(password), salt, timeCost, memory, threads, keyLength)

	// Comparar hashes usando comparação em tempo constante (proteção contra timing attacks)
	return constantTimeCompare(hash, computedHash)
}

// parseArgon2Hash extrai salt e hash do formato argon2
func parseArgon2Hash(encoded string) ([]byte, []byte, error) {
	// Formato: $argon2id$v=19$m=65536,t=3,p=4$salt$hash
	if !strings.HasPrefix(encoded, "$argon2id$") {
		// Tentar formato alternativo (compatibilidade com hashes antigos)
		return decodeSimpleHash(encoded)
	}
	
	// Parsing manual mais eficiente
	parts := strings.Split(encoded, "$")
	if len(parts) < 6 {
		return nil, nil, fmt.Errorf("formato de hash inválido")
	}
	
	saltB64 := parts[4]
	hashB64 := parts[5]
	
	// Decodificar salt (tentar RawStdEncoding primeiro, mais comum)
	salt, err := base64.RawStdEncoding.DecodeString(saltB64)
	if err != nil {
		// Fallback para StdEncoding (com padding)
		salt, err = base64.StdEncoding.DecodeString(saltB64)
		if err != nil {
			return nil, nil, fmt.Errorf("erro ao decodificar salt")
		}
	}

	// Decodificar hash
	hash, err := base64.RawStdEncoding.DecodeString(hashB64)
	if err != nil {
		hash, err = base64.StdEncoding.DecodeString(hashB64)
		if err != nil {
			return nil, nil, fmt.Errorf("erro ao decodificar hash")
		}
	}

	return salt, hash, nil
}

// decodeSimpleHash decodifica hash no formato simples (compatibilidade com hashes antigos)
func decodeSimpleHash(encoded string) ([]byte, []byte, error) {
	data, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return nil, nil, err
	}
	
	if len(data) < saltLength+keyLength {
		return nil, nil, fmt.Errorf("hash inválido")
	}
	
	salt := data[:saltLength]
	hash := data[saltLength:]
	return salt, hash, nil
}

// constantTimeCompare compara dois slices de bytes em tempo constante
// Isso previne timing attacks que poderiam revelar diferenças nos hashes
func constantTimeCompare(a, b []byte) bool {
	// Se os tamanhos são diferentes, não são iguais
	if len(a) != len(b) {
		return false
	}
	
	// Comparação em tempo constante usando XOR
	var result byte
	for i := 0; i < len(a); i++ {
		result |= a[i] ^ b[i]
	}
	return result == 0
}

