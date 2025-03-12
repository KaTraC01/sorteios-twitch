// Script para testar o cron job manualmente
// Salve este arquivo e execute com: node fix_cron_job.js

const fetch = require('node-fetch');

async function testCronJob() {
  try {
    console.log('Testando o cron job manualmente...');
    
    // Substitua pela URL do seu site
    const baseUrl = 'https://sorteios-twitch.vercel.app';
    
    // Teste 1: Executar o sorteio
    console.log('\n1. Testando a ação de sorteio:');
    const sorteioResponse = await fetch(`${baseUrl}/api/sorteio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.API_SECRET_KEY // Substitua pela sua chave secreta
      },
      body: JSON.stringify({ action: 'sorteio' })
    });
    
    const sorteioResult = await sorteioResponse.json();
    console.log('Resultado do sorteio:', sorteioResult);
    
    // Teste 2: Resetar a lista
    console.log('\n2. Testando a ação de resetar a lista:');
    const resetResponse = await fetch(`${baseUrl}/api/sorteio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.API_SECRET_KEY // Substitua pela sua chave secreta
      },
      body: JSON.stringify({ action: 'resetar' })
    });
    
    const resetResult = await resetResponse.json();
    console.log('Resultado do reset:', resetResult);
    
    console.log('\nTestes concluídos!');
  } catch (error) {
    console.error('Erro ao testar o cron job:', error);
  }
}

// Execute a função de teste
testCronJob(); 