# 🚀 GUIA DE MIGRAÇÃO CSP - REPORT-ONLY PARA ENFORCEMENT

**Data:** 23 de Setembro de 2025  
**Objetivo:** Migrar CSP de Report-Only para Enforcement após validação

---

## 📋 **CHECKLIST PRÉ-MIGRAÇÃO**

### **✅ Validações Necessárias**
- [ ] **24h de Report-Only** executado sem violações críticas
- [ ] **Todas as funcionalidades testadas**: sorteio, anúncios, tracking, relatórios
- [ ] **GTM funcionando** corretamente com analytics
- [ ] **Supabase Realtime** conectando sem problemas
- [ ] **Zero violations** de recursos essenciais

### **⚠️ Sinais de Alerta (NÃO MIGRAR)**
- ❌ Violations do GTM ou Google Analytics
- ❌ Falhas de conexão WebSocket (Supabase)
- ❌ Anúncios não carregando
- ❌ APIs retornando errors de CORS
- ❌ Recursos essenciais bloqueados

---

## 🔄 **PROCESSO DE MIGRAÇÃO**

### **Passo 1: Backup e Preparação**
```bash
# 1. Backup da configuração atual
cp vercel.json vercel-backup-$(date +%Y%m%d).json

# 2. Verificar se tudo está funcionando
curl -I https://sorteios-twitch.vercel.app
```

### **Passo 2: Aplicar Enforcement**
```bash
# 1. Substituir Report-Only por Enforcement
cp vercel-csp-enforcement.json vercel.json

# 2. Commit das mudanças
git add vercel.json
git commit -m "SECURITY: Migrar CSP para enforcement mode

- Remove Content-Security-Policy-Report-Only
- Adiciona Content-Security-Policy ativo
- Mantém mesmas diretivas após validação
- Adiciona COEP e COOP headers extras"

# 3. Deploy
git push origin main
```

### **Passo 3: Monitoramento Pós-Deploy**
```bash
# 1. Verificar headers ativos
curl -I https://sorteios-twitch.vercel.app | grep -i csp

# 2. Testar funcionalidades críticas
# - Abrir site e verificar console
# - Realizar sorteio teste
# - Verificar anúncios carregando
# - Testar GTM/Analytics
```

---

## 🛡️ **CSP FINAL - MODO ENFORCEMENT**

### **Headers Implementados**
```http
Content-Security-Policy: default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co; img-src 'self' data: https://*.supabase.co; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; font-src 'self' data:; form-action 'self'; frame-src https://www.googletagmanager.com; upgrade-insecure-requests

X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
Cross-Origin-Embedder-Policy: unsafe-none
Cross-Origin-Opener-Policy: same-origin-allow-popups
```

### **Melhorias Adicionais**
- ✅ **COEP**: Cross-Origin-Embedder-Policy para isolamento
- ✅ **COOP**: Cross-Origin-Opener-Policy para proteção de janelas
- ✅ **Remoção do report-uri**: Não mais necessário em enforcement

---

## 🚨 **PLANO DE ROLLBACK**

### **Rollback Rápido (< 5 minutos)**
```bash
# 1. Restaurar configuração anterior
git revert HEAD
git push origin main

# 2. Ou rollback manual via Vercel Dashboard
# - Ir para vercel.com/dashboard
# - Selecionar deployment anterior
# - Clicar "Promote to Production"
```

### **Rollback para Report-Only (Investigação)**
```bash
# 1. Voltar para modo Report-Only
cp vercel.json vercel-enforcement-broken.json
git checkout HEAD~1 -- vercel.json

# 2. Commit temporário
git add vercel.json
git commit -m "ROLLBACK: CSP para Report-Only para investigação"
git push origin main

# 3. Investigar violations
# Aguardar 24h coletando logs para análise
```

---

## 📊 **MONITORAMENTO PÓS-ENFORCEMENT**

### **Métricas a Observar (48h)**
1. **Errors de Console**: Zero violations em produção
2. **Funcionalidade do GTM**: Analytics funcionando
3. **Supabase Realtime**: WebSocket conectando
4. **Performance**: Sem degradação de carregamento
5. **User Experience**: Zero reclamações de funcionalidades quebradas

### **Logs Importantes**
```bash
# 1. Verificar logs do Vercel
vercel logs --follow

# 2. Monitorar console do navegador
# Abrir DevTools e verificar por:
# - CSP violations
# - Failed requests
# - WebSocket errors

# 3. Testar em diferentes navegadores
# - Chrome (Desktop/Mobile)
# - Firefox
# - Safari
# - Edge
```

---

## ✅ **VALIDAÇÃO FINAL**

### **Testes Obrigatórios Pós-Enforcement**
- [ ] **Homepage carrega** sem errors de console
- [ ] **Sorteio funciona** completamente
- [ ] **Anúncios aparecem** e são clicáveis
- [ ] **GTM tracking** enviando eventos
- [ ] **Supabase Realtime** conectando
- [ ] **Links externos** (Instagram) funcionam
- [ ] **APIs internas** respondendo normalmente

### **Critérios de Sucesso**
- ✅ **Zero CSP violations** em 24h de produção
- ✅ **Todas as funcionalidades** operacionais
- ✅ **Performance mantida** ou melhorada
- ✅ **Segurança aumentada** sem impacto UX

---

## 🏆 **BENEFÍCIOS DO CSP ENFORCEMENT**

### **Proteções Ativas**
1. **XSS Prevention**: Scripts maliciosos bloqueados automaticamente
2. **Data Exfiltration**: Conexões apenas para Supabase autorizado
3. **Clickjacking**: Frame injection bloqueado
4. **Resource Injection**: Apenas recursos confiáveis carregados

### **Compliance & Security**
- ✅ **OWASP Top 10**: Proteção contra injection attacks
- ✅ **Security Headers**: Grade A+ em security scanners
- ✅ **Modern Browser**: Proteções nativas ativadas
- ✅ **Zero Trust**: Princípio aplicado ao frontend

---

## 📞 **TROUBLESHOOTING**

### **Problema: GTM Não Carrega**
```bash
# Verificar se GTM está na whitelist
grep -i "googletagmanager" vercel.json

# Solução: Adicionar domínio se ausente
script-src 'self' 'unsafe-inline' https://www.googletagmanager.com
```

### **Problema: Supabase Realtime Falha**
```bash
# Verificar WebSocket permission
grep -i "wss" vercel.json

# Solução: Confirmar wss://*.supabase.co presente
connect-src 'self' https://*.supabase.co wss://*.supabase.co
```

### **Problema: Anúncios Quebrados**
```bash
# Verificar img-src e connect-src
# Solução: Adicionar domínios de CDN se necessário
img-src 'self' data: https://*.supabase.co
```

**🚀 MIGRAÇÃO PRONTA PARA EXECUÇÃO QUANDO VALIDAÇÃO FOR COMPLETA**
