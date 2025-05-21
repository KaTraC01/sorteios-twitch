#!/usr/bin/env node

/**
 * Script para substituir placeholders no env-config.js com as variáveis de ambiente reais.
 * Executar como parte do processo de build:
 * node scripts/build-env.js
 */

const fs = require('fs');
const path = require('path');

// Caminho para o env-config.js
const ENV_CONFIG_PATH = path.join(__dirname, '../public/env-config.js');

// Função principal
function main() {
  console.log('Iniciando processamento de variáveis de ambiente...');
  
  try {
    // Leitura do arquivo env-config.js
    let envConfig = fs.readFileSync(ENV_CONFIG_PATH, 'utf8');
    
    // Variáveis de ambiente que queremos injetar
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || '';
    
    // Verificar se as variáveis estão definidas
    if (!supabaseUrl) {
      console.warn('⚠️ AVISO: NEXT_PUBLIC_SUPABASE_URL não está definida no ambiente.');
    }
    
    if (!supabaseAnonKey) {
      console.warn('⚠️ AVISO: NEXT_PUBLIC_SUPABASE_ANON_KEY não está definida no ambiente.');
    }
    
    // Substituição dos placeholders
    envConfig = envConfig.replace(/%%SUPABASE_URL_PLACEHOLDER%%/g, supabaseUrl);
    envConfig = envConfig.replace(/%%SUPABASE_ANON_KEY_PLACEHOLDER%%/g, supabaseAnonKey);
    
    // Salvando o arquivo atualizado
    fs.writeFileSync(ENV_CONFIG_PATH, envConfig);
    
    console.log('✅ Variáveis de ambiente processadas com sucesso!');
    console.log(`URL Supabase definida: ${supabaseUrl ? 'Sim' : 'Não'}`);
    console.log(`Chave anônima definida: ${supabaseAnonKey ? 'Sim' : 'Não'}`);
    
  } catch (error) {
    console.error('❌ ERRO ao processar variáveis de ambiente:', error);
    process.exit(1);
  }
}

// Executar a função principal
main(); 