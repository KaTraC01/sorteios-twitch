# Implementação de Limpeza Automática de Dados Antigos

## Resumo

Para otimizar o uso de recursos no plano gratuito do Supabase, foi implementada uma rotina de limpeza automática de dados antigos que é executada como parte do cron job existente. Esta implementação permite manter o sistema funcionando eficientemente sem atingir os limites de armazenamento do plano gratuito.

## Detalhes da Implementação

### 1. Funções de Banco de Dados

Foram implementadas/otimizadas as seguintes funções no banco de dados Supabase:

- `limpar_eventos_anuncios_antigos()`: Remove eventos de anúncios processados com mais de 7 dias.
- `limpar_logs_antigos(dias_manter INTEGER)`: Remove logs antigos mantendo os registros mais recentes de cada tipo.
- `executar_limpeza_dados_antigos()`: Função principal que coordena todas as limpezas.
- `limpar_eventos_anuncios_emergencial(dias_manter INTEGER)`: Função para limpeza mais agressiva em situações de emergência.
- `relatorio_uso_espaco()`: Gera relatório detalhado do uso de espaço por tabela.

### 2. Integração com o Cron Job Existente

O cron job da Vercel (que já executava o sorteio diário e atualizava métricas) foi ampliado para incluir a limpeza de dados antigos. Como o plano gratuito do Supabase limita o número de cron jobs, utilizamos o existente para realizar múltiplas tarefas:

1. Realização do sorteio diário
2. Atualização das métricas de anúncios
3. Limpeza de dados antigos

### 3. Resultados da Primeira Execução

Na primeira execução da rotina de limpeza, conseguimos os seguintes resultados:

- **Eventos de anúncios removidos**: 42.564 registros
- **Logs antigos removidos**: 1.756 registros
- **Redução no tamanho da tabela de eventos**: De 71 MB para 49 MB (redução de ~31%)
- **Redução total no banco de dados**: Aproximadamente 22 MB

## Benefícios

1. **Economia de espaço**: Redução significativa no uso de armazenamento do banco de dados.
2. **Melhoria de performance**: Consultas em tabelas menores são mais rápidas.
3. **Prevenção de problemas**: Evita atingir os limites do plano gratuito do Supabase.
4. **Economia financeira**: Permite continuar usando o plano gratuito por mais tempo.

## Configurações e Parâmetros

- **Eventos de anúncios**: Removidos após 7 dias (reduzido de 30 dias anteriormente)
- **Logs do sistema**: Mantidos por 7 dias, com exceção dos logs críticos
- **Frequência de execução**: Diária, junto com o cron job de sorteio

## Ferramentas de Monitoramento e Manutenção

### Relatório de Uso de Espaço

Foi implementada uma função `relatorio_uso_espaco()` que retorna informações detalhadas sobre o uso de espaço de cada tabela principal do sistema. Para executar o relatório:

```sql
SELECT * FROM relatorio_uso_espaco();
```

O relatório mostra:
- Nome da tabela
- Tamanho atual (formatado)
- Tamanho em bytes
- Número total de linhas
- Data da última limpeza (quando disponível)

### Limpeza Emergencial

Em situações onde é necessária uma limpeza mais agressiva de dados, foi implementada uma função de limpeza emergencial que pode ser executada manualmente:

```sql
-- Remover todos os eventos de anúncios mais antigos que 3 dias
SELECT limpar_eventos_anuncios_emergencial(3);

-- Ou com um valor personalizado
SELECT limpar_eventos_anuncios_emergencial(1); -- Apenas manter eventos do último dia
```

**ATENÇÃO**: Use esta função com cautela, pois ela remove dados independentemente de terem sido processados ou não.

## Manutenção Futura

A rotina de limpeza é totalmente automatizada, mas é recomendável monitorar periodicamente:

1. O tamanho total do banco de dados através do painel do Supabase
2. Os logs de execução para confirmar que a limpeza está ocorrendo corretamente
3. Utilizar a função `relatorio_uso_espaco()` para verificar o crescimento das tabelas
4. Ajustar os parâmetros de tempo (dias) conforme necessário

Se o volume de dados crescer significativamente no futuro, pode ser necessário ajustar os períodos de retenção para valores menores ou considerar a migração para um plano pago do Supabase. 