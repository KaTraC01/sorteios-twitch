@echo off
echo Executando instalação direta do Supabase MCP Server...

npx --yes @smithery/cli@latest install @alexander-zuev/supabase-mcp-server --client cursor --manual

echo.
echo Quando solicitado, forneça as seguintes informações:
echo.
echo Supabase project reference ID: nsqiytflqwlyqhdmueki
echo Database password: xzXiA63wHP5BE
echo Supabase region: sa-east-1
echo Supabase access token: sbp_84b3e25d0033daf5c2107757d96e5d262bf57968
echo Supabase service role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zcWl5dGZscXdseXFoZG11ZWtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTkxNzkwNCwiZXhwIjoyMDU1NDkzOTA0fQ.ME0-XlXtA8uKp72m9pniSlEFRdMTZITNUV2OCmzO23M
echo.
echo Pressione qualquer tecla para continuar...
pause > nul 