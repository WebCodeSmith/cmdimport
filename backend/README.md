# Backend Go - CMD Import

Backend em Go para o sistema CMD Import.

## Estrutura

```
backend/
├── main.go              # Ponto de entrada
├── config/              # Configurações
├── database/            # Conexão e migrações
├── models/              # Modelos GORM
├── handlers/            # Handlers HTTP
│   ├── auth.go          # Autenticação
│   ├── product.go        # Produtos
│   ├── stock.go          # Estoque
│   ├── sale.go           # Vendas
│   └── upload.go         # Upload de arquivos
├── routes/              # Definição de rotas
├── middleware/          # Middlewares (auth, etc)
└── utils/               # Utilitários
```

## Configuração

1. Instalar dependências:
```bash
cd backend
go mod download
go mod tidy
```

2. Configurar variáveis de ambiente:
```bash
cp .env.example .env
# Editar .env com suas credenciais do banco de dados
```

O arquivo `.env` será carregado automaticamente. Se não existir, o sistema usará as variáveis de ambiente do sistema.

**Importante:** O arquivo `.env` deve conter a URL do banco de dados no formato DSN:

```
DATABASE_URL=usuario:senha@tcp(localhost:3306)/cmdimport?charset=utf8mb4&parseTime=True&loc=Local
```

**Senha com @:** Se sua senha contém `@`, use `@@` no arquivo `.env`:
```
DATABASE_URL=sysadmin:igorcano1@@tcp(localhost:3306)/cmd_import?charset=utf8mb4&parseTime=True&loc=Local
```

O sistema trata automaticamente o `@@` convertendo para um único `@` na senha.

**Formato mysql:// também é suportado** (será convertido automaticamente para DSN):
```
DATABASE_URL=mysql://sysadmin:igorcano1@localhost:3306/cmd_import
```

Alternativamente, você pode exportar as variáveis manualmente:
```bash
export DATABASE_URL="usuario:senha@tcp(localhost:3306)/cmdimport?charset=utf8mb4&parseTime=True&loc=Local"
export PORT=8080
```

3. Executar:
```bash
# Desenvolvimento
go run main.go

# Ou usando Makefile
make dev

# Build e executar
make build
make run
```

## Rotas Implementadas

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro
- `GET /api/admin/usuarios` - Listar usuários (admin)
- `GET /api/admin/atendentes` - Listar atendentes (admin)

### Produtos (Admin)
- `GET /api/admin/produtos` - Listar produtos (com paginação e filtros)
- `POST /api/admin/produtos/cadastrar` - Cadastrar produto
- `GET /api/admin/produtos/:id` - Buscar produto por ID
- `PUT /api/admin/produtos/:id` - Atualizar produto
- `PUT /api/admin/produtos/:id/precificacao` - Atualizar precificação
- `POST /api/admin/distribuir` - Distribuir produto para vendedor
- `POST /api/admin/redistribuir` - Redistribuir produto entre vendedores

### Estoque
- `GET /api/estoque?usuarioId=X` - Listar estoque do usuário
- `GET /api/estoque/buscar-por-codigo-barras?codigoBarras=X&usuarioId=Y` - Buscar por código de barras
- `GET /api/estoque/buscar-por-imei?imei=X&usuarioId=Y` - Buscar por IMEI
- `GET /api/admin/estoque-usuarios` - Listar estoque de todos os usuários (admin)

### Vendas
- `POST /api/vendas/cadastrar` - Cadastrar venda
- `GET /api/vendas/historico?usuarioId=X` - Histórico de vendas do vendedor
- `GET /api/vendas/venda/:id` - Buscar venda por ID
- `GET /api/admin/historico` - Histórico completo (admin, com filtros)
- `GET /api/admin/historico/resumo-vendedores` - Resumo por vendedor (admin)
- `GET /api/admin/venda/:id` - Buscar venda por ID (admin)

### Upload
- `POST /api/upload/foto` - Upload de foto de produto

## Segurança

- Validação de entrada em todas as rotas
- Sanitização de dados
- Verificação de permissões (middleware de autenticação)
- Validação de tipos de arquivo no upload
- Limite de tamanho de arquivo (5MB)

## Performance

- Pool de conexões configurado
- Queries otimizadas com índices
- Paginação em todas as listagens
- Preload de relacionamentos apenas quando necessário

## Próximos Passos

1. Implementar JWT para autenticação mais robusta
2. Adicionar testes unitários e de integração
3. Documentação Swagger/OpenAPI
4. Logging estruturado
5. Métricas e monitoramento

