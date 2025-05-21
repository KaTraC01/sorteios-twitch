const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// Carrega as variáveis de ambiente
dotenv.config({ path: '.env.local' });
if (fs.existsSync('.env')) {
  dotenv.config({ path: '.env' });
}

// Credenciais do Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Cria diretórios de backup
const now = new Date();
const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
const backupDir = path.join(__dirname, '..', 'backup', timestamp);

// Cria diretórios necessários
fs.mkdirSync(backupDir, { recursive: true });
fs.mkdirSync(path.join(backupDir, 'sql'), { recursive: true });
fs.mkdirSync(path.join(backupDir, 'frontend'), { recursive: true });
fs.mkdirSync(path.join(backupDir, 'supabase_functions'), { recursive: true });

// Função principal
async function realizarBackup() {
  try {
    console.log('Iniciando backup completo do sistema...');
    
    // Backup do banco de dados
    await backupDatabase();
    
    // Backup do frontend
    backupFrontend();
    
    // Backup dos scripts SQL
    backupSQLScripts();
    
    // Backup das funções Supabase
    backupSupabaseFunctions();
    
    // Criar arquivo README
    copiarReadme();
    
    // Criar arquivo de ambiente seguro
    criarEnvSeguro();
    
    console.log(`Backup concluído com sucesso em: ${backupDir}`);
    console.log('Compactando arquivos...');
    
    // Compacta o diretório de backup
    execSync(`cd "${path.dirname(backupDir)}" && zip -r "site-sorteio-backup-${timestamp}.zip" "${path.basename(backupDir)}"`);
    
    console.log(`Backup compactado disponível em: ${path.dirname(backupDir)}/site-sorteio-backup-${timestamp}.zip`);
  } catch (error) {
    console.error('Erro ao realizar backup:', error);
    process.exit(1);
  }
}

// Backup do banco de dados
async function backupDatabase() {
  console.log('Realizando backup do banco de dados...');
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Credenciais do Supabase não encontradas nas variáveis de ambiente');
  }
  
  // Extrair informações da URL do Supabase
  const urlParts = SUPABASE_URL.split('.');
  const projectRef = urlParts[0].split('//')[1];
  
  try {
    // Inicializa o cliente Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Lista todas as tabelas do schema public
    const { data: tabelas, error } = await supabase.rpc('info_schema_tables', { schema_name: 'public' });
    
    if (error) throw error;
    
    console.log(`Encontradas ${tabelas.length} tabelas para backup`);
    
    // Exporta esquema do banco de dados (DDL)
    try {
      console.log('Exportando esquema do banco (DDL)...');
      execSync(`pg_dump --schema-only --no-owner --no-privileges -h db.${projectRef}.supabase.co -d postgres -U postgres > "${path.join(backupDir, 'db_schema.sql')}"`, {
        env: { ...process.env, PGPASSWORD: process.env.SUPABASE_DB_PASSWORD || 'postgres' }
      });
    } catch (error) {
      console.warn('Alerta: Não foi possível exportar o esquema do banco via pg_dump. Gerando backup alternativo...');
      
      // Gera script SQL para cada tabela via API
      const scriptsCriacao = [];
      for (const tabela of tabelas) {
        const { data, error } = await supabase.rpc('get_table_ddl', { table_name: tabela.table_name });
        if (error) {
          console.warn(`Erro ao gerar DDL para tabela ${tabela.table_name}:`, error);
        } else {
          scriptsCriacao.push(data);
        }
      }
      
      fs.writeFileSync(path.join(backupDir, 'db_schema.sql'), scriptsCriacao.join('\n\n'));
    }
    
    // Exporta dados das tabelas (DML)
    console.log('Exportando dados das tabelas (DML)...');
    const scriptsDados = [];
    
    for (const tabela of tabelas) {
      console.log(`Exportando dados da tabela: ${tabela.table_name}`);
      const { data, error } = await supabase.from(tabela.table_name).select('*');
      
      if (error) {
        console.warn(`Erro ao exportar dados da tabela ${tabela.table_name}:`, error);
        continue;
      }
      
      if (data && data.length > 0) {
        let script = `-- Dados da tabela ${tabela.table_name}\n`;
        script += `TRUNCATE TABLE public.${tabela.table_name} CASCADE;\n`;
        
        for (const row of data) {
          const columns = Object.keys(row).join(', ');
          const values = Object.values(row).map(formatValue).join(', ');
          script += `INSERT INTO public.${tabela.table_name} (${columns}) VALUES (${values});\n`;
        }
        
        scriptsDados.push(script);
      }
    }
    
    fs.writeFileSync(path.join(backupDir, 'db_data.sql'), scriptsDados.join('\n\n'));
    
    // Combina esquema e dados em um único arquivo
    fs.writeFileSync(
      path.join(backupDir, 'db_backup.sql'),
      fs.readFileSync(path.join(backupDir, 'db_schema.sql'), 'utf8') + '\n\n' +
      fs.readFileSync(path.join(backupDir, 'db_data.sql'), 'utf8')
    );
    
    console.log('Backup do banco de dados concluído com sucesso!');
  } catch (error) {
    console.error('Erro ao realizar backup do banco de dados:', error);
    throw error;
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

// Backup do frontend
function backupFrontend() {
  console.log('Realizando backup do frontend...');
  
  const frontendDirs = ['src', 'public', 'components', 'pages', 'api', 'lib', 'styles', 'hooks'];
  const frontendFiles = [
    'index.js', 
    'next.config.js', 
    'package.json', 
    'package-lock.json',
    'vercel.json',
    '.nvmrc',
    '.node-version'
  ];
  
  // Copia diretórios
  for (const dir of frontendDirs) {
    if (fs.existsSync(path.join(__dirname, '..', dir))) {
      try {
        fs.mkdirSync(path.join(backupDir, 'frontend', dir), { recursive: true });
        execSync(`cp -R "${path.join(__dirname, '..', dir)}" "${path.join(backupDir, 'frontend')}"`);
      } catch (error) {
        console.warn(`Aviso: Não foi possível copiar o diretório ${dir}:`, error);
      }
    }
  }
  
  // Copia arquivos
  for (const file of frontendFiles) {
    if (fs.existsSync(path.join(__dirname, '..', file))) {
      try {
        fs.copyFileSync(
          path.join(__dirname, '..', file),
          path.join(backupDir, 'frontend', file)
        );
      } catch (error) {
        console.warn(`Aviso: Não foi possível copiar o arquivo ${file}:`, error);
      }
    }
  }
  
  // Compacta o frontend
  try {
    execSync(`cd "${path.join(backupDir)}" && zip -r "frontend_backup.zip" frontend`);
    console.log('Frontend compactado com sucesso!');
  } catch (error) {
    console.warn('Aviso: Não foi possível compactar o frontend:', error);
  }
}

// Backup dos scripts SQL
function backupSQLScripts() {
  console.log('Realizando backup dos scripts SQL...');
  
  if (fs.existsSync(path.join(__dirname, '..', 'sql'))) {
    try {
      execSync(`cp -R "${path.join(__dirname, '..', 'sql')}" "${path.join(backupDir)}"`);
    } catch (error) {
      console.warn('Aviso: Não foi possível copiar os scripts SQL:', error);
    }
  }
  
  // Copia arquivos SQL soltos na raiz
  try {
    const files = fs.readdirSync(path.join(__dirname, '..'));
    for (const file of files) {
      if (file.endsWith('.sql') && fs.statSync(path.join(__dirname, '..', file)).isFile()) {
        fs.copyFileSync(
          path.join(__dirname, '..', file),
          path.join(backupDir, 'sql', file)
        );
      }
    }
  } catch (error) {
    console.warn('Aviso: Erro ao copiar arquivos SQL da raiz:', error);
  }
}

// Backup das funções Supabase
function backupSupabaseFunctions() {
  console.log('Realizando backup das funções Supabase...');
  
  if (fs.existsSync(path.join(__dirname, '..', 'supabase_functions'))) {
    try {
      execSync(`cp -R "${path.join(__dirname, '..', 'supabase_functions')}" "${path.join(backupDir)}"`);
    } catch (error) {
      console.warn('Aviso: Não foi possível copiar as funções Supabase:', error);
    }
  }
}

// Copia o arquivo README do backup
function copiarReadme() {
  console.log('Copiando README do backup...');
  
  if (fs.existsSync(path.join(__dirname, '..', 'README_BACKUP.txt'))) {
    try {
      fs.copyFileSync(
        path.join(__dirname, '..', 'README_BACKUP.txt'),
        path.join(backupDir, 'README.txt')
      );
    } catch (error) {
      console.warn('Aviso: Não foi possível copiar o README do backup:', error);
    }
  }
  
  // Copia documentação adicional
  const docsFiles = [
    'DOCUMENTACAO_SISTEMA.md',
    'README.md',
    'RECOMENDACOES_SEGURANCA.md',
    'INSTRUCOES_RESTAURACAO.md',
    'SEGURANCA.md',
    'SUPABASE_SETUP.md'
  ];
  
  fs.mkdirSync(path.join(backupDir, 'docs'), { recursive: true });
  
  for (const file of docsFiles) {
    if (fs.existsSync(path.join(__dirname, '..', file))) {
      try {
        fs.copyFileSync(
          path.join(__dirname, '..', file),
          path.join(backupDir, 'docs', file)
        );
      } catch (error) {
        console.warn(`Aviso: Não foi possível copiar o arquivo ${file}:`, error);
      }
    }
  }
}

// Cria um arquivo .env de exemplo seguro
function criarEnvSeguro() {
  console.log('Criando arquivo .env de exemplo seguro...');
  
  const envContent = `# Arquivo de exemplo de variáveis de ambiente
# IMPORTANTE: Substitua com seus próprios valores ao restaurar

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_KEY=sua_chave_service

# API e segurança
API_SECRET_KEY=chave_secreta_para_api
ADMIN_PASSWORD=senha_de_administrador
CRON_SECRET=segredo_para_cron_job

# Configuração do app
BASE_URL=https://seu-site.vercel.app
NODE_ENV=production
`;

  fs.writeFileSync(path.join(backupDir, '.env.example'), envContent);
}

realizarBackup(); 