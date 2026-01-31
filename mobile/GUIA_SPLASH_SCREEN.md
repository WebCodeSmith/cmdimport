# 🚀 Guia para Customizar Splash Screen (Tela de Entrada)

## ✅ Sim, pode ser outra imagem!

A splash screen (tela de entrada) pode ser completamente customizada com qualquer imagem que você quiser, não precisa ser o ícone do app.

---

## 📱 Para Android

### Método 1: Usar imagem personalizada

1. **Coloque sua imagem** em:
   ```
   android/app/src/main/res/mipmap-xxxhdpi/launch_image.png
   ```
   (Crie as pastas se não existirem: mipmap-hdpi, mipmap-xhdpi, mipmap-xxhdpi, mipmap-xxxhdpi)

2. **Edite** `android/app/src/main/res/drawable/launch_background.xml`:
   ```xml
   <?xml version="1.0" encoding="utf-8"?>
   <layer-list xmlns:android="http://schemas.android.com/apk/res/android">
       <!-- Cor de fundo -->
       <item android:drawable="@android:color/white" />
       
       <!-- Sua imagem centralizada -->
       <item>
           <bitmap
               android:gravity="center"
               android:src="@mipmap/launch_image" />
       </item>
   </layer-list>
   ```

### Método 2: Usar cor de fundo + logo

Edite `launch_background.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Cor de fundo (pode ser qualquer cor) -->
    <item android:drawable="@color/splash_background" />
    
    <!-- Logo centralizado -->
    <item>
        <bitmap
            android:gravity="center"
            android:src="@mipmap/launch_image" />
    </item>
</layer-list>
```

---

## 🍎 Para iOS

### Método 1: Usar LaunchImage

1. **Substitua as imagens** em:
   ```
   ios/Runner/Assets.xcassets/LaunchImage.imageset/
   ```
   - `LaunchImage.png` (1x)
   - `LaunchImage@2x.png` (2x)
   - `LaunchImage@3x.png` (3x)

2. **Tamanhos recomendados:**
   - 1x: 320x568px (iPhone SE)
   - 2x: 750x1334px (iPhone 8)
   - 3x: 1242x2208px (iPhone 8 Plus)

### Método 2: Editar LaunchScreen.storyboard

Edite o arquivo `ios/Runner/Base.lproj/LaunchScreen.storyboard` para adicionar uma imagem personalizada.

---

## 🎨 Recomendações

1. **Tamanho da imagem:**
   - Use imagens de alta qualidade
   - Mantenha proporção adequada para diferentes telas
   - Evite texto pequeno (pode não aparecer bem)

2. **Cores:**
   - Use cores que combinem com o tema do app
   - Considere modo claro/escuro se aplicável

3. **Performance:**
   - Mantenha a imagem leve (< 500KB)
   - Use PNG ou WebP

---

## 📋 Exemplo Prático

### Android - Adicionar logo na splash:

1. Coloque `logo_splash.png` em `android/app/src/main/res/mipmap-xxxhdpi/`

2. Edite `launch_background.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="#FFFFFF" /> <!-- Fundo branco -->
    
    <item>
        <bitmap
            android:gravity="center"
            android:src="@mipmap/logo_splash" />
    </item>
</layer-list>
```

3. Limpe e reconstrua:
```bash
flutter clean
flutter run
```

---

## 🔄 Após Fazer Mudanças

Sempre execute:
```bash
flutter clean
flutter run
```

Isso garante que as mudanças na splash screen sejam aplicadas.

---

## 💡 Dica

Se você quiser uma splash screen mais elaborada com animações, considere usar o pacote `flutter_native_splash`:

```bash
flutter pub add dev:flutter_native_splash
```

Ele facilita muito a configuração de splash screens personalizadas!

