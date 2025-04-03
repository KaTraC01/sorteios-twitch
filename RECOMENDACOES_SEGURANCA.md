# Recomendações de Segurança para o Projeto

## Gerenciamento Seguro de Credenciais

### 1. Nunca armazene credenciais diretamente no código-fonte
- Não faça hard-coding de chaves, tokens ou senhas
- Evite colocar credenciais reais em arquivos de exemplo ou documentação

### 2. Uso correto de variáveis de ambiente
- Configure variáveis de ambiente na plataforma de hospedagem (Vercel)
- Mantenha arquivos .env.* no .gitignore
- Use arquivos .env.*.example como templates, sem valores reais

### 3. Chaves do Supabase
- A chave anônima do Supabase é considerada "segura para uso no navegador" SOMENTE se você tiver configurado Row Level Security (RLS)
- Mesmo assim, não commit esta chave no código-fonte
- Utilize as variáveis de ambiente da Vercel para injetar essas chaves no build

## Configuração da Vercel

1. No painel da Vercel, acesse as configurações do projeto
2. Na seção "Environment Variables", adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `REACT_APP_SUPABASE_URL` (opcional, para compatibilidade)
   - `REACT_APP_SUPABASE_ANON_KEY` (opcional, para compatibilidade)

3. Certifique-se de que a variável tenha o mesmo nome exato usado no código

## Configuração do Supabase

1. Certifique-se de que a Row Level Security (RLS) esteja ativada em todas as tabelas
2. Crie políticas de acesso apropriadas para cada tabela
3. Teste a segurança fazendo login como usuários com diferentes níveis de acesso
4. Limite as permissões da chave anônima ao mínimo necessário para seu aplicativo

## Desenvolvimento Local

1. Crie um arquivo `.env.local` baseado no `.env.example`
2. Preencha-o com suas próprias credenciais de desenvolvimento
3. Nunca commit o arquivo `.env.local`

## Prática Recomendada

Caso precise compartilhar credenciais com outros desenvolvedores, use canais seguros como:
- Gerenciadores de senhas compartilhados
- Sistemas de gerenciamento de segredos (AWS Secrets Manager, HashiCorp Vault, etc.)
- Comunicação criptografada

Lembre-se: A segurança de um aplicativo é apenas tão forte quanto seu elo mais fraco. 