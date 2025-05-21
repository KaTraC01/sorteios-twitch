# INSTRUÇÕES DE RESTAURAÇÃO DO BACKUP DO SISTEMA DE SORTEIOS

Este arquivo contém instruções para restaurar o backup completo do sistema de sorteios baseado em Supabase e Next.js.

## 1. RESTAURAÇÃO DO FRONTEND

1. Descompacte o arquivo `frontend_backup.zip`
2. Instale as dependências:
   ```
   npm install
   ```
3. Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis (substitua com seus valores):
   ```
   NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
   SUPABASE_SERVICE_KEY=sua_chave_service
   API_SECRET_KEY=chave_secreta_da_api
   BASE_URL=url_base_da_sua_aplicacao
   ADMIN_PASSWORD=senha_admin_para_endpoints_protegidos
   CRON_SECRET=segredo_para_endpoints_cron
   ```
4. Execute o build do projeto:
   ```
   npm run build
   ```
5. Inicie o servidor:
   ```
   npm start
   ```

## 2. RESTAURAÇÃO DO BANCO DE DADOS SUPABASE

1. Acesse o painel de administração do Supabase e crie um novo projeto
2. Restaure o banco de dados a partir do arquivo `db_backup.sql`:
   
   **Opção 1 - Usando o Supabase CLI:**
   ```
   supabase db restore --project-ref seu_ref_do_projeto db_backup.sql
   ```
   
   **Opção 2 - Usando psql diretamente:**
   ```
   psql -h sua_url_db.supabase.co -U postgres -d postgres -f db_backup.sql
   ```

3. Execute os scripts SQL adicionais presentes na pasta `sql/restauracao` se necessário

## 3. RESTAURAÇÃO DAS FUNÇÕES SUPABASE

1. Acesse o Editor SQL no Supabase Studio
2. Execute os scripts da pasta `supabase_functions/` um por um, na seguinte ordem:
   - `atualizar_metricas_resumo.sql`
   - (outros scripts, se houver)

## 4. CONFIGURAÇÃO DO CRON

1. Configure o cron job para o sorteio automático:
   - Se usando Vercel, configure um cron no arquivo `vercel.json`
   - Se usando outro serviço, configure um job para chamar o endpoint `/api/cron-sorteio` periodicamente

## 5. VERIFICAÇÃO DO SISTEMA

1. Acesse `/api/debug-env` para verificar se as variáveis de ambiente estão configuradas corretamente
2. Acesse `/api/diagnostico-cron` para verificar se os crons estão funcionando
3. Teste um sorteio manual para garantir que tudo está funcionando corretamente

## NOTAS DE SEGURANÇA

- Mantenha o arquivo `.env.local` seguro e nunca o compartilhe
- Mude todas as senhas e chaves de API após a restauração
- Configure corretamente as RLS (Row Level Security) policies no Supabase para proteger seus dados

Para mais detalhes, consulte os arquivos:
- DOCUMENTACAO_SISTEMA.md
- RECOMENDACOES_SEGURANCA.md
- INSTRUCOES_RESTAURACAO.md 