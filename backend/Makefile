.PHONY: build run dev clean migrate

# Build do projeto
build:
	go build -o cmdimport-backend main.go

# Executar em modo desenvolvimento
dev:
	go run main.go

# Executar após build
run:
	./cmdimport-backend

# Limpar build
clean:
	rm -f cmdimport-backend

# Instalar dependências
deps:
	go mod download
	go mod tidy

# Gerar migrations (se necessário)
migrate:
	go run main.go

