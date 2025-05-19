# Instruções para Migrar de View Materializada para Tabela Física

Este documento contém instruções passo a passo para converter a view materializada `metricas_resumo_diarias` em uma tabela física e desativar a função redundante.

## Preparação

1. **Faça backup do banco de dados antes de começar**
   - É importante ter um ponto de restauração caso algo dê errado

2. **Escolha um horário de baixo tráfego**
   - Idealmente, faça esta migração quando o sistema tiver pouco uso

## Passos para Migração

### 1. Desativar qualquer job que execute `atualizar_metricas_resumo_job()`

Acesse o Console SQL do Supabase e desative o job que executa a função `atualizar_metricas_resumo_job()`:

```sql
-- Verifique o agendamento existente (anote o job_id antes de desativar)
SELECT * FROM pg_catalog.pg_cron_job
WHERE command LIKE '%atualizar_metricas_resumo_job%';

-- Desativar o job (substitua JOB_ID pelo id encontrado acima)
UPDATE pg_catalog.pg_cron_job 
SET active = false 
WHERE jobid = JOB_ID;

-- Alternativa: se o comando acima não funcionar, você pode tentar
SELECT cron.unschedule(JOB_ID);
```

Se não tiver acesso à tabela `pg_cron_job`, entre em contato com o suporte do Supabase para desativar o job.

### 2. Executar o script de migração

Execute o script SQL `converter_metricas_resumo_diarias.sql` no Console SQL do Supabase:

1. Abra o Console SQL no dashboard do Supabase
2. Cole o conteúdo do arquivo `converter_metricas_resumo_diarias.sql`
3. Execute o script completo

### 3. Verificar a conversão

Confirme que a tabela foi criada corretamente e contém os dados da view materializada anterior:

```sql
-- Verificar a estrutura
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'metricas_resumo_diarias';

-- Verificar os dados
SELECT COUNT(*) FROM metricas_resumo_diarias;
```

### 4. Remover a função redundante (opcional)

Após verificar que tudo está funcionando corretamente, você pode remover a função redundante:

```sql
DROP FUNCTION IF EXISTS atualizar_metricas_resumo_job();
```

Este passo é opcional. Você também pode mantê-la temporariamente enquanto testa a nova configuração.

## Após a migração

- A função `atualizar_metricas_resumo()` agora irá inserir registros diretamente na tabela física
- Não é necessário fazer nenhuma modificação na função `atualizar_metricas_resumo()`
- O cron job existente que chama esta função através da API continuará funcionando normalmente

## Solução de problemas

Se você encontrar algum problema:

1. Verifique os logs do banco de dados para erros SQL
2. Consulte a tabela `logs` para mensagens de erro específicas
3. Se necessário, restaure o backup do banco de dados e tente novamente com mais cuidado

## Conclusão

Após concluir a migração, o sistema usará exclusivamente a função `atualizar_metricas_resumo()` para processar as métricas de anúncios, e os dados serão armazenados em uma tabela física ao invés de uma view materializada, resolvendo o conflito entre as duas implementações. 