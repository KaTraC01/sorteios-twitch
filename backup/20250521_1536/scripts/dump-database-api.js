const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const readline = require('readline');
const { createClient } = require('@supabase/supabase-js');

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
async function dumpDatabaseApi() {
  try {
    console.log('Iniciando dump do banco de dados Supabase via API...');
    
    // Recupera as credenciais do ambiente
    let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    let supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    // Se as credenciais não estiverem no ambiente, solicita ao usuário
    if (!supabaseUrl || !supabaseKey) {
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
      
      if (!supabaseKey) {
        supabaseKey = await new Promise(resolve => {
          rl.question('Chave do Supabase (preferencialmente a service key): ', resolve);
        });
      }
      
      rl.close();
    }
    
    console.log(`Conectando ao Supabase em: ${supabaseUrl}`);
    
    // Inicializa o cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Arquivos de saída
    const schemaFile = path.join(backupDir, `db_schema_${timestamp}.sql`);
    const dataFile = path.join(backupDir, `db_data_${timestamp}.sql`);
    const fullDumpFile = path.join(backupDir, `db_full_${timestamp}.sql`);
    
    // Lista todas as tabelas do schema public
    console.log('Obtendo lista de tabelas...');
    
    // Primeiro tentamos com RPC customizada
    let tabelas = [];
    try {
      const { data, error } = await supabase.rpc('info_schema_tables', { schema_name: 'public' });
      if (error) throw error;
      tabelas = data;
    } catch (e) {
      console.log('Não foi possível usar a função RPC info_schema_tables, tentando método alternativo...');
      
      // Método alternativo usando consulta direta
      const { data, error } = await supabase.from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .neq('table_name', 'spatial_ref_sys') // exclui tabelas do sistema
        .order('table_name');
      
      if (error) throw error;
      tabelas = data.map(row => ({ table_name: row.table_name }));
    }
    
    console.log(`Encontradas ${tabelas.length} tabelas para backup`);
    
    // 1. Extração da estrutura (DDL) das tabelas
    console.log('Extraindo estrutura das tabelas (DDL)...');
    let ddlScripts = [];
    
    // Iteramos por cada tabela para obter sua definição
    for (const tabela of tabelas) {
      try {
        // Tentar usar função RPC personalizada
        const { data, error } = await supabase.rpc('get_table_ddl', { table_name: tabela.table_name });
        
        if (error) {
          // Método alternativo - construir manualmente
          console.log(`  Não foi possível obter DDL para ${tabela.table_name} via RPC, construindo manualmente...`);
          
          // Obter estrutura das colunas
          const { data: colunas, error: colunasError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable, column_default')
            .eq('table_schema', 'public')
            .eq('table_name', tabela.table_name)
            .order('ordinal_position');
          
          if (colunasError) throw colunasError;
          
          // Construir script CREATE TABLE
          let script = `-- Tabela: ${tabela.table_name}\n`;
          script += `CREATE TABLE IF NOT EXISTS public.${tabela.table_name} (\n`;
          
          script += colunas.map(col => {
            const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
            const defaultVal = col.column_default ? `DEFAULT ${col.column_default}` : '';
            return `  ${col.column_name} ${col.data_type} ${nullable} ${defaultVal}`.trim();
          }).join(',\n');
          
          // Adicionar chave primária (simplificado)
          script += '\n);\n';
          
          ddlScripts.push(script);
        } else {
          // Usar DDL retornado pela função RPC
          ddlScripts.push(data);
        }
      } catch (e) {
        console.warn(`Erro ao obter DDL para tabela ${tabela.table_name}:`, e);
        // Adicionamos um comentário para marcar o erro
        ddlScripts.push(`-- ERRO: Não foi possível obter a definição da tabela ${tabela.table_name}\n`);
      }
    }
    
    // Salva os scripts DDL em um arquivo
    fs.writeFileSync(schemaFile, ddlScripts.join('\n\n'));
    console.log(`Estrutura do banco salva em: ${schemaFile}`);
    
    // 2. Extração dos dados (DML) das tabelas
    console.log('Extraindo dados das tabelas (DML)...');
    let dmlScripts = [];
    
    for (const tabela of tabelas) {
      console.log(`  Exportando dados da tabela: ${tabela.table_name}`);
      try {
        const { data, error } = await supabase.from(tabela.table_name).select('*');
        
        if (error) {
          console.warn(`Erro ao exportar dados da tabela ${tabela.table_name}:`, error);
          dmlScripts.push(`-- ERRO: Não foi possível exportar dados da tabela ${tabela.table_name}\n`);
          continue;
        }
        
        if (data && data.length > 0) {
          dmlScripts.push(`-- Dados da tabela ${tabela.table_name}\n`);
          dmlScripts.push(`TRUNCATE TABLE public.${tabela.table_name} CASCADE;\n`);
          
          for (const row of data) {
            const columns = Object.keys(row).join(', ');
            const values = Object.values(row).map(formatValue).join(', ');
            dmlScripts.push(`INSERT INTO public.${tabela.table_name} (${columns}) VALUES (${values});`);
          }
        } else {
          dmlScripts.push(`-- Tabela ${tabela.table_name} sem dados\n`);
        }
      } catch (e) {
        console.warn(`Erro ao exportar dados da tabela ${tabela.table_name}:`, e);
        dmlScripts.push(`-- ERRO: Não foi possível exportar dados da tabela ${tabela.table_name}\n`);
      }
    }
    
    // Salva os scripts DML em um arquivo
    fs.writeFileSync(dataFile, dmlScripts.join('\n\n'));
    console.log(`Dados do banco salvos em: ${dataFile}`);
    
    // 3. Exportação de funções e triggers
    console.log('Exportando funções e triggers...');
    
    // Extração de funções
    try {
      const { data: funcoes, error } = await supabase
        .from('information_schema.routines')
        .select('routine_name, routine_definition')
        .eq('routine_schema', 'public')
        .neq('routine_name', 'rls') // exclui funções do sistema
        .order('routine_name');
      
      if (!error && funcoes && funcoes.length > 0) {
        const funcoesSql = funcoes.map(fn => {
          return `-- Função: ${fn.routine_name}\n${fn.routine_definition || '-- Definição não disponível'}\n`;
        }).join('\n\n');
        
        ddlScripts.push('\n-- FUNÇÕES\n');
        ddlScripts.push(funcoesSql);
      }
    } catch (e) {
      console.warn('Erro ao exportar funções:', e);
    }
    
    // 4. Combina tudo em um único arquivo
    console.log('Combinando arquivos em um único script...');
    fs.writeFileSync(
      fullDumpFile,
      `-- Backup completo do banco de dados gerado em ${new Date().toLocaleString()}\n\n` +
      `-- ESQUEMA (DDL)\n\n` +
      fs.readFileSync(schemaFile, 'utf8') + `\n\n` +
      `-- DADOS (DML)\n\n` +
      fs.readFileSync(dataFile, 'utf8')
    );
    
    console.log(`Backup completo salvo em: ${fullDumpFile}`);
    
    // 5. Cria um arquivo de instruções
    const instructionsFile = path.join(backupDir, `INSTRUCOES_RESTAURACAO_${timestamp}.txt`);
    
    const instructions = `
INSTRUÇÕES PARA RESTAURAÇÃO DO BANCO DE DADOS
=============================================

Backup realizado em: ${new Date().toLocaleString()}

Este backup contém três arquivos SQL:

1. ${path.basename(schemaFile)}
   Contém apenas a estrutura do banco (DDL) - tabelas, funções, etc.

2. ${path.basename(dataFile)}
   Contém apenas os dados do banco (DML) - registros das tabelas.

3. ${path.basename(fullDumpFile)}
   Combina os dois arquivos acima em um único script completo.

RESTAURAÇÃO DO BACKUP
------------------------------------------------

Para restaurar o backup, siga estas etapas:

1. Acesse o painel do Supabase (https://app.supabase.com)
2. Selecione ou crie um novo projeto
3. Vá para SQL Editor
4. Copie e cole o conteúdo do arquivo "${path.basename(fullDumpFile)}" ou execute por partes:
   - Primeiro execute o script de esquema (${path.basename(schemaFile)})
   - Depois execute o script de dados (${path.basename(dataFile)})

OBSERVAÇÕES IMPORTANTES
----------------------

* Este backup foi gerado via API e pode não incluir todos os objetos do banco
* Você precisará recriar manualmente as políticas RLS (Row Level Security)
* Funções e triggers complexos podem precisar de ajustes manuais
* Verifique e ajuste permissões e configurações após a restauração
`;
    
    fs.writeFileSync(instructionsFile, instructions);
    console.log(`Instruções de restauração salvas em: ${instructionsFile}`);
    
    console.log('Dump do banco de dados via API concluído com sucesso!');
    
  } catch (error) {
    console.error('Erro ao realizar dump do banco de dados:', error);
    process.exit(1);
  }
}

// Função para formatar valores para SQL
function formatValue(value) {
  if (value === null) return 'NULL';
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

dumpDatabaseApi(); 