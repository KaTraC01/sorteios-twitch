# PLANO DE CORREÇÃO SISTEMÁTICA - PROJETO SORTEIOS
**Data:** 15/09/2025  
**Status:** MÚLTIPLOS PROBLEMAS CRÍTICOS IDENTIFICADOS

## 🚨 RESUMO EXECUTIVO
O sistema possui **51 problemas identificados** que afetam segurança, performance e estabilidade:
- **4 CRÍTICOS** (Security Definer Views)
- **22 WARNINGS** (Functions sem search_path)
- **25+ PERFORMANCE** (RLS múltiplas, auth re-evaluation)

---

## 📋 PLANO DE CORREÇÃO POR PRIORIDADE

### **FASE 1: SEGURANÇA CRÍTICA (IMEDIATO)**
#### **P1.1 - Corrigir Security Definer Views (4 problemas)**
- `vw_dashboard_metricas` ✅ CORRIGIDO
- `vw_dashboard_periodos` ✅ CORRIGIDO  
- `vw_dashboard_totais` ✅ CORRIGIDO
- `seguranca_implementacoes` ❌ PENDENTE

#### **P1.2 - Functions com search_path vulnerável (22 problemas)**
- Lista de 22 funções sem `SET search_path = public`
- **Risco:** SQL injection e privilege escalation
- **Status:** ❌ PENDENTE

#### **P1.3 - Extensões e Versões Vulneráveis**
- `pg_graphql` versão 1.5.9 → atualizar para 1.5.11
- `pgaudit` no schema public → mover para schema dedicado
- **Status:** ❌ PENDENTE

### **FASE 2: PERFORMANCE E RLS (24H)**
#### **P2.1 - Políticas RLS Múltiplas (16 problemas)**
- `atividades_suspeitas` - múltiplas políticas permissivas
- `configuracoes` - políticas duplicadas
- `eventos_anuncios` - políticas conflitantes
- **Impacto:** Performance degradada
- **Status:** ❌ PENDENTE

#### **P2.2 - Auth RLS Performance (9 problemas)**
- Substituir `auth.role()` por `(select auth.role())`
- Tabelas afetadas: configuracoes, atividades_suspeitas, rate_limiting, etc.
- **Status:** ❌ PENDENTE

#### **P2.3 - Tabelas sem Primary Key (5 problemas)**
- `rate_limiting_settings_backup`, `function_backups`, `view_backups`
- **Status:** ❌ PENDENTE

### **FASE 3: ENDPOINTS E APIs (48H)**
#### **P3.1 - Auditoria de Segurança APIs (15 endpoints)**
- Verificar autenticação em todos os endpoints
- Validar rate limiting
- Verificar sanitização de inputs
- **Status:** ❌ PENDENTE

#### **P3.2 - Consolidação de APIs duplicadas**
- `inserir_eventos_anuncios_lote_otimizado.js` (2 versões)
- APIs de correção múltiplas
- **Status:** ❌ PENDENTE

### **FASE 4: FRONTEND E COMPONENTES (72H)**
#### **P4.1 - Auditoria de Componentes**
- Verificar erros no console
- Análise de performance
- Verificar estado das variáveis de ambiente
- **Status:** ❌ PENDENTE

### **FASE 5: MONITORAMENTO E OTIMIZAÇÃO (1 SEMANA)**
#### **P5.1 - Sistema de Monitoramento**
- Implementar alertas para problemas críticos
- Logs estruturados
- Métricas de performance
- **Status:** ❌ PENDENTE

---

## 🎯 PRÓXIMAS AÇÕES IMEDIATAS

### **AÇÃO 1: Corrigir Functions Search Path**
```sql
-- Corrigir todas as 22 funções vulneráveis
ALTER FUNCTION nome_funcao() SET search_path = public;
```

### **AÇÃO 2: Consolidar Políticas RLS**
```sql
-- Remover políticas duplicadas e consolidar
DROP POLICY policy_duplicada ON tabela;
CREATE POLICY policy_unificada ON tabela ...;
```

### **AÇÃO 3: Atualizar Extensões**
```sql
-- Atualizar pg_graphql para versão segura
ALTER EXTENSION pg_graphql UPDATE TO '1.5.11';
```

---

## 📊 MÉTRICAS DE PROGRESSO
- **Total de problemas:** 51
- **Críticos resolvidos:** 3/4 (75%)
- **Warnings pendentes:** 47/47 (0%)
- **Performance issues:** 25+/25+ (0%)

---

## ⚠️ RISCOS IDENTIFICADOS
1. **SQL Injection** - 22 funções vulneráveis
2. **Performance degradada** - Políticas RLS múltiplas
3. **Versões vulneráveis** - Extensões desatualizadas
4. **APIs não auditadas** - 15 endpoints sem verificação completa

---

**ESTE PLANO DEVE SER EXECUTADO SISTEMATICAMENTE PARA GARANTIR UM SISTEMA SEGURO E PERFORMÁTICO.**
