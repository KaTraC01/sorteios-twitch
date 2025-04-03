# Guia de Segurança para o Sistema de Sorteios

Este guia contém instruções importantes para a configuração segura do sistema de sorteios.

## Configuração de Variáveis de Ambiente

### 1. Criando o arquivo .env.local

Crie um arquivo `.env.local` na raiz do projeto com base no template `.env.example`. **NUNCA cometa o erro de adicionar este arquivo ao Git.**

### 2. Gerando chaves seguras

Execute o seguinte comando para gerar chaves seguras aleatórias:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use o resultado para as variáveis:
- `API_SECRET_KEY`
- `CRON_SECRET`

### 3. Variáveis no Vercel

Adicione todas as variáveis de ambiente no painel da Vercel:
1. Acesse o dashboard do seu projeto
2. Vá em "Settings" > "Environment Variables"
3. Adicione todas as variáveis do seu arquivo `.env.local`

## Verificações Regulares de Segurança

### 1. Revise regularmente as credenciais

- Recomendamos trocar as chaves `API_SECRET_KEY` e `CRON_SECRET` a cada 90 dias
- Monitore o acesso às suas APIs através dos logs da Vercel

### 2. Análise de repositório

Verifique regularmente se não há credenciais expostas no repositório:

```bash
git grep -l "supabase.*key\|secret\|password\|token"
```

## Rotação de Credenciais

Se você precisar rotacionar suas credenciais:

1. Gere novas chaves
2. Atualize o arquivo `.env.local` local
3. Atualize as variáveis no painel da Vercel
4. Espere o redeploy completo da aplicação

## Práticas Recomendadas

- Nunca compartilhe suas credenciais, nem mesmo em capturas de tela
- Não armazene credenciais em arquivos de script ou código-fonte
- Use o `.gitignore` para evitar o commit acidental de arquivos sensíveis
- Considere o uso de um gerenciador de segredos como GitHub Secrets ou HashiCorp Vault para projetos maiores 