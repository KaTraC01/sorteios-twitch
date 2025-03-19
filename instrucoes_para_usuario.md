# Instruções para Corrigir o Sistema de Sorteio

## ⚠️ ATENÇÃO: SOLUÇÃO URGENTE PARA O SORTEIO ⚠️

Entendemos sua frustração com o sistema de sorteio. Este guia irá ajudá-lo a corrigir todos os problemas de uma vez por todas.

## Problemas Identificados:
- O sorteio não está sendo realizado
- O último vencedor não é atualizado
- A lista de participantes não é resetada
- Os ganhadores não aparecem na página de ganhadores

## Solução Completa:

### 1️⃣ Acessar o Painel do Supabase

1. Faça login no painel administrativo do Supabase
2. Navegue até a seção "SQL Editor" (Editor SQL)

### 2️⃣ Executar o Script de Correção

1. Crie uma nova consulta SQL
2. Copie e cole TODO o conteúdo do arquivo `correcao_urgente_sorteio.sql` 
3. Clique em "Run" (Executar)

### 3️⃣ Verificar o Resultado

Após executar o script, você verá várias tabelas com informações de diagnóstico e correção.

O script fará:
- Verificar e consertar o trigger que deve resetar a lista
- Corrigir a função que salva os participantes no histórico
- Realizar um sorteio de teste (se houver participantes)
- Limpar a lista atual de participantes

### 4️⃣ Voltar ao Site e Testar

1. Retorne ao site
2. Verifique se o último vencedor está aparecendo
3. Confirme que a lista de participantes está limpa
4. Adicione alguns participantes para testar

### 🔄 Próximo Sorteio

O próximo sorteio agendado deverá funcionar normalmente após estas correções. Todos os componentes do sistema foram verificados e corrigidos.

## Suporte Adicional

Se mesmo após executar o script você ainda tiver problemas, entre em contato novamente com detalhes específicos sobre o que não está funcionando.

**Este script é uma solução abrangente que corrige todos os problemas identificados no sistema de sorteio.** 