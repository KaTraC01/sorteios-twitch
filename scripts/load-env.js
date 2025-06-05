/**
 * Script para carregar variáveis de ambiente de .env.txt
 * Necessário quando o sistema não carrega automaticamente o .env.local
 */

const fs = require('fs');
const path = require('path');

// Função para carregar variáveis de ambiente do arquivo
function carregarEnv(arquivo) {
  try {
    // Verificar se o arquivo existe
    if (!fs.existsSync(arquivo)) {
      console.log(`Arquivo ${arquivo} não encontrado.`);
      return false;
    }
    
    console.log(`Tentando carregar variáveis de ambiente de: ${arquivo}`);
    
    const conteudo = fs.readFileSync(arquivo, 'utf8');
    const linhas = conteudo.split('\n');
    
    let variaveis = 0;
    
    linhas.forEach(linha => {
      // Ignorar linhas vazias ou comentários
      if (!linha || linha.trim().startsWith('#')) {
        return;
      }
      
      // Encontrar pares de chave=valor
      const match = linha.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const chave = match[1];
        // Remover aspas do valor se existirem
        let valor = match[2] || '';
        valor = valor.replace(/^['"]|['"]$/g, '');
        
        // Definir no process.env
        process.env[chave] = valor;
        variaveis++;
        
        console.log(`   Carregada variável: ${chave}`);
      }
    });
    
    console.log(`   Total: ${variaveis} variáveis de ambiente de ${arquivo}`);
    return variaveis > 0;
  } catch (erro) {
    console.error(`Erro ao carregar variáveis de ${arquivo}:`, erro);
    return false;
  }
}

// Tentar carregar variáveis de diversos arquivos, em ordem de prioridade
function carregarVariaveis() {
  const arquivosEnv = [
    path.join(__dirname, '../.env.local'),
    path.join(__dirname, '../.env.txt'),
    path.join(__dirname, '../.env')
  ];
  
  let carregouAlgum = false;
  
  for (const arquivo of arquivosEnv) {
    const resultado = carregarEnv(arquivo);
    if (resultado) {
      carregouAlgum = true;
      console.log(`Variáveis carregadas com sucesso de ${arquivo}`);
      break; // Usar apenas o primeiro arquivo encontrado
    }
  }
  
  if (!carregouAlgum) {
    console.warn('AVISO: Nenhum arquivo de variáveis de ambiente foi carregado!');
  }
  
  // Verificar se as variáveis essenciais do Supabase estão definidas
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('ERRO: Variáveis de ambiente do Supabase não definidas após tentativa de carregamento.');
  } else {
    console.log('Variáveis de ambiente do Supabase definidas com sucesso!');
    console.log(`URL Supabase: ${supabaseUrl}`);
    if (supabaseAnonKey.length > 10) {
      console.log(`Chave anônima: ${supabaseAnonKey.slice(0, 5)}...${supabaseAnonKey.slice(-5)}`);
    } else {
      console.log(`Chave anônima: [definida, mas muito curta]`);
    }
  }
  
  return carregouAlgum;
}

// Executar se este script for o ponto de entrada
if (require.main === module) {
  carregarVariaveis();
}

module.exports = {
  carregarEnv,
  carregarVariaveis
}; 