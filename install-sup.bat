@echo off
echo Configurando as variáveis de ambiente...

set SUPABASE_PROJECT_REF=nsqiytflqwlyqhdmueki
set SUPABASE_DB_PASSWORD=xzXiA63wHP5BE
set SUPABASE_REGION=sa-east-1
set SUPABASE_ACCESS_TOKEN=sbp_84b3e25d0033daf5c2107757d96e5d262bf57968
set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zcWl5dGZscXdseXFoZG11ZWtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTkxNzkwNCwiZXhwIjoyMDU1NDkzOTA0fQ.ME0-XlXtA8uKp72m9pniSlEFRdMTZITNUV2OCmzO23M

echo Instalando o Supabase MCP Server...
call npx --yes @smithery/cli@latest install @alexander-zuev/supabase-mcp-server --client cursor

echo Instalação concluída!
pause 