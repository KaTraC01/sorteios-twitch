const readline = require('readline');
const { spawn } = require('child_process');

// Cria uma interface de leitura e escrita
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('Iniciando instalação do Supabase MCP Server...');

// Iniciando o processo do smithery cli
const smithery = spawn('npx', [
  '@smithery/cli@latest', 
  'install', 
  '@alexander-zuev/supabase-mcp-server', 
  '--client', 
  'cursor'
], { 
  stdio: ['pipe', process.stdout, process.stderr],
  shell: true 
});

// Lista de respostas para as perguntas esperadas
const respostas = [
  'y', // Aceitar o envio de dados anônimos de uso
  'nsqiytflqwlyqhdmueki', // Project reference ID
  'xzXiA63wHP5BE', // Password
  'sa-east-1', // Region
  'sbp_84b3e25d0033daf5c2107757d96e5d262bf57968', // Access token
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zcWl5dGZscXdseXFoZG11ZWtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTkxNzkwNCwiZXhwIjoyMDU1NDkzOTA0fQ.ME0-XlXtA8uKp72m9pniSlEFRdMTZITNUV2OCmzO23M' // Service role key
];

// Função para responder às perguntas
let respostaIndex = 0;

// O usuário precisa pressionar Enter para enviar cada resposta
console.log('\nQuando solicitado, pressione ENTER para fornecer a próxima resposta.');

rl.on('line', () => {
  if (respostaIndex < respostas.length) {
    const resposta = respostas[respostaIndex];
    console.log(`Enviando resposta: ${resposta}`);
    smithery.stdin.write(resposta + '\n');
    respostaIndex++;
    
    if (respostaIndex < respostas.length) {
      console.log('\nPressione ENTER para fornecer a próxima resposta.');
    } else {
      console.log('\nTodas as respostas foram enviadas. Aguardando conclusão da instalação...');
      rl.close();
    }
  }
});

// Eventos do processo
smithery.on('close', (code) => {
  console.log(`Instalação concluída com código de saída ${code}`);
  rl.close();
});

smithery.on('error', (err) => {
  console.error('Erro ao executar o comando:', err);
  rl.close();
}); 