# 📱 Guia para Criar Ícone do App iOS

## 🎨 Tamanho da Imagem Original

**Crie uma imagem quadrada de 1024x1024 pixels** (PNG, sem transparência)

Este é o tamanho base. O Xcode vai gerar automaticamente todos os outros tamanhos a partir desta imagem.

---

## 📐 Tamanhos Necessários (iOS)

Se você quiser criar manualmente, precisa dos seguintes tamanhos:

### iPhone
- **20x20** → 40x40px (@2x) e 60x60px (@3x)
- **29x29** → 29x29px (@1x), 58x58px (@2x) e 87x87px (@3x)
- **40x40** → 80x80px (@2x) e 120x120px (@3x)
- **60x60** → 120x120px (@2x) e 180x180px (@3x)

### iPad
- **20x20** → 20x20px (@1x) e 40x40px (@2x)
- **29x29** → 29x29px (@1x) e 58x58px (@2x)
- **40x40** → 40x40px (@1x) e 80x80px (@2x)
- **76x76** → 76x76px (@1x) e 152x152px (@2x)
- **83.5x83.5** → 167x167px (@2x) - iPad Pro

### App Store
- **1024x1024** → 1024x1024px (@1x) - **OBRIGATÓRIO**

---

## 🚀 Método Mais Fácil (Recomendado)

### Opção 1: Usar Ferramenta Online
1. Acesse: https://www.appicon.co/ ou https://appicon.build/
2. Faça upload da sua imagem 1024x1024
3. Baixe o pacote completo
4. Substitua os arquivos em `ios/Runner/Assets.xcassets/AppIcon.appiconset/`

### Opção 2: Usar Xcode
1. Abra o projeto no Xcode
2. Vá em `Runner` → `Assets.xcassets` → `AppIcon`
3. Arraste sua imagem 1024x1024 para o slot "App Store"
4. O Xcode vai gerar automaticamente todos os tamanhos

### Opção 3: Usar Flutter Package
```bash
# Instale o flutter_launcher_icons
flutter pub add dev:flutter_launcher_icons

# Configure no pubspec.yaml e execute
flutter pub run flutter_launcher_icons
```

---

## 📋 Checklist

- [ ] Imagem 1024x1024px criada
- [ ] Formato PNG (sem transparência)
- [ ] Design sem texto pequeno (não aparece em tamanhos pequenos)
- [ ] Cantos arredondados serão aplicados automaticamente pelo iOS
- [ ] Imagem sem bordas/padding (preencha toda a área)

---

## 📁 Onde Colocar

Substitua os arquivos em:
```
mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/
```

Arquivos que precisam ser substituídos:
- `Icon-App-1024x1024@1x.png` (1024x1024px) - **MAIS IMPORTANTE**
- Todos os outros serão gerados automaticamente se usar Xcode ou ferramenta online

---

## ⚠️ Dicas Importantes

1. **Sem transparência**: O ícone não pode ter transparência (alpha channel)
2. **Cantos arredondados**: O iOS aplica automaticamente, não precisa criar arredondado
3. **Sem texto**: Evite texto pequeno, não aparece bem em tamanhos pequenos
4. **Alta qualidade**: Use imagem vetorial ou PNG de alta resolução
5. **Teste**: Sempre teste o ícone no dispositivo real antes de publicar

---

## 🔄 Após Trocar o Ícone

1. Limpe o build:
   ```bash
   cd mobile/ios
   rm -rf build
   flutter clean
   ```

2. Rebuild:
   ```bash
   flutter build ios
   ```

3. Teste no simulador/dispositivo para verificar se apareceu corretamente

