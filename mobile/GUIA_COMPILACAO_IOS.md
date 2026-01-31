# 📱 Guia de Compilação para iOS

Este guia explica como compilar o app CMD Import Mobile para iOS.

## ⚠️ Requisitos

### 1. Hardware e Software
- **Mac** com macOS (obrigatório - não é possível compilar iOS no Linux/Windows)
- **Xcode** instalado (disponível na App Store)
- **Flutter** instalado e configurado
- **CocoaPods** (geralmente instalado automaticamente com Xcode)

### 2. Verificar Instalação

```bash
# Verificar Flutter
flutter doctor

# Verificar Xcode
xcodebuild -version

# Verificar CocoaPods (se necessário)
pod --version
```

## 🚀 Passos para Compilar

### 1. Navegar até o diretório do projeto

```bash
cd /home/sysadmin/cmdimport/mobile
```

### 2. Instalar dependências do Flutter

```bash
flutter pub get
```

### 3. Instalar dependências do iOS (CocoaPods)

```bash
cd ios
pod install
cd ..
```

**Nota:** Se o Podfile não existir, o Flutter criará automaticamente quando você executar `pod install`.

### 4. Verificar dispositivos disponíveis

```bash
flutter devices
```

Você verá algo como:
- iPhone 15 Pro (simulador)
- iPhone 14 (simulador)
- iPhone físico (se conectado)

### 5. Executar no simulador/dispositivo

```bash
# Executar no primeiro dispositivo disponível
flutter run

# Ou especificar um dispositivo específico
flutter run -d "iPhone 15 Pro"

# Ou usar o ID do dispositivo
flutter run -d <device-id>
```

### 6. Compilar para desenvolvimento (Debug)

```bash
flutter build ios
```

Isso cria um build de debug que pode ser executado no simulador ou dispositivo físico.

### 7. Compilar para produção (Release)

#### 7.1. Build IPA (para distribuição)

```bash
flutter build ipa
```

O arquivo `.ipa` será gerado em:
```
build/ios/ipa/cmdimport_mobile.ipa
```

#### 7.2. Build para App Store

```bash
flutter build ipa --release
```

### 8. Compilar apenas para simulador (mais rápido)

```bash
flutter build ios --simulator
```

## 🔧 Configurações Importantes

### 1. Arquivo .env

Certifique-se de ter um arquivo `.env` na raiz de `mobile/`:

```env
API_URL=http://seu-ip:8080/api
```

**Para iOS Simulator:**
- Se o backend estiver no Mac: `http://localhost:8080/api`
- Se o backend estiver em outro lugar: `http://IP-DO-SEU-MAC:8080/api`

### 2. Permissões de Rede (HTTP)

Se sua API usar HTTP (não HTTPS), você precisa adicionar no `Info.plist`:

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

**Nota:** O `Info.plist` já está configurado com as permissões de câmera e galeria.

### 3. Bundle Identifier

Verifique o Bundle Identifier em `ios/Runner.xcodeproj/project.pbxproj` ou abra o projeto no Xcode:
- Abra `ios/Runner.xcworkspace` no Xcode
- Selecione o projeto "Runner"
- Na aba "Signing & Capabilities", verifique o Bundle Identifier

### 4. Code Signing

Para testar em dispositivo físico ou distribuir:

1. Abra `ios/Runner.xcworkspace` no Xcode
2. Selecione o projeto "Runner"
3. Vá em "Signing & Capabilities"
4. Selecione sua equipe de desenvolvedor Apple
5. O Xcode configurará automaticamente o provisioning profile

**Importante:** Você precisa de uma conta de desenvolvedor Apple (gratuita para desenvolvimento, $99/ano para distribuição).

## 📦 Distribuição

### Opção 1: TestFlight (Recomendado)
```bash
# 1. Build IPA
flutter build ipa

# 2. Abrir no Xcode ou usar Transporter para upload
# 3. Configurar no App Store Connect
```

### Opção 2: Ad Hoc (até 100 dispositivos)
```bash
flutter build ipa --release
# Depois configure no Xcode com provisioning profile Ad Hoc
```

### Opção 3: Enterprise Distribution
```bash
flutter build ipa --release
# Requer conta Enterprise ($299/ano)
```

## 🐛 Solução de Problemas

### Erro: "No Podfile found"
```bash
cd ios
pod init
pod install
cd ..
```

### Erro: "CocoaPods not installed"
```bash
sudo gem install cocoapods
```

### Erro: "Xcode license not accepted"
```bash
sudo xcodebuild -license accept
```

### Erro: "No devices found"
- Abra o Simulator: `open -a Simulator`
- Ou conecte um iPhone físico via USB

### Erro de Code Signing
- Abra o projeto no Xcode: `open ios/Runner.xcworkspace`
- Configure o signing manualmente na aba "Signing & Capabilities"

### Limpar build anterior
```bash
flutter clean
flutter pub get
cd ios
pod deintegrate
pod install
cd ..
```

## 📝 Comandos Úteis

```bash
# Ver informações do build
flutter build ios --verbose

# Ver logs detalhados
flutter run --verbose

# Limpar projeto
flutter clean

# Verificar configuração
flutter doctor -v

# Listar dispositivos
flutter devices

# Atualizar dependências
flutter pub upgrade
```

## ✅ Checklist Rápido

- [ ] Flutter instalado e configurado
- [ ] Xcode instalado
- [ ] CocoaPods instalado (ou será instalado automaticamente)
- [ ] Arquivo `.env` criado com `API_URL`
- [ ] `flutter pub get` executado
- [ ] `pod install` executado na pasta `ios/`
- [ ] Dispositivo/simulador disponível
- [ ] Code signing configurado (para dispositivo físico)

## 🎯 Próximos Passos

Após compilar com sucesso:
1. Teste no simulador primeiro
2. Teste em dispositivo físico
3. Configure distribuição (TestFlight recomendado)
4. Veja `DISTRIBUICAO_INTERNA_IOS.md` para mais detalhes sobre distribuição

---

**Nota Importante:** A compilação para iOS **só funciona em um Mac**. Se você está em Linux/Windows, você precisará:
- Usar um Mac físico
- Usar um Mac virtualizado (não recomendado, pode violar termos da Apple)
- Usar um serviço de CI/CD como Codemagic, Bitrise, ou GitHub Actions com runners macOS


