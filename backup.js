/**
 * Script principal para realizar o backup completo e seguro do site de sorteios
 * 
 * Este script realiza as seguintes etapas:
 * 1. Backup do código fonte (frontend)
 * 2. Backup dos scripts SQL personalizados
 * 3. Backup das funções Supabase
 * 4. Backup da documentação e outros arquivos importantes
 * 5. Limpeza de credenciais sensíveis (opcional)
 * 6. Compactação do backup
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Funções auxiliares
async function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => rl.question(question, answer => {
    rl.close();
    resolve(answer);
  }));
}

async function main() {
  console.log('\n========================================================');
  console.log('    BACKUP COMPLETO E SEGURO DO SISTEMA DE SORTEIOS');
  console.log('========================================================\n');
  
  try {
    // Verifica se tem as dependências necessárias
    console.log('Verificando dependências necessárias...');
    if (!fs.existsSync(path.join(__dirname, 'node_modules', 'dotenv'))) {
      console.log('Instalando dependências necessárias...');
      execSync('npm install dotenv @supabase/supabase-js');
    }
    
    // Cria diretório de backup se não existir
    if (!fs.existsSync(path.join(__dirname, 'backup'))) {
      fs.mkdirSync(path.join(__dirname, 'backup'));
    }
    
    // Executa o backup baseado em arquivos
    console.log('\nIniciando backup completo do sistema...');
    execSync('node scripts/backup-files.js', { stdio: 'inherit' });
    
    // Pergunta ao usuário se deseja limpar informações sensíveis
    const limparCredenciais = await askQuestion(
      '\nDeseja limpar informações sensíveis do backup? (S/n): '
    );
    
    if (limparCredenciais.toLowerCase() !== 'n') {
      console.log('\nIniciando limpeza de credenciais sensíveis...');
      execSync('node scripts/clean-credentials.js', { stdio: 'inherit' });
    }
    
    // Pergunta ao usuário sobre a exportação manual do banco de dados
    const exportarBanco = await askQuestion(
      '\nIMPORTANTE: Para um backup completo, você deve exportar manualmente o banco de dados via Supabase Studio.\n' +
      'Você já fez o backup do banco de dados? (s/N): '
    );
    
    if (exportarBanco.toLowerCase() === 's') {
      console.log('\n✅ Backup completo concluído com sucesso!');
    } else {
      console.log('\n⚠️ Backup parcial concluído! Não se esqueça de fazer o backup do banco de dados:');
      console.log('1. Acesse o Supabase Studio (https://app.supabase.com)');
      console.log('2. Selecione seu projeto');
      console.log('3. Vá para "Database" > "Backups"');
      console.log('4. Clique em "Download Backup"');
      console.log('5. Salve o arquivo na pasta de backup criada');
    }
    
    console.log('\nOs arquivos de backup estão disponíveis na pasta: ' + path.join(__dirname, 'backup'));
    
    // Instruções finais
    console.log('\n========================================================');
    console.log('                  INSTRUÇÕES IMPORTANTES');
    console.log('========================================================');
    console.log('1. Mantenha o backup em local seguro');
    console.log('2. Se as credenciais NÃO foram limpas, proteja o arquivo com senha');
    console.log('3. Para restaurar, siga as instruções em README.txt no backup');
    console.log('4. Consulte os arquivos de documentação para detalhes adicionais');
    console.log('========================================================\n');
    
  } catch (error) {
    console.error('Erro durante o processo de backup:', error);
    process.exit(1);
  }
}

// Executa o programa principal
main(); 