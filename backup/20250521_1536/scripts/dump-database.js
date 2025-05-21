const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const readline = require('readline');

// Carrega as variáveis de ambiente
dotenv.config({ path: '.env.local' });
if (fs.existsSync('.env')) {
  dotenv.config({ path: '.env' });
}

// Cria diretório para o dump
const backupDir = path.join(__dirname, '..', 'backup');
fs.mkdirSync(backupDir, { recursive: true });

// Timestamp para o nome do arquivo
const now = new Date();
const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

// Função principal
async function dumpDatabase() {
  try {
    console.log('Iniciando dump do banco de dados Supabase...');
    
    // Recupera as credenciais do ambiente
    let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    let dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD;
    
    // Se as credenciais não estiverem no ambiente, solicita ao usuário
    if (!supabaseUrl || !dbPassword) {
      console.log('Credenciais do Supabase não encontradas nas variáveis de ambiente.');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      if (!supabaseUrl) {
        supabaseUrl = await new Promise(resolve => {
          rl.question('URL do Supabase (ex: https://xyzabc.supabase.co): ', resolve);
        });
      }
      
      if (!dbPassword) {
        dbPassword = await new Promise(resolve => {
          rl.question('Senha do banco de dados Supabase: ', resolve);
        });
      }
      
      rl.close();
    }
    
    // Extrai o host do banco a partir da URL
    const urlParts = supabaseUrl.split('.');
    const projectRef = urlParts[0].split('//')[1];
    const dbHost = `db.${projectRef}.supabase.co`;
    
    console.log(`Host do banco: ${dbHost}`);
    
    // Arquivo de saída para cada tipo de dump
    const schemaFile = path.join(backupDir, `db_schema_${timestamp}.sql`);
    const dataFile = path.join(backupDir, `db_data_${timestamp}.sql`);
    const fullDumpFile = path.join(backupDir, `db_full_${timestamp}.dump`);
    
    // Exporta apenas o esquema (DDL)
    console.log('Exportando esquema do banco (DDL)...');
    execSync(`pg_dump --schema-only --no-owner --no-privileges -h ${dbHost} -d postgres -U postgres -f "${schemaFile}"`, {
      env: { ...process.env, PGPASSWORD: dbPassword }
    });
    console.log(`Esquema exportado para: ${schemaFile}`);
    
    // Exporta apenas os dados (DML)
    console.log('Exportando dados do banco (DML)...');
    execSync(`pg_dump --data-only --no-owner --no-privileges -h ${dbHost} -d postgres -U postgres -f "${dataFile}"`, {
      env: { ...process.env, PGPASSWORD: dbPassword }
    });
    console.log(`Dados exportados para: ${dataFile}`);
    
    // Exporta dump completo em formato binário
    console.log('Exportando dump completo em formato binário...');
    execSync(`pg_dump --format=custom --no-owner --no-privileges -h ${dbHost} -d postgres -U postgres -f "${fullDumpFile}"`, {
      env: { ...process.env, PGPASSWORD: dbPassword }
    });
    console.log(`Dump completo exportado para: ${fullDumpFile}`);
    
    // Cria um arquivo de instruções
    const instructionsFile = path.join(backupDir, `INSTRUCOES_RESTAURACAO_${timestamp}.txt`);
    
    const instructions = `
INSTRUÇÕES PARA RESTAURAÇÃO DO BANCO DE DADOS
=============================================

Backup realizado em: ${new Date().toLocaleString()}

Este backup contém três arquivos:

1. ${path.basename(schemaFile)}
   Contém apenas a estrutura do banco (DDL) - tabelas, funções, triggers, etc.

2. ${path.basename(dataFile)}
   Contém apenas os dados do banco (DML) - registros das tabelas.

3. ${path.basename(fullDumpFile)}
   Dump completo em formato binário do PostgreSQL.

RESTAURAÇÃO DO DUMP COMPLETO (OPÇÃO RECOMENDADA)
------------------------------------------------

Para restaurar o dump completo, utilize o comando:

pg_restore --no-owner --no-privileges -h NOME_DO_HOST -U postgres -d NOME_DO_BANCO -1 "${path.basename(fullDumpFile)}"

RESTAURAÇÃO SEPARADA DE ESQUEMA E DADOS
---------------------------------------

Para restaurar primeiro o esquema e depois os dados:

1. Restaure o esquema:
   psql -h NOME_DO_HOST -U postgres -d NOME_DO_BANCO -f "${path.basename(schemaFile)}"

2. Restaure os dados:
   psql -h NOME_DO_HOST -U postgres -d NOME_DO_BANCO -f "${path.basename(dataFile)}"

OBSERVAÇÕES IMPORTANTES
----------------------

* Se estiver usando o Supabase, o nome do banco geralmente é "postgres"
* Certifique-se de substituir NOME_DO_HOST pelo host do seu banco
* Ao restaurar em um novo projeto Supabase, você pode precisar ajustar as 
  políticas de segurança RLS após a restauração
`;
    
    fs.writeFileSync(instructionsFile, instructions);
    console.log(`Instruções de restauração salvas em: ${instructionsFile}`);
    
    console.log('Dump do banco de dados concluído com sucesso!');
    
  } catch (error) {
    console.error('Erro ao realizar dump do banco de dados:', error);
    process.exit(1);
  }
}

dumpDatabase(); 