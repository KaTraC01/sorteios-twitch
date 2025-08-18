# Scripts de Otimização - Sistema de Métricas de Anúncios

Este diretório contém todos os scripts SQL e código necessários para implementar as otimizações identificadas na auditoria do sistema de métricas de anúncios.

## 📋 Ordem de Execução

Execute os scripts **na ordem exata** listada abaixo:

### 0️⃣ `00_teste_execucao.sql` (RECOMENDADO)
**Tempo estimado:** 1 minuto  
**Impacto:** Verifica se o ambiente está pronto para as otimizações

```sql
-- Executa no Console SQL do Supabase para verificar o estado atual
\i sql_otimizacoes/00_teste_execucao.sql
```

⚠️ **Corrija qualquer erro** mostrado pelo teste antes de prosseguir.

### 1️⃣ `01_indices_otimizados.sql` OU `01a_indices_concurrently.sql`
**Tempo estimado:** 5-10 minutos  
**Impacto:** Remove índices não utilizados e cria índices compostos otimizados

**OPÇÃO A - Recomendada (mais segura):**
```sql
-- Executa no Console SQL do Supabase
\i sql_otimizacoes/01_indices_otimizados.sql
```

**OPÇÃO B - Para máxima performance (se a opção A falhar):**
- Abra o arquivo `01a_indices_concurrently.sql`
- **Execute APENAS UM comando por vez** no Console SQL
- Aguarde a conclusão antes do próximo comando

⚠️ **IMPORTANTE:** Se você recebeu o erro `25001: CREATE INDEX CONCURRENTLY cannot run inside a transaction block`, use a OPÇÃO A.

### 2️⃣ `02_correcao_rls.sql` OU `02a_correcao_rls_compativel.sql`
**Tempo estimado:** 1-2 minutos  
**Impacto:** Corrige vulnerabilidades de segurança (RLS) nas tabelas de resumo

**OPÇÃO A - Padrão:**
```sql
-- Executa no Console SQL do Supabase
\i sql_otimizacoes/02_correcao_rls.sql
```

**OPÇÃO B - Se der erro "column relforcerowsecurity does not exist":**
```sql
-- Versão compatível com PostgreSQL mais antigo
\i sql_otimizacoes/02a_correcao_rls_compativel.sql
```

### 3️⃣ `03_funcoes_limpeza.sql`
**Tempo estimado:** 2-3 minutos  
**Impacto:** Cria funções para controlar crescimento da tabela

```sql
-- Executa no Console SQL do Supabase
\i sql_otimizacoes/03_funcoes_limpeza.sql
```

### 4️⃣ `04_atualizacao_cron.js`
**Tempo estimado:** 5 minutos  
**Impacto:** Modifica cron job para incluir manutenção de métricas

```bash
# Substitui o arquivo api/cron/route.js pelo conteúdo do script
cp sql_otimizacoes/04_atualizacao_cron.js api/cron/route.js
```

### 5️⃣ `05_view_dashboard.sql`
**Tempo estimado:** 1 minuto  
**Impacto:** Cria views otimizadas para eliminir zeros no dashboard

```sql
-- Executa no Console SQL do Supabase
\i sql_otimizacoes/05_view_dashboard.sql
```

## 🔍 Validação Após Execução

### Verificar Índices
```sql
SELECT indexname, pg_size_pretty(pg_relation_size(indexname::regclass)) 
FROM pg_indexes 
WHERE tablename = 'eventos_anuncios' 
ORDER BY indexname;
```

### Verificar RLS
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename LIKE 'metricas_resumo_%';
```

### Verificar Funções
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE '%metrica%' 
ORDER BY routine_name;
```

### Verificar Views
```sql
SELECT viewname FROM pg_views 
WHERE viewname LIKE 'vw_dashboard_%';
```

### Relatório de Espaço
```sql
SELECT * FROM relatorio_uso_espaco_metricas();
```

## 📊 Resultados Esperados

### Performance
- ✅ Consultas do dashboard 50-70% mais rápidas
- ✅ Redução no tamanho da tabela com retenção
- ✅ Eliminação de índices não utilizados

### Funcionalidade
- ✅ Dashboard sem zeros (dados de hoje + histórico)
- ✅ Agregação automática funcionando
- ✅ Relatórios por período (7/30/90 dias) precisos

### Segurança
- ✅ RLS habilitado em todas as tabelas públicas
- ✅ Vulnerabilidades corrigidas

## 🚨 Plano de Rollback

### Se houver problemas com índices:
```sql
-- Remover novos índices
DROP INDEX IF EXISTS idx_eventos_anuncios_dashboard;
DROP INDEX IF EXISTS idx_eventos_anuncios_cliques;
DROP INDEX IF EXISTS idx_eventos_anuncios_timestamp_brin;
DROP INDEX IF EXISTS idx_eventos_anuncios_alcance;
DROP INDEX IF EXISTS idx_eventos_anuncios_pagina;

-- Recriar índices antigos
CREATE INDEX idx_eventos_anuncios_tipo_evento ON eventos_anuncios (tipo_evento);
CREATE INDEX idx_eventos_anuncios_session_id ON eventos_anuncios (session_id);
```

### Se houver problemas com RLS:
```sql
-- Desabilitar RLS temporariamente
ALTER TABLE metricas_resumo_mensais DISABLE ROW LEVEL SECURITY;
ALTER TABLE metricas_resumo_trimestrais DISABLE ROW LEVEL SECURITY;
```

### Se houver problemas com o cron:
```bash
# Restaurar arquivo original do git
git checkout api/cron/route.js
```

### Se houver problemas com views:
```sql
-- Remover views
DROP VIEW IF EXISTS vw_dashboard_totais;
DROP VIEW IF EXISTS vw_dashboard_periodos;
DROP VIEW IF EXISTS vw_dashboard_metricas;
```

## 📝 Monitoramento Contínuo

### Verificação Semanal
```sql
-- Tamanho da tabela
SELECT 
  pg_size_pretty(pg_total_relation_size('eventos_anuncios')) as tamanho,
  COUNT(*) as registros
FROM eventos_anuncios;

-- Últimas execuções do cron
SELECT descricao, data_hora 
FROM logs 
WHERE descricao LIKE '%manutenção%' 
ORDER BY data_hora DESC 
LIMIT 5;
```

### Verificação Mensal
```sql
-- Relatório completo de uso
SELECT * FROM relatorio_uso_espaco_metricas();

-- Diagnóstico de crescimento
SELECT * FROM diagnostico_crescimento_eventos();
```

## 🔧 Troubleshooting

### Erro "CREATE INDEX CONCURRENTLY cannot run inside a transaction block"
Este erro ocorre quando o Supabase executa comandos dentro de uma transação automática.

**Solução 1 - Use o script corrigido:**
```sql
-- Execute o script 01_indices_otimizados.sql (já corrigido)
-- Ele usa blocos DO $$ que funcionam dentro de transações
```

**Solução 2 - Execute comandos individuais:**
```sql
-- Copie apenas UMA linha por vez do arquivo 01a_indices_concurrently.sql
CREATE INDEX CONCURRENTLY idx_eventos_anuncios_dashboard ON eventos_anuncios (anuncio_id, timestamp DESC);
-- Aguarde completar, depois execute a próxima linha
```

**Solução 3 - Force transação individual:**
```sql
BEGIN;
CREATE INDEX idx_eventos_anuncios_dashboard ON eventos_anuncios (anuncio_id, timestamp DESC);
COMMIT;
```

### Erro "column relforcerowsecurity does not exist"
Este erro ocorre em versões mais antigas do PostgreSQL onde esta coluna não existe.

**Solução:**
```sql
-- Use o script compatível em vez do padrão
\i sql_otimizacoes/02a_correcao_rls_compativel.sql
```

### Dashboard ainda mostra zeros
1. Verificar se o cron job está executando:
   ```sql
   SELECT * FROM logs WHERE descricao LIKE '%manutenção%' ORDER BY data_hora DESC LIMIT 1;
   ```

2. Executar agregação manualmente:
   ```sql
   SELECT * FROM executar_manutencao_metricas();
   ```

### Performance ainda lenta
1. Verificar uso dos índices:
   ```sql
   SELECT indexname, idx_scan, idx_tup_read 
   FROM pg_stat_user_indexes 
   WHERE relname = 'eventos_anuncios';
   ```

2. Analisar planos de execução:
   ```sql
   EXPLAIN (ANALYZE, BUFFERS) 
   SELECT COUNT(*) FROM eventos_anuncios 
   WHERE timestamp >= NOW() - INTERVAL '30 days';
   ```

### Tabela crescendo muito
1. Verificar se limpeza está funcionando:
   ```sql
   SELECT * FROM limpar_eventos_anuncios_antigos(60);
   ```

2. Ajustar período de retenção se necessário:
   ```sql
   SELECT * FROM limpar_eventos_anuncios_antigos(30); -- 30 dias
   ```

## 📞 Suporte

Para dúvidas sobre implementação:
- Consulte o `RELATORIO_AUDITORIA_METRICAS_ANUNCIOS.md` para contexto completo
- Todos os scripts incluem comentários detalhados
- Use as funções de diagnóstico criadas para monitoramento

**Última atualização:** 18 de Janeiro de 2025
