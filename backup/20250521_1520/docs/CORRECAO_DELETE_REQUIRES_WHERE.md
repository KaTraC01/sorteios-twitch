# Correção do Erro "DELETE requires a WHERE clause"

## Problema Identificado

O sistema de sorteio estava falhando ao tentar executar o DELETE na tabela `participantes_ativos` durante o processo de sorteio automatizado. O erro específico era:

```
SORTEIO-API DEBUG: ERRO CRÍTICO: Error: Erro ao salvar o sorteio: DELETE requires a WHERE clause
```

Este erro ocorria porque:

1. A política de segurança do Supabase (RLS) exigia uma cláusula WHERE para operações DELETE
2. O código estava tentando executar um DELETE sem uma cláusula WHERE adequada
3. Havia conflitos entre diferentes políticas de DELETE na tabela

## Solução Implementada

Implementamos uma solução em várias camadas para garantir que o problema fosse resolvido definitivamente:

### 1. Correção no Banco de Dados

1. **Nova política de segurança**: Modificamos a política para permitir DELETE apenas quando `id IS NOT NULL` 
2. **Função segura**: Criamos a função `limpar_participantes_seguro()` que usa uma cláusula WHERE segura
3. **Correção do trigger**: Atualizamos o trigger `reset_apos_sorteio` para usar nossa função segura

### 2. Correção no Código JavaScript

Modificamos a função `resetarLista()` para usar uma estratégia em camadas:

1. **Primeira tentativa**: Chamar a nova função segura `limpar_participantes_seguro()`
2. **Segunda tentativa**: Chamar a função RPC existente `resetar_participantes_ativos()`
3. **Terceira tentativa**: Usar um DELETE direto com a cláusula WHERE segura `.not('id', 'is', null)`

Além disso, melhoramos o tratamento de erros para evitar que falhas no processo de limpeza interrompam o fluxo do sorteio.

## Como Verificar a Correção

1. Execute um sorteio manual ou automático (via cron job)
2. Verifique os logs na tabela `logs` para confirmar que a limpeza foi realizada com sucesso
3. Verifique se a tabela `participantes_ativos` foi limpa após o sorteio

## Recomendações Futuras

Para evitar problemas semelhantes no futuro:

1. **Sempre use cláusulas WHERE em DELETE**: Mesmo quando a intenção é excluir todos os registros
2. **Use funções RPC para operações críticas**: Encapsule operações sensíveis em funções SQL com `SECURITY DEFINER`
3. **Implementar tratamento de erros robusto**: Tenha fallbacks para casos de falha
4. **Monitore os logs**: Configure alertas para erros recorrentes

## Contato para Suporte

Se o problema persistir, verifique:

1. Os logs na tabela `logs` para mensagens de erro específicas
2. As políticas de segurança no Supabase para verificar se houve alterações
3. O funcionamento das funções RPC executando-as diretamente 