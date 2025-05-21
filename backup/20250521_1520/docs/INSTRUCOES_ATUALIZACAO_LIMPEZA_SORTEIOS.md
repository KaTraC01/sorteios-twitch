# Instruções para Atualização da Limpeza de Sorteios Antigos

Este documento contém instruções para atualizar o sistema para que sorteios com mais de 60 dias sejam automaticamente removidos.

## Problema

Na implementação atual, os históricos de participantes com mais de 7 dias são removidos corretamente, mas os sorteios com mais de 60 dias não estão sendo removidos como deveriam.

## Solução

A atualização adiciona ao trigger `reset_participantes_ativos` a funcionalidade para remover sorteios com mais de 60 dias, da mesma forma que já remove históricos de participantes com mais de 7 dias.

## Como Aplicar a Atualização

### Método 1: Usando o Endpoint de API

1. Faça uma requisição POST para o endpoint `/api/atualizar-trigger-limpeza` com os seguintes dados:

```json
{
  "senha": "sua_senha_admin"
}
```

2. Este endpoint fará:
   - Atualização do trigger para incluir a limpeza de sorteios antigos
   - Execução imediata da limpeza para remover sorteios existentes com mais de 60 dias

### Método 2: Executando o SQL Diretamente

1. Acesse o SQL Editor do Supabase
2. Execute o script localizado em `sql/atualizar_trigger_limpeza_sorteios.sql`

## Verificação

Para confirmar que a atualização foi aplicada corretamente:

1. Verifique os logs do sistema para confirmar que o trigger foi atualizado
2. Verifique se sorteios com mais de 60 dias foram removidos
3. Após um novo sorteio, verifique se novos sorteios com mais de 60 dias são automaticamente removidos

## Detalhes Técnicos

A atualização modifica a função `reset_participantes_ativos()` para:

1. Continuar limpando históricos de participantes com mais de 7 dias
2. Adicionar limpeza de sorteios com mais de 60 dias
3. Manter todas as outras funcionalidades do trigger intactas

Não é necessário modificar nenhuma outra parte do sistema, pois a atualização mantém todas as interfaces existentes. 