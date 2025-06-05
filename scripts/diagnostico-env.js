/**
 * Script de diagnóstico para verificar a configuração das variáveis de ambiente
 * Execute: node scripts/diagnostico-env.js
 */

const fs = require('fs');
const path = require('path');
const { carregarEnv, carregarVariaveis } = require('./load-env');

// Função para verificar a existência de um arquivo
function verificarArquivo(caminho, nome) {
  console.log(`\nVerificando ${nome}...`);
  
  try {
    if (fs.existsSync(caminho)) {
      const stats = fs.statSync(caminho);
      console.log(`✓ ${nome} encontrado: ${caminho}`);
      console.log(`   - Tamanho: ${stats.size} bytes`);
      console.log(`   - Última modificação: ${stats.mtime}`);
      return true;
    } else {
      console.log(`✗ ${nome} não encontrado: ${caminho}`);
      return false;
    }
  } catch (erro) {
    console.error(`✗ Erro ao verificar ${nome}:`, erro.message);
    return false;
  }
}

// Função para verificar variáveis no process.env
function verificarVariaveisAmbiente() {
  console.log('\nVerificando variáveis de ambiente...');
  
  const variaveis = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'REACT_APP_SUPABASE_URL',
    'REACT_APP_SUPABASE_ANON_KEY'
  ];
  
  let definidas = 0;
  
  variaveis.forEach(variavel => {
    if (process.env[variavel]) {
      console.log(`✓ ${variavel} está definida`);
      
      // Mostrar parte da chave para diagnóstico (ocultando a maioria)
      if (variavel.includes('KEY')) {
        const valor = process.env[variavel];
        console.log(`   - Valor: ${valor.slice(0, 5)}...${valor.slice(-5)}`);
      } else {
        console.log(`   - Valor: ${process.env[variavel]}`);
      }
      
      definidas++;
    } else {
      console.log(`✗ ${variavel} não está definida`);
    }
  });
  
  return definidas > 0;
}

// Função principal de diagnóstico
function executarDiagnostico() {
  console.log('==== DIAGNÓSTICO DE VARIÁVEIS DE AMBIENTE ====');
  
  // 1. Verificar arquivos de ambiente
  const arquivosEnv = [
    { caminho: path.join(__dirname, '../.env.local'), nome: 'Arquivo .env.local' },
    { caminho: path.join(__dirname, '../.env.txt'), nome: 'Arquivo .env.txt' },
    { caminho: path.join(__dirname, '../.env'), nome: 'Arquivo .env' }
  ];
  
  let arquivoEncontrado = false;
  
  for (const { caminho, nome } of arquivosEnv) {
    if (verificarArquivo(caminho, nome)) {
      arquivoEncontrado = true;
    }
  }
  
  // 2. Tentar carregar variáveis
  console.log('\nTentando carregar variáveis de ambiente...');
  const variavelCarregada = carregarVariaveis();
  
  // 3. Verificar se as variáveis estão no process.env
  const temVariaveis = verificarVariaveisAmbiente();
  
  // 4. Verificar a estrutura do projeto
  verificarArquivo(path.join(__dirname, './load-env.js'), 'Script load-env.js');
  verificarArquivo(path.join(__dirname, './build-env.js'), 'Script build-env.js');
  verificarArquivo(path.join(__dirname, '../public/env-config.js'), 'Arquivo env-config.js');
  
  // 5. Resumo e recomendações
  console.log('\n==== RESUMO DO DIAGNÓSTICO ====');
  
  if (!arquivoEncontrado) {
    console.log('✗ PROBLEMA: Nenhum arquivo de variáveis de ambiente encontrado.');
    console.log('   Recomendação: Crie um arquivo .env.local com as variáveis necessárias.');
  }
  
  if (!variavelCarregada) {
    console.log('✗ PROBLEMA: Não foi possível carregar variáveis de ambiente.');
    console.log('   Recomendação: Verifique o formato do seu arquivo .env ou .env.local.');
  }
  
  if (!temVariaveis) {
    console.log('✗ PROBLEMA: Nenhuma variável de ambiente do Supabase está definida.');
    console.log('   Recomendação: Configure as variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
  
  if (arquivoEncontrado && variavelCarregada && temVariaveis) {
    console.log('✓ SUCESSO: As variáveis de ambiente parecem estar configuradas corretamente!');
    console.log('   Próximos passos:');
    console.log('   1. Execute "npm run start" para iniciar o servidor de desenvolvimento');
    console.log('   2. Verifique no console do navegador se as variáveis estão acessíveis no frontend');
  } else {
    console.log('\n✗ Foram encontrados problemas na configuração das variáveis de ambiente.');
    console.log('   Siga as recomendações acima para resolver os problemas.');
  }
}

// Executar o diagnóstico
try {
  executarDiagnostico();
} catch (erro) {
  console.error('Erro durante o diagnóstico:', erro);
} 