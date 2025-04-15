# Implementação de Rate Limiting com Suporte a Bursts Controlados

**Data de implementação:** Abril de 2025

## Visão Geral

Este documento descreve a nova implementação de rate limiting que permite "bursts" controlados de inserções, melhorando a experiência do usuário ao adicionar múltiplos participantes de uma vez enquanto mantém a proteção contra abusos.

## Motivação

O sistema anterior limitava todas as inserções com o mesmo intervalo, o que causava problemas quando usuários queriam adicionar múltiplos participantes de uma vez através do botão "+10". A nova abordagem permite "bursts" (rajadas) controlados de inserções, mantendo o rate limiting para inserções individuais.

## Mudanças Implementadas

### 1. Nova Função de Rate Limiting com Suporte a Bursts

A função `verificar_limite_participacao` foi modificada para aceitar um parâmetro adicional `quantidade`, permitindo diferenciar entre inserções individuais e inserções em lote:

```sql
CREATE OR REPLACE FUNCTION verificar_limite_participacao(
    identificador TEXT,
    quantidade INTEGER DEFAULT 1
)
```

### 2. Lógica de Verificação Diferenciada

- **Inserções Individuais**: Continuam com o intervalo mínimo de 10 segundos
- **Inserções em Lote**: Utilizam um intervalo maior (30 segundos), mas permitem todas as inserções de uma vez

### 3. Nova Função para Inserções em Lote

Foi criada uma função do banco de dados dedicada para inserções em lote:

```sql
CREATE OR REPLACE FUNCTION inserir_participantes_lote(
    p_nome_twitch TEXT, 
    p_streamer_escolhido TEXT, 
    p_quantidade INTEGER
)
```

Esta função:
- Verifica se a inserção em lote é permitida neste momento
- Limita a quantidade ao máximo definido (10 participantes)
- Realiza as inserções de forma eficiente
- Retorna estatísticas sobre o resultado da operação

### 4. Integração com o Componente React

O componente `ListaSorteio` foi atualizado para utilizar a nova função RPC em vez de fazer múltiplas requisições de inserção:

```javascript
const { data, error } = await supabase.rpc('inserir_participantes_lote', {
    p_nome_twitch: nomeSanitizado,
    p_streamer_escolhido: streamerSanitizado,
    p_quantidade: numeroInserções
});
```

## Benefícios da Nova Implementação

1. **Melhor Experiência do Usuário**: Não é mais necessário esperar entre cada inserção individual dentro de um lote
2. **Redução de Requisições**: O número de chamadas ao Supabase é reduzido, economizando recursos
3. **Consistência**: As transações são mais consistentes, pois a lógica de inserção está centralizada no banco de dados
4. **Proteção Mantida**: O sistema continua protegido contra abusos, com intervalos maiores entre inserções em lote

## Como Usar

Para os usuários finais, não há mudanças na interface. O botão "+10" funcionará da mesma forma, mas agora de maneira mais eficiente.

Para desenvolvedores, ao implementar novos recursos:

1. Para inserções individuais, continue usando o método padrão:
   ```javascript
   await supabase.from("participantes_ativos").insert([...]);
   ```

2. Para inserções em lote, use a nova função RPC:
   ```javascript
   await supabase.rpc('inserir_participantes_lote', {
       p_nome_twitch: nome,
       p_streamer_escolhido: streamer,
       p_quantidade: quantidade
   });
   ```

## Monitoramento e Manutenção

É possível monitorar as inserções em lote através da tabela `logs`:

```sql
-- Verificar inserções em lote recentes
SELECT * FROM logs 
WHERE descricao LIKE 'Inserção em lote:%'
ORDER BY data_hora DESC;

-- Verificar tentativas bloqueadas
SELECT * FROM logs
WHERE descricao LIKE 'Burst bloqueado:%'
ORDER BY data_hora DESC;
```

## Parâmetros Configuráveis

Os principais parâmetros da implementação são:

- **Intervalo mínimo (inserções individuais)**: 10 segundos
- **Intervalo entre bursts**: 30 segundos
- **Máximo de inserções por burst**: 10 participantes

Para ajustar estes parâmetros, modifique as constantes na função `verificar_limite_participacao` no arquivo `sql/atual/rate_limit_burst.sql`. 