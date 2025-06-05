#!/usr/bin/env node

/**
 * Script para substituir placeholders no env-config.js com as variáveis de ambiente reais.
 * Executar como parte do processo de build:
 * node scripts/build-env.js
 */

const fs = require('fs');
const path = require('path');

// Primeiro, carregar as variáveis de ambiente dos arquivos
try {
  // Carregar o script de carregamento de variáveis
  const { carregarEnv } = require('./load-env');
  
  // Tentar carregar variáveis de diversos arquivos
  const arquivosEnv = [
    path.join(__dirname, '../.env.local'),
    path.join(__dirname, '../.env.txt'),
    path.join(__dirname, '../.env')
  ];
  
  let carregouAlgum = false;
  
  for (const arquivo of arquivosEnv) {
    if (carregarEnv(arquivo)) {
      carregouAlgum = true;
      console.log(`Variáveis carregadas de ${arquivo}`);
      break; // Usar apenas o primeiro arquivo encontrado
    }
  }
  
  if (!carregouAlgum) {
    console.warn('⚠️ AVISO: Nenhum arquivo de variáveis de ambiente foi carregado!');
  }
} catch (erro) {
  console.warn('⚠️ AVISO: Erro ao carregar script de variáveis:', erro.message);
}

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
    
    // Substituir a inicialização do window.__ENV__ de forma segura
    const pattern = /window\.__ENV__\s*=\s*window\.__ENV__\s*\|\|\s*\{\};/;
    
    // Verificar se o padrão já existe
    if (pattern.test(envConfig)) {
      // Atualizar os valores sem modificar a estrutura
      envConfig = envConfig.replace(
        pattern,
        `window.__ENV__ = window.__ENV__ || {};\nwindow.__ENV__.SUPABASE_URL = "${supabaseUrl}";\nwindow.__ENV__.SUPABASE_ANON_KEY = "${supabaseAnonKey}";`
      );
    } else {
      // Caso contrário, buscar qualquer definição de window.__ENV__ e substituir
      envConfig = envConfig.replace(
        /window\.__ENV__\s*=\s*(\{[^}]*\}|window\.__ENV__\s*\|\|\s*\{\});/,
        `window.__ENV__ = window.__ENV__ || {};\nwindow.__ENV__.SUPABASE_URL = "${supabaseUrl}";\nwindow.__ENV__.SUPABASE_ANON_KEY = "${supabaseAnonKey}";`
      );
    }
    
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