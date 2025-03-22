const { spawn } = require('child_process');
const fs = require('fs');

// Carregar as respostas do arquivo JSON
const respostas = JSON.parse(fs.readFileSync('./respostas.json', 'utf8'));

console.log('Iniciando instalação do Supabase MCP Server...');

// Configurar as variáveis de ambiente
process.env.SUPABASE_PROJECT_REF = respostas.supabaseProjectRef;
process.env.SUPABASE_DB_PASSWORD = respostas.supabaseDbPassword;
process.env.SUPABASE_REGION = respostas.supabaseRegion;
process.env.SUPABASE_ACCESS_TOKEN = respostas.supabaseAccessToken;
process.env.SUPABASE_SERVICE_ROLE_KEY = respostas.supabaseServiceRoleKey;

// Criar o processo para instalar o pacote
const instalacao = spawn('npx', [
  '--yes',
  '@smithery/cli@latest',
  'install',
  '@alexander-zuev/supabase-mcp-server',
  '--client',
  'cursor',
  '--yes' // Responde "sim" para todas as perguntas
], {
  stdio: 'pipe', // Permite interagir com stdin/stdout/stderr
  shell: true
});

// Mapear perguntas esperadas com respostas
const perguntasRespostas = [
  { pergunta: /Would you like to help improve Smithery/, resposta: 'y\n' },
  { pergunta: /Supabase project reference ID/, resposta: `${respostas.supabaseProjectRef}\n` },
  { pergunta: /Database password/, resposta: `${respostas.supabaseDbPassword}\n` },
  { pergunta: /Supabase region/, resposta: `${respostas.supabaseRegion}\n` },
  { pergunta: /Supabase access token/, resposta: `${respostas.supabaseAccessToken}\n` },
  { pergunta: /Supabase service role key/, resposta: `${respostas.supabaseServiceRoleKey}\n` }
];

// Acumular dados de saída
let outputBuffer = '';

// Monitorar a saída para identificar perguntas e enviar respostas
instalacao.stdout.on('data', (data) => {
  const output = data.toString();
  outputBuffer += output;
  console.log(output);
  
  // Verificar se a saída contém alguma das perguntas esperadas
  for (const { pergunta, resposta } of perguntasRespostas) {
    if (pergunta.test(output)) {
      console.log(`Enviando resposta automática: ${resposta.trim()}`);
      instalacao.stdin.write(resposta);
      break;
    }
  }
});

// Monitorar erros
instalacao.stderr.on('data', (data) => {
  console.error(`Erro: ${data.toString()}`);
});

// Finalização do processo
instalacao.on('close', (code) => {
  if (code === 0) {
    console.log('Instalação concluída com sucesso!');
  } else {
    console.error(`Instalação falhou com código de saída ${code}`);
    
    // Analisar a saída para encontrar pistas sobre o erro
    if (outputBuffer.includes('JSON')) {
      console.error('Erro de formato JSON detectado. Verifique as credenciais.');
    } else if (outputBuffer.includes('network')) {
      console.error('Erro de rede detectado. Verifique sua conexão.');
    }
  }
}); 