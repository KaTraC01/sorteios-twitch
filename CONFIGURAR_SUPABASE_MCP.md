# Configuração do Supabase MCP Server

## Passo 1: Instalar o pacote necessário

Execute este comando no terminal:

```bash
npm install @modelcontextprotocol/server-postgres
```

## Passo 2: Criar arquivo de configuração MCP

Crie um arquivo chamado `mcp.json` na raiz do projeto com o seguinte conteúdo:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-postgres",
        "postgresql://postgres:xzXiA63wHP5BE@db.nsqiytflqwlyqhdmueki.supabase.co:5432/postgres"
      ]
    }
  }
}
```

## Passo 3: Configurar o Cursor para usar o MCP

1. No menu do Cursor, vá em File > Settings
2. Procure por "MCP"
3. Defina o arquivo de configuração como `mcp.json`
4. Reinicie o Cursor

## Passo 4: Testar a conexão

Para verificar se a configuração está funcionando, tente consultar o banco de dados com este comando:

```sql
SELECT now() as current_time;
```

## Informações do Supabase

- **Supabase project reference ID**: nsqiytflqwlyqhdmueki
- **Database password**: xzXiA63wHP5BE
- **Supabase region**: sa-east-1
- **Supabase access token**: sbp_84b3e25d0033daf5c2107757d96e5d262bf57968
- **Supabase service role key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zcWl5dGZscXdseXFoZG11ZWtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTkxNzkwNCwiZXhwIjoyMDU1NDkzOTA0fQ.ME0-XlXtA8uKp72m9pniSlEFRdMTZITNUV2OCmzO23M

## Comando para iniciar o servidor manualmente

Se preferir iniciar o servidor manualmente, use:

```bash
npx @modelcontextprotocol/server-postgres "postgresql://postgres:xzXiA63wHP5BE@db.nsqiytflqwlyqhdmueki.supabase.co:5432/postgres"
``` 