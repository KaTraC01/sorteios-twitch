/**
 * Script para diagnóstico do cron job de sorteio
 * Executa uma simulação do cron job e verifica se tudo está configurado corretamente
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Função para simular a execução do cron
async function simularCron() {
  console.log('\n===== DIAGNÓSTICO DO CRON JOB DE SORTEIO =====\n');
  
  // Verificar variáveis de ambiente necessárias
  const envVars = {
    BASE_URL: process.env.BASE_URL || '',
    API_SECRET_KEY: process.env.API_SECRET_KEY || '',
    VERBOSE_LOGS: process.env.VERBOSE_LOGS || ''
  };
  
  console.log('1. Verificando variáveis de ambiente:');
  let variavelFaltando = false;
  
  // Verificar BASE_URL
  if (!envVars.BASE_URL) {
    console.log('   ❌ BASE_URL não está configurada!');
    variavelFaltando = true;
  } else {
    console.log(`   ✅ BASE_URL está configurada: ${envVars.BASE_URL}`);
  }
  
  // Verificar API_SECRET_KEY
  if (!envVars.API_SECRET_KEY) {
    console.log('   ❌ API_SECRET_KEY não está configurada!');
    variavelFaltando = true;
  } else {
    const maskedKey = envVars.API_SECRET_KEY.length > 8
      ? `${envVars.API_SECRET_KEY.substring(0, 4)}...${envVars.API_SECRET_KEY.substring(envVars.API_SECRET_KEY.length - 4)}`
      : '[muito curta]';
    console.log(`   ✅ API_SECRET_KEY está configurada: ${maskedKey}`);
  }
  
  // Verificar VERBOSE_LOGS
  console.log(`   ℹ️ VERBOSE_LOGS: ${envVars.VERBOSE_LOGS || 'não configurada'}`);
  console.log(`      (Recomendação: configurar VERBOSE_LOGS=true em produção para logs detalhados)`);
  
  if (variavelFaltando) {
    console.log('\n❌ ERRO: Algumas variáveis de ambiente necessárias não estão configuradas.');
    console.log('   Por favor, configure essas variáveis antes de continuar.');
    console.log('   Para configurar temporariamente, execute:');
    console.log('      - Windows (PowerShell): $env:BASE_URL="https://seu-site.vercel.app"; $env:API_SECRET_KEY="sua-chave"');
    console.log('      - Linux/Mac: export BASE_URL="https://seu-site.vercel.app" API_SECRET_KEY="sua-chave"');
    console.log('   Para configurar permanentemente, use Vercel CLI:');
    console.log('      vercel env add');
    return false;
  }
  
  console.log('\n2. Verificando arquivos necessários:');
  
  // Verificar api/cron/route.js
  const cronFilePath = path.join(__dirname, '../api/cron/route.js');
  if (!fs.existsSync(cronFilePath)) {
    console.log('   ❌ api/cron/route.js não encontrado!');
    return false;
  }
  
  const cronStats = fs.statSync(cronFilePath);
  console.log(`   ✅ api/cron/route.js encontrado (${Math.round(cronStats.size / 1024)}KB, última modificação: ${cronStats.mtime})`);
  
  // Verificar api/sorteio.js
  const sorteioFilePath = path.join(__dirname, '../api/sorteio.js');
  if (!fs.existsSync(sorteioFilePath)) {
    console.log('   ❌ api/sorteio.js não encontrado!');
    return false;
  }
  
  const sorteioStats = fs.statSync(sorteioFilePath);
  console.log(`   ✅ api/sorteio.js encontrado (${Math.round(sorteioStats.size / 1024)}KB, última modificação: ${sorteioStats.mtime})`);
  
  // Verificar vercel.json
  const vercelConfigPath = path.join(__dirname, '../vercel.json');
  if (!fs.existsSync(vercelConfigPath)) {
    console.log('   ❌ vercel.json não encontrado!');
    return false;
  }
  
  // Verificar configuração de cron no vercel.json
  try {
    const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
    if (!vercelConfig.crons || vercelConfig.crons.length === 0) {
      console.log('   ❌ Configuração de cron não encontrada em vercel.json!');
    } else {
      console.log('   ✅ Configuração de cron encontrada em vercel.json:');
      vercelConfig.crons.forEach((cron, index) => {
        console.log(`      - Cron #${index + 1}: path=${cron.path}, schedule="${cron.schedule}"`);
      });
    }
  } catch (error) {
    console.log(`   ❌ Erro ao ler vercel.json: ${error.message}`);
    return false;
  }
  
  console.log('\n3. Simulando chamada ao endpoint de cron:');
  console.log('   Este teste irá simular a execução do cron job sem realizar um sorteio real');
  console.log('   Chamando endpoint de diagnóstico...');
  
  try {
    const response = await fetch(`${envVars.BASE_URL}/api/sorteio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${envVars.API_SECRET_KEY}`
      },
      body: JSON.stringify({ action: 'diagnostico' })
    });
    
    console.log(`   Status da resposta: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      let errorText = '';
      try {
        const errorBody = await response.text();
        errorText = errorBody.substring(0, 200);
      } catch {
        errorText = '[não foi possível ler o corpo da resposta]';
      }
      
      console.log(`   ❌ Erro ao chamar endpoint: ${errorText}`);
      return false;
    }
    
    const data = await response.json();
    console.log('   ✅ Diagnóstico recebido com sucesso!');
    console.log('   Detalhes do diagnóstico:');
    console.log(`      - Status API: ${data.data?.diagnostico?.status_api || 'não informado'}`);
    console.log(`      - Conexão Supabase: ${data.data?.diagnostico?.supabase_conexao || 'não informado'}`);
    console.log(`      - Ambiente: ${data.data?.diagnostico?.ambiente?.vercel_env || 'não informado'}`);
    console.log(`      - Hora do servidor: ${data.data?.diagnostico?.ambiente?.hora_server || 'não informado'}`);
    
    const varsConfig = data.data?.diagnostico?.variaveis || {};
    console.log('      - Variáveis no servidor:');
    console.log(`         - SUPABASE_URL: ${varsConfig.supabase_url_configurada ? '✅' : '❌'}`);
    console.log(`         - SUPABASE_SERVICE_KEY: ${varsConfig.supabase_key_configurada ? '✅' : '❌'}`);
    console.log(`         - API_SECRET_KEY: ${varsConfig.api_secret_key_configurada ? '✅' : '❌'}`);
    
  } catch (error) {
    console.log(`   ❌ Erro ao realizar diagnóstico: ${error.message}`);
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.log(`   ❌ Não foi possível conectar ao servidor. Verifique se a URL está correta e se o servidor está online.`);
    }
    return false;
  }
  
  console.log('\n===== RECOMENDAÇÕES =====');
  console.log('1. Verifique se o cron job está configurado na Vercel:');
  console.log('   - Acesse o painel da Vercel > Seu projeto > Settings > Cron Jobs');
  console.log('   - Verifique se há um cron job com path "/api/cron/route"');
  console.log('   - Verifique se o schedule está configurado corretamente (ex: "0 0 * * *" para executar à meia-noite)');
  
  console.log('\n2. Para logs detalhados no cron job:');
  console.log('   - Configure VERBOSE_LOGS=true nas variáveis de ambiente da Vercel');
  console.log('   - Isso garantirá que os logs sejam mais detalhados mesmo em produção');
  
  console.log('\n3. Para verificar logs de execuções anteriores:');
  console.log('   - Acesse o painel da Vercel > Seu projeto > Deployments > Selecione um deployment');
  console.log('   - Clique em "Functions" > Procure por "/api/cron/route"');
  console.log('   - Clique para ver os logs de execução');
  
  console.log('\n✅ Diagnóstico concluído com sucesso!');
  return true;
}

// Executar o script
simularCron().then(sucesso => {
  if (!sucesso) {
    console.log('\n❌ O diagnóstico encontrou problemas que precisam ser corrigidos.');
    process.exit(1);
  }
}).catch(erro => {
  console.error('Erro ao executar diagnóstico:', erro);
  process.exit(1);
}); 