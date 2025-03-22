@echo off
echo ------------------------------------------------------
echo Instalando o servidor MCP PostgreSQL para o Supabase
echo ------------------------------------------------------

echo Instalando o pacote necessário...
call npm install @modelcontextprotocol/server-postgres

echo.
echo Criando o arquivo de configuração mcp.json...
echo {^
  "mcpServers": {^
    "supabase": {^
      "command": "npx",^
      "args": [^
        "@modelcontextprotocol/server-postgres",^
        "postgresql://postgres:xzXiA63wHP5BE@db.nsqiytflqwlyqhdmueki.supabase.co:5432/postgres"^
      ]^
    }^
  }^
} > mcp.json

echo.
echo Instalação concluída com sucesso!
echo.
echo ------------------------------------------------------
echo Próximos passos:
echo ------------------------------------------------------
echo 1. No Cursor, vá em File ^> Settings
echo 2. Procure por "MCP"
echo 3. Defina o arquivo de configuração como mcp.json
echo 4. Reinicie o Cursor
echo ------------------------------------------------------
echo.
echo Pressione qualquer tecla para sair...
pause > nul 