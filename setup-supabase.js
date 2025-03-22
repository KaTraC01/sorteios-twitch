const { execSync } = require('child_process');
const fs = require('fs');

// Ler o arquivo de configuração
const configData = fs.readFileSync('./supabase-config.json', 'utf8');
const config = JSON.parse(configData);

// Criar um comando que use a opção --yes para aceitar todos os prompts automaticamente
const command = `npx -y @smithery/cli@latest install @alexander-zuev/supabase-mcp-server --client cursor --yes`;

console.log('Instalando o servidor Supabase MCP...');

try {
  // Executar o comando
  execSync(command, { 
    stdio: 'inherit',
    env: {
      ...process.env,
      SUPABASE_PROJECT_REF: config.supabaseProjectRef,
      SUPABASE_DB_PASSWORD: config.supabaseDbPassword,
      SUPABASE_REGION: config.supabaseRegion,
      SUPABASE_ACCESS_TOKEN: config.supabaseAccessToken,
      SUPABASE_SERVICE_ROLE_KEY: config.supabaseServiceRoleKey
    }
  });
  
  console.log('Instalação concluída com sucesso!');
} catch (error) {
  console.error('Erro durante a instalação:', error.message);
  process.exit(1);
} 