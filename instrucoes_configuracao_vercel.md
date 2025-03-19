# Configuração do Sorteio Automático com Vercel Cron Jobs

Este guia explica como configurar o sorteio automático diário usando os Cron Jobs da Vercel.

## Como Funciona

Com esta solução:
- O sorteio acontece automaticamente às 21h todos os dias
- É executado pela infraestrutura da Vercel (não depende de usuários no site)
- É um sorteio único/global para todos os usuários

## Passos para Configuração

### Passo 1: Configurar o Banco de Dados

1. Acesse o Supabase
2. Vá para o SQL Editor
3. Cole e execute o conteúdo do arquivo `corrigir_trigger_reset.sql`
4. Isso garantirá que o trigger que limpa a lista após o sorteio funcione corretamente

### Passo 2: Configurar a Vercel

1. Certifique-se de que o arquivo `vercel.json` esteja na raiz do projeto com a configuração:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "package.json",
         "use": "@vercel/next"
       }
     ],
     "crons": [
       {
         "path": "/api/cron-sorteio",
         "schedule": "0 21 * * *"
       }
     ]
   }
   ```

2. Adicione a variável de ambiente `CRON_SECRET` no dashboard da Vercel:
   - Acesse o projeto na Vercel
   - Vá para "Settings" -> "Environment Variables"
   - Adicione uma variável chamada `CRON_SECRET` com um valor aleatório seguro
   - Clique em "Save"

3. Reimplante o projeto para ativar o cron job:
   - No dashboard da Vercel, clique em "Deployments"
   - Clique em "Redeploy" no último deployment bem-sucedido

### Passo 3: Verificar a Configuração

Para confirmar que tudo está configurado corretamente:

1. No dashboard da Vercel, vá para "Settings" -> "Cron Jobs"
2. Confirme que o cron job está listado e ativo
3. Verifique o horário do próximo agendamento

## Solução de Problemas

Se o sorteio não estiver funcionando:

1. Verifique os logs na Vercel:
   - Vá para "Deployments" -> último deployment -> "Functions"
   - Clique na função "/api/cron-sorteio" para ver os logs de execução

2. Verifique os logs no banco de dados:
   ```sql
   SELECT * FROM logs ORDER BY data_hora DESC LIMIT 10;
   ```

3. Teste o endpoint manualmente no ambiente de desenvolvimento:
   ```
   curl http://localhost:3000/api/cron-sorteio
   ```

## Vantagens desta Solução

- **Gerenciada pela Vercel**: Não precisa de serviços externos
- **Confiável**: A Vercel garante a execução do cron job
- **Simples**: Toda a infraestrutura é gerenciada automaticamente
- **Grátis**: Incluído no plano gratuito da Vercel (1 execução por dia)

## Limitações

- Plano gratuito da Vercel: Limitado a uma execução de cron job por dia
- Se o job falhar, não há retentativas automáticas

---

Se precisar de ajuda adicional, consulte a [documentação oficial de Cron Jobs da Vercel](https://vercel.com/docs/cron-jobs). 