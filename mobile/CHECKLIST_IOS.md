# ✅ Checklist de Configuração iOS

## 📋 Verificações Realizadas

### ✅ 1. Estrutura do Projeto
- [x] Pasta `ios/` presente
- [x] `Runner.xcodeproj` configurado
- [x] `Info.plist` com permissões corretas
- [x] `AppDelegate.swift` presente

### ✅ 2. Permissões iOS (Info.plist)
- [x] `NSPhotoLibraryUsageDescription` - Acesso à galeria de fotos
- [x] `NSCameraUsageDescription` - Acesso à câmera
- [x] Orientations configuradas (Portrait e Landscape)

### ✅ 3. Dependências (pubspec.yaml)
- [x] `http: ^1.2.0` - Requisições HTTP
- [x] `shared_preferences: ^2.2.2` - Armazenamento local
- [x] `provider: ^6.1.1` - Gerenciamento de estado
- [x] `go_router: ^13.0.0` - Navegação
- [x] `flutter_dotenv: ^5.1.0` - Variáveis de ambiente
- [x] `intl: ^0.19.0` - Formatação de moeda/datas
- [x] `image_picker: ^1.0.7` - Seleção de imagens
- [x] Assets `.env` configurado

### ✅ 4. Configuração de API
- [x] `ApiConfig` usando `flutter_dotenv`
- [x] Suporte a `.env` para URL da API
- [x] Headers de autenticação configurados

### ✅ 5. Código Flutter
- [x] `main.dart` inicializa `dotenv`
- [x] Rotas configuradas
- [x] Screens implementadas (Login, Dashboard, Cadastrar Venda, Histórico, Estoque)

## 🔧 O que fazer no Mac:

### 1. Instalar Dependências
```bash
cd mobile
flutter pub get
```

### 2. Instalar CocoaPods (se necessário)
```bash
cd ios
pod install
cd ..
```

### 3. Verificar Configuração Flutter
```bash
flutter doctor
```
Certifique-se de que:
- ✅ Flutter está instalado
- ✅ Xcode está instalado
- ✅ CocoaPods está instalado (se necessário)
- ✅ Licenças do Xcode aceitas

### 4. Criar arquivo .env
Crie um arquivo `.env` na raiz de `mobile/` com:
```env
API_URL=http://seu-ip:8080/api
```

**Importante:** Para iOS Simulator, use:
- `http://localhost:8080/api` (se o backend estiver no Mac)
- `http://10.0.2.2:8080/api` (NÃO funciona no iOS)
- `http://IP-DO-SEU-MAC:8080/api` (se o backend estiver em outro lugar)

### 5. Executar no Simulador
```bash
# Ver dispositivos disponíveis
flutter devices

# Executar no simulador
flutter run

# Ou especificar um dispositivo
flutter run -d "iPhone 15 Pro"
```

### 6. Build para iOS (quando necessário)
```bash
flutter build ios
```

## ⚠️ Observações Importantes

1. **Podfile**: O Flutter gera automaticamente quando necessário. Não precisa criar manualmente.

2. **Bundle Identifier**: Verifique em `ios/Runner.xcodeproj/project.pbxproj` se o `PRODUCT_BUNDLE_IDENTIFIER` está correto (geralmente `com.example.cmdimportMobile`).

3. **Signing**: Para testar em dispositivo físico, você precisará:
   - Conta de desenvolvedor Apple (gratuita para desenvolvimento)
   - Configurar signing no Xcode

4. **Network Security**: iOS bloqueia HTTP por padrão. Se sua API usar HTTP (não HTTPS), adicione no `Info.plist`:
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

## ✅ Status: PRONTO PARA iOS!

O projeto está configurado e pronto para rodar no Mac. Basta:
1. Transferir o projeto
2. Executar `flutter pub get`
3. Executar `pod install` (se necessário)
4. Criar o arquivo `.env`
5. Rodar `flutter run`

