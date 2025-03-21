# Configuração Serverless para Sorteios Automáticos

Este documento descreve a configuração serverless implementada para garantir que os sorteios ocorram automaticamente, independentemente de alguém estar com o site aberto.

## Visão Geral

O sistema utiliza funções serverless da Vercel e o banco de dados Supabase para automatizar o processo de sorteio. As funções são executadas em horários específicos através de cron jobs configurados na Vercel.

## Componentes Principais

### 1. Funções Serverless

- **api/sorteio.js**: Função principal que executa as operações de sorteio, congelamento e reset da lista.
- **api/cron.js**: Função agendada que verifica o horário atual e aciona as ações apropriadas.

### 2. Tabela de Configurações no Supabase

- Armazena o estado da lista (congelada ou não)
- Permite que o frontend sincronize com o estado gerenciado pelo backend

### 3. Cron Jobs na Vercel

- Configurados para executar a cada 5 minutos entre 20h e 21h
- Verificam o horário atual e executam a ação apropriada:
  - 20:50: Congelar a lista
  - 21:00: Realizar o sorteio
  - 21:05: Resetar a lista

## Fluxo de Execução

1. O cron job é acionado a cada 5 minutos entre 20h e 21h
2. A função `api/cron.js` verifica o horário atual
3. Com base no horário, a função chama `api/sorteio.js` com a ação apropriada
4. A função `api/sorteio.js` executa a ação no banco de dados Supabase
5. O frontend se mantém sincronizado através das inscrições em tempo real do Supabase

## Configuração na Vercel

Para configurar este sistema na Vercel, você precisa:

1. Fazer deploy do projeto na Vercel
2. Configurar as seguintes variáveis de ambiente:
   - `SUPABASE_URL`: URL do seu projeto Supabase
   - `SUPABASE_SERVICE_KEY`: Chave de serviço do Supabase (não a chave anônima)
   - `API_SECRET_KEY`: Chave secreta para autenticar chamadas à API
   - `CRON_SECRET`: Chave secreta para autenticar chamadas do cron job

## Segurança

- As funções serverless são protegidas por autenticação via token
- A chave de serviço do Supabase é usada apenas no backend, nunca exposta ao cliente
- As políticas de segurança do Supabase (RLS) garantem que apenas operações autorizadas sejam permitidas

## Testes

Para testar manualmente as funções serverless:

1. Acesse `https://seu-site.vercel.app/api/sorteio` com um cliente HTTP (como Postman)
2. Envie uma requisição POST com o seguinte corpo:
   ```json
   {
     "action": "sorteio" // ou "congelar" ou "resetar"
   }
   ```
3. Inclua o cabeçalho de autorização: `Authorization: Bearer SEU_API_SECRET_KEY`

## Solução de Problemas

Se os sorteios não estiverem ocorrendo automaticamente:

1. Verifique os logs da Vercel para as funções serverless
2. Confirme que as variáveis de ambiente estão configuradas corretamente
3. Verifique se o cron job está sendo executado nos horários esperados
4. Teste as funções manualmente para identificar possíveis erros
