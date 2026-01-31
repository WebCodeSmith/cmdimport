# CMD Import Mobile (Flutter)

App mobile Flutter para o sistema CMD Import, compartilhando a mesma API Go do backend.

## Estrutura do Projeto

```
mobile/
├── lib/
│   ├── core/
│   │   ├── config/
│   │   │   └── api_config.dart      # Configuração da URL da API
│   │   ├── models/
│   │   │   ├── user.dart            # Model de usuário
│   │   │   └── api_response.dart    # Model de resposta da API
│   │   └── services/
│   │       ├── api_service.dart     # Serviço HTTP para chamadas à API
│   │       └── auth_service.dart    # Serviço de autenticação
│   ├── screens/
│   │   └── auth/
│   │       └── login_screen.dart    # Tela de login
│   └── main.dart                    # Ponto de entrada do app
└── pubspec.yaml                     # Dependências do projeto
```

## Funcionalidades Implementadas

- ✅ Estrutura básica do projeto
- ✅ Configuração da API (compartilha com web/web_angular)
- ✅ Serviço de autenticação (login/logout)
- ✅ Tela de login
- ✅ Armazenamento local (token e dados do usuário)
- ✅ Dashboard básico (placeholder)

## Como Executar

1. **Instalar dependências:**
   ```bash
   cd mobile
   flutter pub get
   ```

2. **Executar no dispositivo/emulador:**
   ```bash
   flutter run
   ```

3. **Para Android:**
   ```bash
   flutter run -d android
   ```

4. **Para iOS:**
   ```bash
   flutter run -d ios
   ```

## Configuração da API

A URL da API é detectada automaticamente:
- **Desenvolvimento local:** `http://localhost:8080/api`
- **Produção:** Pode ser configurada via variável de ambiente `API_URL`

Para configurar em produção:
```bash
flutter run --dart-define=API_URL=https://cmdimport.online/api
```

## Próximos Passos

- [ ] Tela de registro
- [ ] Dashboard completo (estatísticas, gráficos)
- [ ] Tela de cadastro de vendas
- [ ] Histórico de vendas
- [ ] Gestão de estoque
- [ ] Notificações toast
- [ ] Navegação com go_router
- [ ] Gerenciamento de estado com Provider

## Dependências Principais

- `http`: Cliente HTTP para chamadas à API
- `shared_preferences`: Armazenamento local
- `provider`: Gerenciamento de estado (a ser implementado)
- `go_router`: Navegação (a ser implementado)

## Integração com Backend

O app Flutter consome a mesma API Go que os frontends web:
- Endpoint de login: `POST /api/auth/login`
- Endpoint de registro: `POST /api/auth/register`
- Endpoint de vendas: `GET /api/vendas/historico`
- E todos os outros endpoints disponíveis
