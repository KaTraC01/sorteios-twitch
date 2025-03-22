@echo off
echo ---------------------------------------------
echo Instalação do Supabase MCP Server
echo ---------------------------------------------

echo 1. Instalando o pacote do Supabase MCP Server...
call npm install @modelcontextprotocol/server-postgres

echo.
echo 2. Definindo as credenciais do Supabase...
echo.
echo Copie e cole as seguintes informações quando solicitado:
echo.
echo Supabase project reference ID: nsqiytflqwlyqhdmueki
echo Database password: xzXiA63wHP5BE
echo Supabase region: sa-east-1
echo Supabase access token: sbp_84b3e25d0033daf5c2107757d96e5d262bf57968
echo Supabase service role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zcWl5dGZscXdseXFoZG11ZWtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTkxNzkwNCwiZXhwIjoyMDU1NDkzOTA0fQ.ME0-XlXtA8uKp72m9pniSlEFRdMTZITNUV2OCmzO23M
echo.
echo 3. Execute o seguinte comando para iniciar o servidor Supabase após a instalação:
echo    npx @modelcontextprotocol/server-postgres "postgresql://postgres:xzXiA63wHP5BE@db.nsqiytflqwlyqhdmueki.supabase.co:5432/postgres"
echo.
echo Pressione qualquer tecla para continuar com a instalação...
pause > nul

:: Continuar com a instalação
npx --yes @smithery/cli@latest install @alexander-zuev/supabase-mcp-server --client cursor 