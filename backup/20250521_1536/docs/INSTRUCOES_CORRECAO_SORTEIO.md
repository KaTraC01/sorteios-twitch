# Instruções para Correção do Sistema de Sorteio

## Problema Identificado

O sistema de sorteio estava apresentando o seguinte erro durante a execução:

```
SORTEIO DEBUG: Detalhes do erro: {"mensagem":"Erro ao realizar o sorteio: {"error":"Erro interno do servidor","details":"Erro ao salvar histórico de participantes: new row for relation \"historico_participantes\" violates check constraint \"validate_hist_nome_twitch_length\""}
```

Este erro ocorria porque a tabela `historico_participantes` tinha uma constraint que limitava o comprimento do campo `nome_twitch` a um valor específico, o que causava falhas ao tentar salvar participantes com nomes que violavam essa restrição.

## Correções Implementadas

### 1. Correção da Constraint na Tabela de Histórico

Modificamos a constraint `validate_hist_nome_twitch_length` para permitir nomes de participantes com tamanhos entre 1 e 100 caracteres, substituindo a constraint original que era mais restritiva:

```sql
ALTER TABLE historico_participantes DROP CONSTRAINT IF EXISTS validate_hist_nome_twitch_length;

ALTER TABLE historico_participantes 
ADD CONSTRAINT validate_hist_nome_twitch_length_new 
CHECK (char_length(nome_twitch) >= 1 AND char_length(nome_twitch) <= 100);
```

### 2. Solução para Transferência de Participantes para o Histórico

Criamos uma nova função para inserir participantes no histórico com sanitização de nomes:

```sql
CREATE OR REPLACE FUNCTION inserir_participante_historico(sorteio_id_param UUID, nome TEXT, streamer TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO historico_participantes (sorteio_id, nome_twitch, streamer_escolhido)
    VALUES (
        sorteio_id_param,
        LEFT(REGEXP_REPLACE(COALESCE(nome, 'usuario'), '[^a-zA-Z0-9_]', '', 'g'), 99),
        LEFT(REGEXP_REPLACE(COALESCE(streamer, 'streamer'), '[^a-zA-Z0-9_]', '', 'g'), 24)
    );
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        INSERT INTO logs (descricao, data_hora)
        VALUES ('ERRO ao inserir participante no histórico: ' || SQLERRM, NOW());
        RETURN FALSE;
END;
```

### 3. Nova Função de Sorteio Simplificada

Criamos uma nova função de sorteio que:
- Seleciona um vencedor aleatório
- Registra o vencedor na tabela de sorteios
- Salva o histórico de participantes de forma segura
- Limpa a tabela de participantes ativos com segurança

```sql
CREATE OR REPLACE FUNCTION executar_sorteio_simples()
RETURNS JSONB AS $$
-- Implementação detalhada na migração
```

### 4. Integração com API e Cron Job

Atualizamos as funções de API e cron job para usar nossa nova função segura:

```sql
CREATE OR REPLACE FUNCTION executar_sorteio_api()
RETURNS JSONB AS $$
-- Implementação que chama executar_sorteio_simples()
```

```sql
CREATE OR REPLACE FUNCTION executar_cron_sorteio()
RETURNS JSONB AS $$
-- Implementação que chama executar_sorteio_simples()
```

### 5. Função para Limpar Participantes Ativos

Corrigimos o problema de deleção dos participantes ativos:

```sql
CREATE OR REPLACE FUNCTION resetar_participantes_ativos()
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM participantes_ativos WHERE id IS NOT NULL OR id IS NULL;
    -- Restante da implementação
END;
```

## Como Verificar a Correção

1. Execute um sorteio manual chamando a função `executar_sorteio_api()` ou `executar_sorteio_simples()` diretamente.
2. Verifique se o vencedor foi registrado na tabela `sorteios`.
3. Verifique se o histórico foi criado na tabela `historico_participantes` para o sorteio realizado.
4. Verifique se a tabela `participantes_ativos` foi limpa após o sorteio.

## Logs para Diagnóstico

A cada passo do processo, logs detalhados são registrados na tabela `logs`. Para diagnosticar qualquer problema futuro, consulte esta tabela para obter informações sobre o que ocorreu durante a execução de um sorteio.

```sql
SELECT * FROM logs ORDER BY data_hora DESC LIMIT 20;
```

## Procedimentos para Manutenção

Se no futuro ocorrerem novamente problemas com o histórico de participantes, você pode:

1. Verificar as constraints da tabela `historico_participantes`:
   ```sql
   SELECT con.conname as constraint_name, pg_get_constraintdef(con.oid) as constraint_definition
   FROM pg_constraint con
   JOIN pg_class rel on rel.oid = con.conrelid
   JOIN pg_namespace nsp on nsp.oid = rel.relnamespace
   WHERE nsp.nspname = 'public' AND rel.relname = 'historico_participantes';
   ```

2. Executar a função `executar_sorteio_simples()` para realizar um sorteio seguro.

3. Em caso de problemas, limpar manualmente a tabela `participantes_ativos`:
   ```sql
   DELETE FROM participantes_ativos;
   ```

4. Se o problema for com o histórico, adicionar registros manualmente:
   ```sql
   INSERT INTO historico_participantes (sorteio_id, nome_twitch, streamer_escolhido)
   VALUES ('ID-do-sorteio', 'nome-sanitizado', 'streamer-sanitizado');
   ``` 