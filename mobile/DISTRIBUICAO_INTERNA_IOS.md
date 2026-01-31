# Distribuição Interna iOS - Sem App Store

Se o app é apenas para uso interno da empresa, você **NÃO precisa** passar pela App Store. Existem 3 opções melhores:

## 🎯 Opção 1: TestFlight (RECOMENDADO)

**O que é:** Plataforma da Apple para distribuição beta/testes
**Custo:** Incluído na conta de desenvolvedor ($99/ano)
**Limite:** Até 10.000 testadores
**Vantagens:**
- ✅ Fácil de configurar
- ✅ Atualizações automáticas
- ✅ Feedback dos usuários
- ✅ Não precisa passar pela revisão da App Store
- ✅ Pode ter versões diferentes para diferentes grupos

**Como funciona:**
1. Crie uma conta de desenvolvedor Apple ($99/ano)
2. Faça upload do app no App Store Connect
3. Adicione testadores por email
4. Eles recebem convite e instalam pelo app TestFlight

**Requisitos:**
- Conta de desenvolvedor Apple
- App Store Connect configurado
- Build assinado corretamente

---

## 🏢 Opção 2: Enterprise Distribution

**O que é:** Para empresas grandes que querem distribuir internamente
**Custo:** $299/ano (conta Enterprise)
**Limite:** Ilimitado dentro da empresa
**Vantagens:**
- ✅ Distribuição ilimitada
- ✅ Não precisa de App Store Connect
- ✅ Mais controle

**Desvantagens:**
- ❌ Mais caro ($299/ano)
- ❌ Requisitos mais rigorosos da Apple
- ❌ Precisa provar que é empresa legítima

**Quando usar:** Se você tem muitos funcionários e quer distribuir sem limitações

---

## 📱 Opção 3: Ad Hoc Distribution

**O que é:** Instalação direta em dispositivos específicos
**Custo:** Incluído na conta de desenvolvedor ($99/ano)
**Limite:** Até 100 dispositivos por ano
**Vantagens:**
- ✅ Mais simples
- ✅ Não precisa de App Store Connect
- ✅ Instalação direta via arquivo .ipa

**Desvantagens:**
- ❌ Limite de 100 dispositivos
- ❌ Precisa registrar UDID de cada dispositivo
- ❌ Atualizações manuais (não automáticas)

**Como funciona:**
1. Registre os UDIDs dos iPhones da equipe
2. Gere um build Ad Hoc
3. Distribua o arquivo .ipa
4. Instale via iTunes/Xcode ou ferramentas como Diawi

---

## 💡 Recomendação para seu caso:

**Use TestFlight** - É a melhor opção porque:
- ✅ Fácil de configurar
- ✅ Atualizações automáticas
- ✅ Suporta até 10.000 usuários (mais que suficiente)
- ✅ Não precisa passar pela revisão rigorosa da App Store
- ✅ Custo razoável ($99/ano)

**Sobre o NSAllowsArbitraryLoads:**
- Para TestFlight/Enterprise/Ad Hoc, a Apple é **menos rigorosa**
- Mas ainda recomendo usar HTTPS quando possível
- Se precisar de HTTP temporariamente, pode manter (mas não é ideal)

---

## 📋 Passos para TestFlight:

1. **Criar conta de desenvolvedor:**
   - Acesse: https://developer.apple.com
   - Pague $99/ano

2. **Configurar App Store Connect:**
   - Crie um novo app
   - Configure Bundle ID, nome, etc.

3. **Fazer build e upload:**
   ```bash
   flutter build ipa
   # Depois faça upload via Xcode ou Transporter
   ```

4. **Adicionar testadores:**
   - No App Store Connect, adicione emails dos funcionários
   - Eles recebem convite e instalam pelo TestFlight

---

## ⚠️ Importante:

- **TestFlight ainda tem revisão**, mas é mais rápida e menos rigorosa
- **Enterprise** não tem revisão, mas é mais caro
- **Ad Hoc** não tem revisão, mas é limitado a 100 dispositivos

Para uma equipe pequena/média, **TestFlight é perfeito**! 🎯

