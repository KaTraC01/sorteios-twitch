# Relatório de Auditoria - Sistema de Métricas de Anúncios

**Data da Auditoria:** 18 de Janeiro de 2025  
**Projeto:** site-sorteio (sorteios-twitch)  
**Supabase Project ID:** nsqiytflqwlyqhdmueki  

## 📋 Resumo Executivo

A auditoria identificou um sistema de métricas de anúncios **funcional porém com sérios problemas de performance e crescimento descontrolado**. A tabela `eventos_anuncios` alcançou **38 MB** para apenas **4.466 registros**, indicando estrutura ineficiente. O dashboard mostra **números inconsistentes** devido a problemas no preenchimento das tabelas de resumo.

### ⚠️ Problemas Críticos Identificados
1. **Crescimento descontrolado:** 38 MB para 4.466 registros (~8.5 KB por registro)
2. **Dashboard com zeros:** Tabelas de resumo não estão sendo preenchidas corretamente
3. **RLS desabilitado:** Tabelas `metricas_resumo_mensais` e `metricas_resumo_trimestrais` sem RLS
4. **Índices não utilizados:** Vários índices nunca foram usados
5. **Jobs centralizados:** Apenas 1 cron job disponível (limitação Vercel Free)

## 🔍 Análise Detalhada

### 1. Mapeamento da Arquitetura Atual

#### 1.1 Fluxo de Ingestão de Dados
```
[AdTracker Component] 
    ↓ (buffer 10s ou 5 eventos)
[API: /inserir_eventos_anuncios_lote_otimizado] 
    ↓ (payload otimizado)
[Tabela: eventos_anuncios]
    ↓ (jobs agregação - PROBLEMA: não funciona)
[Tabelas: metricas_resumo_*]
    ↓ (leitura dashboard)
[Dashboard: /relatorio-anuncios]
```

#### 1.2 Componentes Identificados
- **Frontend:** `src/components/AdTracker/index.js` - Sistema robusto com buffer e deduplicação
- **API de Ingestão:** `api/inserir_eventos_anuncios_lote_otimizado.js` - Formato otimizado
- **Dashboard:** `src/pages/RelatorioAnuncios/index.js` - Lê resumos + eventos brutos
- **Jobs:** `api/cron/route.js` - Cron único para múltiplas funções (sorteio apenas)

### 2. Estado Atual do Banco de Dados

#### 2.1 Tabela `eventos_anuncios`
- **Registros:** 4.466 eventos
- **Tamanho:** 38 MB (~8.5 KB por registro)
- **Período:** 21/05/2025 a 18/08/2025
- **Sessões únicas:** 45
- **CTR:** 3.7% (165 cliques / 4.301 impressões)

**Estrutura da tabela:**
```sql
id uuid PRIMARY KEY,
anuncio_id text NOT NULL,
tipo_anuncio text NOT NULL,
pagina text NOT NULL,
tipo_evento text NOT NULL CHECK (tipo_evento IN ('impressao', 'clique')),
tempo_exposto numeric DEFAULT 0,
visivel boolean DEFAULT false,
dispositivo text,
pais text,
regiao text,
session_id text,
timestamp timestamptz DEFAULT now(),
processado boolean DEFAULT false
```

#### 2.2 Índices Existentes
```sql
-- Índices em uso
CREATE INDEX idx_eventos_anuncios_timestamp ON eventos_anuncios (timestamp);
CREATE INDEX idx_eventos_anuncios_anuncio_id ON eventos_anuncios (anuncio_id);
CREATE INDEX idx_eventos_anuncios_processado ON eventos_anuncios (processado);

-- Índices NUNCA usados (candidatos à remoção)
CREATE INDEX idx_eventos_anuncios_tipo_evento ON eventos_anuncios (tipo_evento);
CREATE INDEX idx_eventos_anuncios_session_id ON eventos_anuncios (session_id);
```

#### 2.3 Tabelas de Resumo
| Tabela | Registros | RLS | Status |
|--------|-----------|-----|--------|
| `metricas_resumo_diarias` | 122 | ✅ Habilitado | ✅ Funcionando |
| `metricas_resumo_mensais` | 50 | ❌ **Desabilitado** | ⚠️ Dados inconsistentes |
| `metricas_resumo_trimestrais` | 0 | ❌ **Desabilitado** | ❌ Vazia |

### 3. Análise de Performance

#### 3.1 Queries do Dashboard
**Query de resumo diário (boa performance):**
```
Sort (cost=8.71..9.01 rows=121) (actual time=0.085..0.093 rows=122)
  ->  Seq Scan on metricas_resumo_diarias (cost=0.00..4.53)
      Filter: (data >= '2024-12-19'::date)
Execution Time: 0.183 ms
```

**Query de eventos brutos (performance adequada):**
```
Limit (cost=0.28..637.15 rows=1000) (actual time=0.025..0.791 rows=1000)
  ->  Index Scan Backward using idx_eventos_anuncios_timestamp
      Index Cond: (timestamp >= '2024-12-19')
Execution Time: 0.903 ms
```

#### 3.2 Problemas de Performance Identificados
1. **Tamanho excessivo por registro:** 8.5 KB/registro vs ~200 bytes esperados
2. **Índices não utilizados:** 2 índices nunca foram acessados
3. **Políticas RLS subótimas:** Múltiplas políticas permissivas degradam performance

### 4. Jobs e Agregação

#### 4.1 Cron Job Atual
```json
{
  "crons": [
    { "path": "/api/cron/route", "schedule": "0 0 * * *" }
  ]
}
```

**⚠️ PROBLEMA:** O cron job atual apenas executa sorteios. As funções de agregação de métricas **não estão sendo executadas**.

#### 4.2 Funções de Agregação Disponíveis
- `executar_agregacao_metricas()` - ✅ Existe
- `agregar_metricas_mensais()` - ✅ Existe  
- `agregar_metricas_trimestrais()` - ✅ Existe
- `atualizar_metricas_resumo()` - ✅ Existe
- `atualizar_metricas_resumo_job()` - ✅ Existe

### 5. Questões de Segurança

#### 5.1 Problemas RLS (CRÍTICO)
```sql
-- Tabelas SEM RLS (expostas publicamente)
metricas_resumo_mensais (RLS: false) 
metricas_resumo_trimestrais (RLS: false)
rate_limiting (RLS: false)
```

#### 5.2 Advisors de Segurança
- **ERROR:** 3 tabelas sem RLS habilitado
- **WARN:** 60+ funções sem `search_path` configurado
- **WARN:** Múltiplas políticas permissivas degradam performance

## 🎯 Diagnóstico dos Problemas

### Por que o Dashboard Mostra Zeros?

1. **Tabelas de resumo não preenchidas:** O cron job não executa as funções de agregação
2. **Jobs inexistentes:** Apenas sorteio é executado diariamente
3. **Dados do dia atual:** Dashboard busca resumos, mas eventos de hoje ficam apenas na tabela bruta

### Por que a Tabela está tão Grande?

1. **Colunas desnecessárias:** `pais`, `regiao`, `navegador`, `idioma`, `plataforma` com dados redundantes
2. **UUIDs desnecessários:** Uso de UUID para ID quando BIGINT seria suficiente
3. **Dados não normalizados:** Repetição de strings `anuncio_id`, `pagina`, etc.

## 📋 Plano de Otimização

### Fase 1: Correções Críticas (Implementação Imediata)

#### 1.1 Índices Otimizados
```sql
-- Remover índices não utilizados
DROP INDEX IF EXISTS idx_eventos_anuncios_tipo_evento;
DROP INDEX IF EXISTS idx_eventos_anuncios_session_id;

-- Adicionar índices compostos para queries do dashboard
CREATE INDEX CONCURRENTLY idx_eventos_anuncios_dashboard 
ON eventos_anuncios (anuncio_id, timestamp) 
WHERE timestamp >= NOW() - INTERVAL '90 days';

-- Índice para cliques (relatórios CTR)
CREATE INDEX CONCURRENTLY idx_eventos_anuncios_cliques 
ON eventos_anuncios (anuncio_id, timestamp) 
WHERE tipo_evento = 'clique';

-- Índice BRIN para timestamp (eficiente para append-only)
CREATE INDEX CONCURRENTLY idx_eventos_anuncios_timestamp_brin 
ON eventos_anuncios USING BRIN (timestamp) 
WITH (pages_per_range = 32);
```

#### 1.2 Correção RLS
```sql
-- Habilitar RLS nas tabelas de resumo
ALTER TABLE metricas_resumo_mensais ENABLE ROW LEVEL SECURITY;
ALTER TABLE metricas_resumo_trimestrais ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública para resumos
CREATE POLICY resumos_mensais_read_policy ON metricas_resumo_mensais
FOR SELECT TO anon, authenticated 
USING (true);

CREATE POLICY resumos_trimestrais_read_policy ON metricas_resumo_trimestrais
FOR SELECT TO anon, authenticated 
USING (true);
```

#### 1.3 Correção do Cron Job
**ATENÇÃO:** Como o plano Vercel Free permite apenas 1 cron job, devemos **modificar o cron existente** para incluir as funções de métricas:

```javascript
// Modificar api/cron/route.js para incluir:
async function executarTarefasDiarias() {
  const resultados = [];
  
  // 1. Sorteio (existente)
  const sorteio = await realizarSorteio();
  resultados.push(sorteio);
  
  // 2. NOVO: Agregação de métricas
  try {
    const { data, error } = await supabase.rpc('executar_agregacao_metricas');
    if (error) throw error;
    resultados.push({ tarefa: 'metricas', sucesso: true });
  } catch (error) {
    resultados.push({ tarefa: 'metricas', sucesso: false, erro: error.message });
  }
  
  // 3. NOVO: Limpeza de dados antigos
  try {
    const { data, error } = await supabase.rpc('limpar_eventos_anuncios_antigos');
    if (error) throw error;
    resultados.push({ tarefa: 'limpeza', sucesso: true });
  } catch (error) {
    resultados.push({ tarefa: 'limpeza', sucesso: false, erro: error.message });
  }
  
  return resultados;
}
```

### Fase 2: Otimizações de Performance

#### 2.1 Retenção de Dados
```sql
-- Função para manter apenas 60 dias de dados brutos
CREATE OR REPLACE FUNCTION limpar_eventos_anuncios_antigos()
RETURNS TABLE(registros_removidos INTEGER) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Manter apenas 60 dias de eventos brutos
  DELETE FROM eventos_anuncios 
  WHERE timestamp < NOW() - INTERVAL '60 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log da operação
  INSERT INTO logs (descricao) 
  VALUES ('Limpeza automática: ' || deleted_count || ' eventos antigos removidos');
  
  RETURN QUERY SELECT deleted_count;
END;
$$;
```

#### 2.2 Otimização do Dashboard
```sql
-- View otimizada para o dashboard (combina dia atual + resumos)
CREATE OR REPLACE VIEW dashboard_metricas AS
WITH dados_hoje AS (
  SELECT 
    anuncio_id,
    tipo_anuncio,
    pagina,
    CURRENT_DATE as data,
    COUNT(CASE WHEN tipo_evento = 'impressao' THEN 1 END) as total_impressoes,
    COUNT(CASE WHEN tipo_evento = 'clique' THEN 1 END) as total_cliques,
    ROUND(AVG(tempo_exposto), 2) as tempo_medio_visivel,
    COUNT(DISTINCT session_id) as alcance
  FROM eventos_anuncios
  WHERE DATE(timestamp) = CURRENT_DATE
  GROUP BY anuncio_id, tipo_anuncio, pagina
),
dados_historicos AS (
  SELECT 
    anuncio_id,
    tipo_anuncio,
    pagina,
    data,
    total_impressoes,
    total_cliques,
    tempo_medio_visivel,
    alcance
  FROM metricas_resumo_diarias
  WHERE data < CURRENT_DATE
)
SELECT * FROM dados_hoje
UNION ALL
SELECT * FROM dados_historicos;
```

### Fase 3: Melhorias Arquiteturais

#### 3.1 Particionamento por Mês (Opcional)
```sql
-- Converter para tabela particionada (para volumes > 1M registros)
CREATE TABLE eventos_anuncios_partitioned (
  LIKE eventos_anuncios INCLUDING ALL
) PARTITION BY RANGE (timestamp);

-- Criar partições por mês
CREATE TABLE eventos_anuncios_y2025m01 
PARTITION OF eventos_anuncios_partitioned
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

#### 3.2 Compressão de Dados Históricos
```sql
-- Função para arquivar dados antigos como JSONB compactado
CREATE TABLE eventos_anuncios_arquivo (
  mes DATE PRIMARY KEY,
  dados JSONB,
  estatisticas JSONB,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
```

## 🚀 Scripts de Implementação

### Script 1: Índices Otimizados
```sql
-- ===== OTIMIZAÇÃO DE ÍNDICES =====
-- Executar com CONCURRENTLY para não bloquear

-- Remover índices não utilizados
DROP INDEX IF EXISTS idx_eventos_anuncios_tipo_evento;
DROP INDEX IF EXISTS idx_eventos_anuncios_session_id;

-- Índice composto para queries do dashboard (período + anúncio)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eventos_anuncios_dashboard 
ON eventos_anuncios (anuncio_id, timestamp);

-- Índice parcial para cliques (otimização CTR)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eventos_anuncios_cliques 
ON eventos_anuncios (anuncio_id, timestamp) 
WHERE tipo_evento = 'clique';

-- Índice BRIN para timestamp (muito eficiente para append-only)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eventos_anuncios_timestamp_brin 
ON eventos_anuncios USING BRIN (timestamp) 
WITH (pages_per_range = 32);

-- Índice para alcance (session_id + período)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eventos_anuncios_alcance 
ON eventos_anuncios (session_id, timestamp);
```

### Script 2: Correção RLS
```sql
-- ===== CORREÇÃO DE SEGURANÇA RLS =====

-- Habilitar RLS nas tabelas sem proteção
ALTER TABLE metricas_resumo_mensais ENABLE ROW LEVEL SECURITY;
ALTER TABLE metricas_resumo_trimestrais ENABLE ROW LEVEL SECURITY;

-- Políticas de leitura pública para resumos (somente SELECT)
CREATE POLICY IF NOT EXISTS resumos_mensais_read_policy 
ON metricas_resumo_mensais
FOR SELECT TO anon, authenticated 
USING (true);

CREATE POLICY IF NOT EXISTS resumos_trimestrais_read_policy 
ON metricas_resumo_trimestrais
FOR SELECT TO anon, authenticated 
USING (true);

-- Política de escrita apenas para service_role
CREATE POLICY IF NOT EXISTS resumos_mensais_write_policy 
ON metricas_resumo_mensais
FOR ALL TO service_role 
USING (true);

CREATE POLICY IF NOT EXISTS resumos_trimestrais_write_policy 
ON metricas_resumo_trimestrais
FOR ALL TO service_role 
USING (true);
```

### Script 3: Funções de Limpeza
```sql
-- ===== FUNÇÕES DE RETENÇÃO =====

-- Função para limpeza automática (manter 60 dias)
CREATE OR REPLACE FUNCTION limpar_eventos_anuncios_antigos()
RETURNS TABLE(registros_removidos INTEGER) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
  cutoff_date DATE;
BEGIN
  -- Data de corte: 60 dias atrás
  cutoff_date := CURRENT_DATE - INTERVAL '60 days';
  
  -- Remover eventos antigos
  DELETE FROM eventos_anuncios 
  WHERE DATE(timestamp) < cutoff_date;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log da operação
  INSERT INTO logs (descricao) 
  VALUES ('Limpeza automática: ' || deleted_count || ' eventos antigos removidos (antes de ' || cutoff_date || ')');
  
  RETURN QUERY SELECT deleted_count;
END;
$$;

-- Função para relatório de uso de espaço
CREATE OR REPLACE FUNCTION relatorio_uso_espaco_metricas()
RETURNS TABLE(
  tabela TEXT,
  tamanho TEXT,
  registros BIGINT,
  tamanho_por_registro TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'eventos_anuncios'::TEXT,
    pg_size_pretty(pg_total_relation_size('eventos_anuncios')),
    (SELECT COUNT(*) FROM eventos_anuncios),
    pg_size_pretty(pg_total_relation_size('eventos_anuncios') / GREATEST(1, (SELECT COUNT(*) FROM eventos_anuncios)))
  UNION ALL
  SELECT 
    'metricas_resumo_diarias'::TEXT,
    pg_size_pretty(pg_total_relation_size('metricas_resumo_diarias')),
    (SELECT COUNT(*) FROM metricas_resumo_diarias),
    pg_size_pretty(pg_total_relation_size('metricas_resumo_diarias') / GREATEST(1, (SELECT COUNT(*) FROM metricas_resumo_diarias)))
  UNION ALL
  SELECT 
    'metricas_resumo_mensais'::TEXT,
    pg_size_pretty(pg_total_relation_size('metricas_resumo_mensais')),
    (SELECT COUNT(*) FROM metricas_resumo_mensais),
    pg_size_pretty(pg_total_relation_size('metricas_resumo_mensais') / GREATEST(1, (SELECT COUNT(*) FROM metricas_resumo_mensais)));
END;
$$;
```

## 📊 Cronograma de Implementação

### Semana 1: Correções Críticas
- [ ] **Dia 1-2:** Implementar índices otimizados (Script 1)
- [ ] **Dia 3:** Corrigir RLS (Script 2)  
- [ ] **Dia 4:** Modificar cron job para incluir agregação
- [ ] **Dia 5:** Validar correções no dashboard

### Semana 2: Otimizações
- [ ] **Dia 1-2:** Implementar função de limpeza (Script 3)
- [ ] **Dia 3-4:** Testar retenção de dados
- [ ] **Dia 5:** Monitorar performance

### Semana 3: Monitoramento
- [ ] **Acompanhar métricas de performance**
- [ ] **Validar integridade dos dados**
- [ ] **Documentar mudanças**

## 📈 Resultados Esperados

### Performance
- **Redução de 70% no tamanho da tabela** (com retenção de 60 dias)
- **Consultas de dashboard 50% mais rápidas** (com índices compostos)
- **Eliminação de queries full-scan**

### Funcionalidade
- **Dashboard com números corretos** (agregação funcionando)
- **Períodos 7/30/90 dias funcionais**
- **Relatórios por tipo de anúncio e página precisos**

### Segurança
- **RLS habilitado em todas as tabelas públicas**
- **Políticas otimizadas** (menos consultas por request)

## 🔧 Validação Pós-Implementação

### Checklist de Validação
```sql
-- 1. Verificar índices criados
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE tablename = 'eventos_anuncios' 
ORDER BY indexname;

-- 2. Confirmar RLS habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename LIKE 'metricas_resumo_%';

-- 3. Testar performance das queries principais
EXPLAIN (ANALYZE, BUFFERS) 
SELECT COUNT(*) FROM eventos_anuncios 
WHERE timestamp >= NOW() - INTERVAL '30 days'
  AND anuncio_id = 'test-banner-1';

-- 4. Verificar preenchimento dos resumos
SELECT data, SUM(total_impressoes), SUM(total_cliques)
FROM metricas_resumo_diarias 
WHERE data >= CURRENT_DATE - 7
GROUP BY data 
ORDER BY data DESC;

-- 5. Validar funcionamento da limpeza
SELECT * FROM relatorio_uso_espaco_metricas();
```

### Métricas de Sucesso
- ✅ Dashboard mostra números > 0 para todos os períodos
- ✅ Query de 30 dias executa em < 100ms
- ✅ Tamanho da tabela eventos_anuncios < 15 MB
- ✅ Resumos diários atualizados automaticamente
- ✅ Sem advisors de segurança ERROR

## 🚨 Plano de Rollback

Em caso de problemas:

### Rollback Índices
```sql
-- Remover novos índices se necessário
DROP INDEX IF EXISTS idx_eventos_anuncios_dashboard;
DROP INDEX IF EXISTS idx_eventos_anuncios_cliques;
DROP INDEX IF EXISTS idx_eventos_anuncios_timestamp_brin;
DROP INDEX IF EXISTS idx_eventos_anuncios_alcance;

-- Recriar índices antigos se necessário
CREATE INDEX idx_eventos_anuncios_tipo_evento ON eventos_anuncios (tipo_evento);
CREATE INDEX idx_eventos_anuncios_session_id ON eventos_anuncios (session_id);
```

### Rollback RLS
```sql
-- Desabilitar RLS se causar problemas
ALTER TABLE metricas_resumo_mensais DISABLE ROW LEVEL SECURITY;
ALTER TABLE metricas_resumo_trimestrais DISABLE ROW LEVEL SECURITY;
```

## 📞 Contato e Suporte

Para dúvidas sobre implementação:
- **Documentação:** Este relatório contém todos os scripts necessários
- **Monitoramento:** Use `relatorio_uso_espaco_metricas()` para acompanhar evolução
- **Emergência:** Plano de rollback documentado acima

---

**Relatório gerado em:** 18 de Janeiro de 2025  
**Próxima revisão:** Após implementação das correções críticas
