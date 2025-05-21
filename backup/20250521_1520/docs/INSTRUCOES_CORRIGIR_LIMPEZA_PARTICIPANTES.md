# Instruções para Corrigir a Limpeza de Participantes Antigos

Este guia fornece instruções para corrigir o sistema de limpeza automática de participantes de sorteios com mais de 7 dias, garantindo que os registros sejam corretamente removidos para economizar espaço no banco de dados.

## 1. Implementar as funções RPC no Supabase

Execute o script SQL abaixo no SQL Editor do Supabase:

```sql
-- Copie e cole o conteúdo do arquivo sql/corrigir_limpeza_rpc.sql aqui
```

Este script cria 3 funções no Supabase:
- `limpar_historico_participantes_antigos()`: Remove participantes de sorteios com mais de 7 dias
- `atualizar_trigger_limpeza_participantes()`: Atualiza o trigger para incluir a limpeza
- `verificar_coluna_created_at()`: Verifica e adiciona a coluna created_at se necessário

## 2. Criar Endpoint de API para Limpeza Manual

Crie o arquivo `pages/api/limpar-participantes-antigos.js` com o código fornecido.

## 3. Modificar o Endpoint de Sorteio

Atualize o arquivo `pages/api/executar-sorteio.js` para incluir a chamada à função de limpeza.

## 4. Executar a Correção Inicial

Execute a limpeza inicial para remover participantes antigos de uma vez:

1. Defina a senha de administrador no seu arquivo .env:
   ```
   ADMIN_PASSWORD=suaSenhaSegura
   ```

2. Execute uma chamada POST para o endpoint de limpeza:
   ```
   curl -X POST http://seu-site/api/limpar-participantes-antigos -H "Content-Type: application/json" -d '{"senha":"suaSenhaSegura"}'
   ```

   Ou use o Postman ou qualquer outro cliente HTTP, ou simplesmente acesse a URL em seu navegador com os parâmetros corretos.

## Funcionamento

Após esta implementação:

1. O trigger `reset_participantes_ativos` realizará automaticamente a limpeza de participantes de sorteios com mais de 7 dias
2. Mesmo quando o sorteio não for realizado (por já ter ocorrido no dia), a limpeza ainda será executada pelo endpoint de sorteio
3. Os dados de disponibilidade dos sorteios (para mostrar o cadeado) e a limpeza de participantes antigos estarão sincronizados

## Como Funciona a Limpeza

A limpeza funciona da seguinte forma:

1. Mantém todos os registros da tabela `sorteios` (dados dos ganhadores)
2. Remove apenas os registros da tabela `historico_participantes` para sorteios com mais de 7 dias
3. Sorteios com mais de 7 dias terão seus botões "Ver Lista" substituídos por um cadeado
4. Quando o usuário clicar em um botão com cadeado, o site mostrará que os dados não estão mais disponíveis

## Verificação

Para verificar se o sistema está funcionando corretamente:

1. No SQL Editor do Supabase, execute:
   ```sql
   SELECT 
       s.id as sorteio_id, 
       TO_CHAR(s.data, 'DD/MM/YYYY') as data_sorteio,
       s.nome as vencedor,
       COUNT(hp.id) as num_participantes,
       s.data < CURRENT_TIMESTAMP - INTERVAL '7 days' as mais_que_7_dias,
       s.dados_disponiveis
   FROM 
       sorteios s
       LEFT JOIN historico_participantes hp ON s.id = hp.sorteio_id
   GROUP BY 
       s.id, s.data, s.nome, s.dados_disponiveis
   ORDER BY 
       s.data DESC;
   ```

2. Confirme que sorteios com mais de 7 dias têm poucos ou nenhum participante no histórico.

## Solução de Problemas

Se você encontrar algum problema:

1. Verifique os logs no console da sua aplicação Next.js
2. Verifique os logs da tabela `logs` no Supabase:
   ```sql
   SELECT * FROM logs ORDER BY data_hora DESC LIMIT 20;
   ```
3. Valide se as funções RPC foram criadas corretamente:
   ```sql
   SELECT proname FROM pg_proc WHERE proname LIKE 'limpar%' OR proname LIKE 'atualizar%';
   ```

Esta implementação foi projetada para funcionar com seu cron job único no plano gratuito, modificando apenas o necessário para corrigir o sistema de limpeza de participantes antigos. 