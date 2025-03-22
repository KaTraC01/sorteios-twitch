# Ler o arquivo de configuração
$configJson = Get-Content -Path "./supabase-config.json" -Raw | ConvertFrom-Json

# Definir as variáveis para configuração
$env:SUPABASE_PROJECT_REF = $configJson.supabaseProjectRef
$env:SUPABASE_DB_PASSWORD = $configJson.supabaseDbPassword
$env:SUPABASE_REGION = $configJson.supabaseRegion
$env:SUPABASE_ACCESS_TOKEN = $configJson.supabaseAccessToken
$env:SUPABASE_SERVICE_ROLE_KEY = $configJson.supabaseServiceRoleKey

Write-Host "Instalando o servidor Supabase MCP com as seguintes configurações:"
Write-Host "Project Ref: $env:SUPABASE_PROJECT_REF"
Write-Host "Region: $env:SUPABASE_REGION"

# Executar o comando de instalação
npx -y @smithery/cli@latest install @alexander-zuev/supabase-mcp-server --client cursor --yes 