# INSTRUÇÕES DE RESTAURAÇÃO DO BACKUP DO SISTEMA DE SORTEIOS

Este arquivo contém instruções para restaurar o backup completo do sistema de sorteios baseado em Supabase e Next.js.

## 1. RESTAURAÇÃO DO FRONTEND

1. Descompacte o arquivo de backup
2. Acesse a pasta 'frontend'
3. Instale as dependências:
   ```
   npm install
   ```
4. Crie um arquivo `.env.local` na raiz do projeto com base no arquivo `.env.example` (substitua com seus valores)
5. Execute o build do projeto:
   ```
   npm run build
   ```
6. Inicie o servidor:
   ```
   npm start
   ```

## 2. RESTAURAÇÃO DO BANCO DE DADOS SUPABASE

1. Acesse o painel de administração do Supabase e crie um novo projeto
2. Use o Editor SQL para criar as tabelas e funções do banco:
   - Execute os scripts SQL da pasta `sql` para criar a estrutura do banco de dados
   - Execute os scripts da pasta `supabase_functions` para criar funções personalizadas

## 3. CONFIGURAÇÃO DO CRON

1. Configure o cron job para o sorteio automático:
   - Se usando Vercel, configure um cron no arquivo `vercel.json`
   - Se usando outro serviço, configure um job para chamar o endpoint `/api/cron-sorteio` periodicamente

## 4. VERIFICAÇÃO DO SISTEMA

1. Acesse `/api/debug-env` para verificar se as variáveis de ambiente estão configuradas corretamente
2. Acesse `/api/diagnostico-cron` para verificar se os crons estão funcionando
3. Teste um sorteio manual para garantir que tudo está funcionando corretamente

## NOTAS DE SEGURANÇA

- Mantenha o arquivo `.env.local` seguro e nunca o compartilhe
- Mude todas as senhas e chaves de API após a restauração
- Configure corretamente as RLS (Row Level Security) policies no Supabase para proteger seus dados

Para mais detalhes, consulte os arquivos de documentação na pasta `docs`.

## INFORMAÇÕES DO BACKUP

- Data do backup: 21/05/2025, 15:36:33
- Tipo: Backup completo baseado em arquivos
