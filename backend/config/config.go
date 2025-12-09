package config

import (
	"fmt"
	"log"
	"net/url"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL string
	JWTSecret   string
	Port        string
	AllowOrigins []string
}

func Load() *Config {
	// Tentar carregar arquivo .env (ignora erro se não existir)
	if err := godotenv.Load(); err != nil {
		log.Println("Arquivo .env não encontrado, usando variáveis de ambiente do sistema")
	}

	databaseURL := getEnv("DATABASE_URL", "")
	// Normalizar URL do banco (suporta mysql:// e DSN, lida com @ na senha)
	databaseURL = normalizeDatabaseURL(databaseURL)

	// Carregar AllowOrigins do .env (separado por vírgulas)
	allowOriginsStr := getEnv("ALLOW_ORIGINS", "")
	allowOrigins := parseAllowOrigins(allowOriginsStr)

	return &Config{
		DatabaseURL: databaseURL,
		JWTSecret:   getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
		Port:        getEnv("PORT", "8080"),
		AllowOrigins: allowOrigins,
	}
}

// normalizeDatabaseURL converte formato mysql:// para DSN e lida com @ na senha
func normalizeDatabaseURL(dbURL string) string {
	if dbURL == "" {
		return ""
	}

	// Se já está no formato DSN (contém @tcp), processa @@ na senha
	if strings.Contains(dbURL, "@tcp(") {
		// Se tem @@ antes de @tcp, o primeiro @ faz parte da senha, o segundo é o separador
		// Formato: usuario:senha@@tcp(...) -> usuario:senha%40@tcp(...)
		// O driver MySQL precisa que o @ na senha seja URL-encoded como %40
		// Exemplo: sysadmin:igorcano1@@tcp(...) -> sysadmin:igorcano1%40@tcp(...)
		if strings.Contains(dbURL, "@@tcp(") {
			// Encontrar a posição de @@tcp(
			idx := strings.Index(dbURL, "@@tcp(")
			if idx > 0 {
				// Substituir o primeiro @ (da senha) por %40 (URL encoding)
				// Manter o segundo @ como separador
				// dbURL[:idx] = tudo até o primeiro @ (sem incluir)
				// dbURL[idx+1:] = tudo a partir do primeiro @ (incluindo o segundo @)
				dbURL = dbURL[:idx] + "%40" + dbURL[idx+1:]
			}
		}
		return dbURL
	}

	// Se começa com mysql://, converte para DSN
	if strings.HasPrefix(dbURL, "mysql://") {
		// Parse da URL completa (URL encoding é tratado automaticamente)
		parsedURL, err := url.Parse(dbURL)
		if err != nil {
			log.Printf("Erro ao parsear DATABASE_URL: %v, usando como está", err)
			return dbURL
		}

		// Extrair componentes
		username := parsedURL.User.Username()
		password, hasPassword := parsedURL.User.Password()
		host := parsedURL.Hostname()
		port := parsedURL.Port()
		database := strings.TrimPrefix(parsedURL.Path, "/")

		// Se não tem porta, usar padrão 3306
		if port == "" {
			port = "3306"
		}

		// Se não tem senha, construir sem senha
		if !hasPassword {
			dsn := fmt.Sprintf("%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
				username, host, port, database)
			return dsn
		}

		// URL decode a senha (para lidar com %40 -> @)
		decodedPassword, err := url.QueryUnescape(password)
		if err == nil {
			password = decodedPassword
		}

		// Construir DSN no formato: usuario:senha@tcp(host:porta)/database?charset=utf8mb4&parseTime=True&loc=Local
		dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
			username, password, host, port, database)

		return dsn
	}

	// Se não é nenhum dos formatos conhecidos, retorna como está
	return dbURL
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

// parseAllowOrigins converte string separada por vírgulas em slice de strings
func parseAllowOrigins(originsStr string) []string {
	if originsStr == "" {
		return []string{}
	}
	
	origins := strings.Split(originsStr, ",")
	result := make([]string, 0, len(origins))
	
	for _, origin := range origins {
		origin = strings.TrimSpace(origin)
		if origin != "" {
			result = append(result, origin)
		}
	}
	
	return result
}

