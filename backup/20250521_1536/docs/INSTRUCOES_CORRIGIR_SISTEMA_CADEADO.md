# Instruções para Corrigir o Sistema de Cadeado dos Sorteios

Este guia fornece as instruções para corrigir o sistema que mostra o botão "Ver Lista" para sorteios com menos de 7 dias e um cadeado para sorteios mais antigos.

## 1. Implementar as funções RPC no Supabase

Execute o script SQL abaixo no SQL Editor do Supabase:

```sql
-- Copie e cole o conteúdo do arquivo sql/correcao_sistema_cadeado_rpc.sql aqui
```

Este script cria 3 funções no Supabase:
- `adicionar_coluna_dados_disponiveis()`: Adiciona a coluna dados_disponiveis à tabela sorteios
- `atualizar_disponibilidade_sorteios_todos()`: Atualiza a disponibilidade de todos os sorteios
- `atualizar_trigger_reset_participantes_ativos()`: Modifica o trigger para atualizar a disponibilidade

## 2. Criar Endpoint de API para Correção

Crie o arquivo `pages/api/corrigir-sistema-cadeado.js` com o código fornecido.

## 3. Modificar o Endpoint de Sorteio

Atualize o arquivo `pages/api/executar-sorteio.js` para também atualizar o estado dos sorteios conforme necessário.

## 4. Executar a Correção Inicial

Execute a correção inicial para atualizar todos os sorteios existentes:

1. Defina a senha de administrador no seu arquivo .env:
   ```
   ADMIN_PASSWORD=suaSenhaSegura
   ```

2. Execute uma chamada POST para o endpoint de correção:
   ```
   curl -X POST http://seu-site/api/corrigir-sistema-cadeado -H "Content-Type: application/json" -d '{"senha":"suaSenhaSegura"}'
   ```

   Ou use o Postman ou qualquer outro cliente HTTP, ou simplesmente acesse a URL em seu navegador com os parâmetros corretos.

## Funcionamento

Após esta implementação:

1. A tabela `sorteios` terá uma coluna `dados_disponiveis` que indica se os dados do sorteio estão disponíveis
2. Sorteios com menos de 7 dias terão `dados_disponiveis = true` (botão "Ver Lista")
3. Sorteios com mais de 7 dias terão `dados_disponiveis = false` (ícone de cadeado)
4. Cada vez que ocorrer um sorteio, a disponibilidade de todos os sorteios será atualizada automaticamente
5. Mesmo que um sorteio não seja realizado (por exemplo, se já houve sorteio no dia), a disponibilidade ainda será atualizada

## Verificação

Para verificar se o sistema está funcionando corretamente:

1. No SQL Editor do Supabase, execute:
   ```sql
   SELECT 
     id, 
     TO_CHAR(data, 'DD/MM/YYYY') AS data_sorteio, 
     dados_disponiveis,
     CASE 
       WHEN data > CURRENT_TIMESTAMP - INTERVAL '7 days' THEN 'Ver Lista'
       ELSE 'Cadeado 🔒'
     END AS status_botao
   FROM sorteios 
   ORDER BY data DESC 
   LIMIT 10;
   ```

2. Confirme que sorteios com menos de 7 dias mostram "Ver Lista" e com mais de 7 dias mostram "Cadeado 🔒".

3. Acesse a página de Ganhadores e verifique visualmente se os botões e cadeados estão aparecendo corretamente.

## Solução de Problemas

Se você encontrar algum problema:

1. Verifique os logs no console da sua aplicação Next.js
2. Verifique os logs da tabela `logs` no Supabase:
   ```sql
   SELECT * FROM logs ORDER BY data_hora DESC LIMIT 20;
   ```
3. Valide se as funções RPC foram criadas corretamente:
   ```sql
   SELECT proname, prosrc FROM pg_proc WHERE proname LIKE 'atualizar%' OR proname LIKE 'adicionar%';
   ```

Esta implementação foi projetada para funcionar com seu cron job único no plano gratuito, modificando apenas o necessário para corrigir o sistema de cadeado. 