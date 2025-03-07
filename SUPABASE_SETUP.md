# Configuração do Banco de Dados no Supabase

Este documento contém instruções para configurar corretamente o banco de dados no Supabase para o sistema de sorteio.

## Pré-requisitos

1. Ter uma conta no [Supabase](https://supabase.io/)
2. Ter criado um projeto no Supabase
3. Ter as credenciais de acesso (URL e API Key)

## Configuração das Tabelas

Você pode configurar o banco de dados de duas maneiras:

### Opção 1: Usando o Editor SQL

1. Acesse o painel do seu projeto no Supabase
2. Clique em "SQL Editor" no menu lateral
3. Clique em "New Query"
4. Cole o conteúdo do arquivo `supabase_setup.sql` no editor
5. Clique em "Run" para executar o script

### Opção 2: Usando a Interface Visual

#### Tabela `participantes_ativos`

1. Acesse o painel do seu projeto no Supabase
2. Clique em "Table Editor" no menu lateral
3. Clique em "Create a new table"
4. Configure a tabela com os seguintes campos:
   - Nome da tabela: `participantes_ativos`
   - Campos:
     - `id` (tipo: uuid, Primary Key, Default: `uuid_generate_v4()`)
     - `nome_twitch` (tipo: text, Not Null)
     - `streamer_escolhido` (tipo: text, Not Null)
     - `created_at` (tipo: timestamptz, Default: `now()`)
     - `updated_at` (tipo: timestamptz, Default: `now()`)
5. Clique em "Save" para criar a tabela

#### Tabela `sorteios`

1. Clique em "Create a new table" novamente
2. Configure a tabela com os seguintes campos:
   - Nome da tabela: `sorteios`
   - Campos:
     - `id` (tipo: uuid, Primary Key, Default: `uuid_generate_v4()`)
     - `data` (tipo: timestamptz, Default: `now()`)
     - `numero` (tipo: integer, Not Null)
     - `nome` (tipo: text, Not Null)
     - `streamer` (tipo: text, Not Null)
     - `created_at` (tipo: timestamptz, Default: `now()`)
3. Clique em "Save" para criar a tabela

## Configuração das Políticas de Segurança (RLS)

Para cada tabela, você precisa configurar as políticas de segurança:

### Tabela `participantes_ativos`

1. Acesse o painel do seu projeto no Supabase
2. Clique em "Authentication" no menu lateral
3. Clique em "Policies"
4. Selecione a tabela `participantes_ativos`
5. Habilite o RLS (Row Level Security)
6. Adicione as seguintes políticas:
   - **Política de Leitura**:
     - Nome: "Permitir leitura para todos"
     - Operação: SELECT
     - Usando expressão: `true`
   - **Política de Inserção**:
     - Nome: "Permitir inserção para todos"
     - Operação: INSERT
     - Usando expressão: `true`
   - **Política de Exclusão**:
     - Nome: "Permitir exclusão para todos"
     - Operação: DELETE
     - Usando expressão: `true`

### Tabela `sorteios`

1. Selecione a tabela `sorteios`
2. Habilite o RLS (Row Level Security)
3. Adicione as seguintes políticas:
   - **Política de Leitura**:
     - Nome: "Permitir leitura para todos"
     - Operação: SELECT
     - Usando expressão: `true`
   - **Política de Inserção**:
     - Nome: "Permitir inserção para todos"
     - Operação: INSERT
     - Usando expressão: `true`

## Verificação

Para verificar se tudo está configurado corretamente:

1. Acesse o painel do seu projeto no Supabase
2. Clique em "Table Editor" no menu lateral
3. Verifique se as tabelas `participantes_ativos` e `sorteios` estão listadas
4. Clique em "Authentication" > "Policies"
5. Verifique se o RLS está habilitado para ambas as tabelas
6. Verifique se as políticas estão configuradas corretamente

## Testando a Conexão

Para testar se a aplicação está se conectando corretamente ao banco de dados:

1. Verifique se as credenciais (URL e API Key) estão configuradas corretamente no arquivo `.env.local`
2. Inicie a aplicação com `npm start`
3. Tente adicionar um participante
4. Verifique se o participante aparece na lista
5. Verifique se o participante foi adicionado à tabela `participantes_ativos` no Supabase

## Solução de Problemas

Se você encontrar problemas:

1. Verifique os logs no console do navegador para ver se há erros
2. Verifique se as credenciais do Supabase estão corretas
3. Verifique se as tabelas e políticas foram criadas corretamente
4. Verifique se o RLS está habilitado para ambas as tabelas 