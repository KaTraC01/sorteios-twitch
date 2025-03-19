# Configuração do Sorteio Automático 100% Independente

Este guia explica como configurar o sorteio para funcionar **de forma completamente automática, sem depender de usuários ativos no site**.

## Problema Resolvido

Com esta solução:
- O sorteio acontece exatamente às 21h todos os dias
- Funciona mesmo se ninguém estiver com o site aberto
- Não precisa de usuários logados
- Todos veem o mesmo resultado (sorteio global)

## Passos para Configuração

### Passo 1: Configurar o Banco de Dados

1. Acesse o Supabase
2. Vá para o SQL Editor
3. Cole e execute o conteúdo do arquivo `sorteio_automatico_db.sql`
4. Isso criará a função `realizar_sorteio_automatico()` que faz o sorteio

### Passo 2: Configurar a API

O arquivo `pages/api/executar-sorteio.js` já foi criado no seu projeto. Este arquivo cria um endpoint que chama a função de sorteio quando acessado.

### Passo 3: Configurar o Serviço de Agendamento Externo (Cron Job)

Vamos usar um serviço gratuito para agendar uma chamada à sua API todos os dias às 21h:

1. **Crie uma conta no Cron-Job.org**:
   - Acesse https://cron-job.org
   - Clique em "Sign up" e crie uma conta gratuita
   - Faça login após criar a conta

2. **Crie um novo Cron Job**:
   - Clique no botão "+ Create cronjob"
   - Digite um título (ex: "Sorteio Diário 21h")

3. **Configure a URL**:
   - Em "URL" digite: `https://seu-site.vercel.app/api/executar-sorteio`
   - Substitua "seu-site.vercel.app" pelo endereço real do seu site

4. **Configure o horário**:
   - Em "Schedule" escolha "Custom schedule"
   - Configure para executar todos os dias às 21:00
   - Assegure-se que o fuso horário está correto para Brasília (-03:00)

5. **Configurações adicionais**:
   - Em "Notification" você pode configurar para receber email se o job falhar
   - Em "Save responses" você pode ativar para salvar os resultados do sorteio

6. **Salve o job**:
   - Clique em "Create cronjob"

### Passo 4: Teste Manual

Para verificar se está tudo funcionando corretamente:

1. Teste a função no Supabase:
   ```sql
   SELECT realizar_sorteio_automatico();
   ```

2. Teste a API diretamente:
   - Acesse seu site e navegue para `/api/executar-sorteio`
   - Você deverá ver uma resposta JSON indicando se o sorteio foi realizado

3. Teste o Cron Job:
   - No cron-job.org, selecione seu job e clique em "Run now"
   - Verifique no painel se a execução foi bem-sucedida

## Como Funciona

1. Todos os dias às 21h, o cron-job.org faz uma chamada HTTP para seu endpoint
2. O endpoint chama a função `realizar_sorteio_automatico()` no Supabase
3. A função verifica se é possível fazer o sorteio e, se for, seleciona um vencedor
4. O trigger no banco de dados salva os participantes no histórico e limpa a lista
5. Na próxima vez que qualquer usuário abrir o site, verá o resultado do sorteio

## Vantagens Desta Solução

- **100% Autônoma**: Não depende de usuários ativos no site
- **Precisão**: Acontece exatamente às 21h, não com 5 minutos de tolerância
- **Confiabilidade**: Cron-job.org tem alta disponibilidade (99.9%)
- **Gratuita**: Não precisa pagar pelo Supabase ou por outros serviços

## Solução de Problemas

Se o sorteio não estiver funcionando:

1. Verifique os logs no banco de dados:
   ```sql
   SELECT * FROM logs ORDER BY data_hora DESC LIMIT 10;
   ```

2. Verifique o histórico de execuções no cron-job.org
   - Veja se há erros nas chamadas
   - Verifique se o horário está configurado corretamente

3. Teste a API manualmente para ver se retorna erros 