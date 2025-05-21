/**
 * Backup baseado em arquivos - não depende de pg_dump ou acesso direto ao banco de dados
 * 
 * Este script realiza um backup completo do código fonte, arquivos SQL e configurações
 * sem tentar fazer dump do banco de dados diretamente.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Timestamp para o nome do backup
const now = new Date();
const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

// Diretório de backup
const backupDir = path.join(__dirname, '..', 'backup', timestamp);

// Função principal
async function backupFiles() {
  try {
    console.log('Iniciando backup completo baseado em arquivos...');
    
    // Cria diretórios necessários
    fs.mkdirSync(backupDir, { recursive: true });
    fs.mkdirSync(path.join(backupDir, 'frontend'), { recursive: true });
    fs.mkdirSync(path.join(backupDir, 'sql'), { recursive: true });
    fs.mkdirSync(path.join(backupDir, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(backupDir, 'docs'), { recursive: true });
    fs.mkdirSync(path.join(backupDir, 'api'), { recursive: true });
    fs.mkdirSync(path.join(backupDir, 'supabase_functions'), { recursive: true });
    
    // 1. Backup do Frontend
    backupFrontend();
    
    // 2. Backup dos Scripts SQL
    backupSqlScripts();
    
    // 3. Backup das funções Supabase
    backupSupabaseFunctions();
    
    // 4. Backup da documentação
    backupDocumentation();
    
    // 5. Backup dos scripts de API
    backupApiScripts();
    
    // 6. Backup de arquivos de configuração
    backupConfigFiles();
    
    // 7. Criar README e instruções de backup
    createBackupInstructions();
    
    // 8. Compactar backup
    console.log('\nCompactando backup...');
    // Gera o nome do arquivo zip
    const zipFileName = `site-sorteio-backup-${timestamp}.zip`;
    const zipFilePath = path.join(__dirname, '..', 'backup', zipFileName);
    
    try {
      // Tenta usar o comando zip (sistemas Unix-like e Windows com zip instalado)
      execSync(`cd "${path.dirname(backupDir)}" && zip -r "${zipFileName}" "${path.basename(backupDir)}"`);
      console.log(`Backup compactado disponível em: ${zipFilePath}`);
    } catch (e) {
      // Se falhar, tentamos alternativas
      try {
        // Tenta usar o PowerShell (Windows)
        execSync(`powershell Compress-Archive -Path "${backupDir}" -DestinationPath "${zipFilePath.replace('.zip', '')}.zip"`);
        console.log(`Backup compactado disponível em: ${zipFilePath}`);
      } catch (e2) {
        console.warn('Não foi possível compactar o backup. Os arquivos estão disponíveis no diretório:', backupDir);
      }
    }
    
    console.log('\n✅ Backup baseado em arquivos concluído com sucesso!');
    
  } catch (error) {
    console.error('Erro ao realizar backup de arquivos:', error);
    process.exit(1);
  }
}

// Backup do Frontend
function backupFrontend() {
  console.log('\nRealizando backup do frontend...');
  
  const frontendDirs = ['src', 'public', 'components', 'pages', 'styles', 'hooks', 'lib', 'utils'];
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
        // Para evitar problemas com comandos específicos de SO, usamos uma abordagem recursiva em JavaScript puro
        copyDirectoryRecursiveSync(
          path.join(__dirname, '..', dir),
          path.join(backupDir, 'frontend', dir)
        );
        console.log(`✓ Copiado diretório ${dir}`);
      } catch (error) {
        console.warn(`Aviso: Não foi possível copiar o diretório ${dir}:`, error);
      }
    } else {
      console.log(`Diretório ${dir} não encontrado - ignorando.`);
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
        console.log(`✓ Copiado arquivo ${file}`);
      } catch (error) {
        console.warn(`Aviso: Não foi possível copiar o arquivo ${file}:`, error);
      }
    } else {
      console.log(`Arquivo ${file} não encontrado - ignorando.`);
    }
  }
}

// Backup dos Scripts SQL
function backupSqlScripts() {
  console.log('\nRealizando backup dos scripts SQL...');
  
  // Copia pasta sql
  if (fs.existsSync(path.join(__dirname, '..', 'sql'))) {
    try {
      copyDirectoryRecursiveSync(
        path.join(__dirname, '..', 'sql'),
        path.join(backupDir, 'sql')
      );
      console.log('✓ Copiada pasta sql');
    } catch (error) {
      console.warn('Aviso: Não foi possível copiar a pasta sql:', error);
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
        console.log(`✓ Copiado arquivo SQL ${file} da raiz`);
      }
    }
  } catch (error) {
    console.warn('Aviso: Erro ao copiar arquivos SQL da raiz:', error);
  }
}

// Backup das funções Supabase
function backupSupabaseFunctions() {
  console.log('\nRealizando backup das funções Supabase...');
  
  if (fs.existsSync(path.join(__dirname, '..', 'supabase_functions'))) {
    try {
      copyDirectoryRecursiveSync(
        path.join(__dirname, '..', 'supabase_functions'),
        path.join(backupDir, 'supabase_functions')
      );
      console.log('✓ Copiada pasta supabase_functions');
    } catch (error) {
      console.warn('Aviso: Não foi possível copiar a pasta supabase_functions:', error);
    }
  }
}

// Backup da documentação
function backupDocumentation() {
  console.log('\nRealizando backup da documentação...');
  
  const docFiles = [
    'DOCUMENTACAO_SISTEMA.md',
    'README.md',
    'RECOMENDACOES_SEGURANCA.md',
    'INSTRUCOES_RESTAURACAO.md',
    'SEGURANCA.md',
    'SUPABASE_SETUP.md',
    'INSTRUCOES_MIGRACAO.md',
    'INSTRUCOES_ATUALIZACAO_LIMPEZA_SORTEIOS.md',
    'INSTRUCOES_CORRIGIR_LIMPEZA_PARTICIPANTES.md',
    'INSTRUCOES_CORRIGIR_SISTEMA_CADEADO.md',
    'CORRECAO_DELETE_REQUIRES_WHERE.md',
    'INSTRUCOES_CORRECAO_SORTEIO.md',
    'INSTRUCOES_ATUALIZACAO_BOTAO_10.md',
    'IMPLEMENTACAO_RATE_LIMITING_BURST.md',
    'MEDIDAS_SEGURANCA_ATUALIZADAS.md',
    'SERVERLESS_SETUP.md',
    'INSTRUCOES_DE_CORRECAO.md',
    'CORRECAO_SORTEIOS_NAO_REGISTRADOS.md'
  ];
  
  for (const file of docFiles) {
    if (fs.existsSync(path.join(__dirname, '..', file))) {
      try {
        fs.copyFileSync(
          path.join(__dirname, '..', file),
          path.join(backupDir, 'docs', file)
        );
        console.log(`✓ Copiado arquivo de documentação ${file}`);
      } catch (error) {
        console.warn(`Aviso: Não foi possível copiar o arquivo de documentação ${file}:`, error);
      }
    }
  }
}

// Backup dos scripts de API
function backupApiScripts() {
  console.log('\nRealizando backup dos scripts de API...');
  
  if (fs.existsSync(path.join(__dirname, '..', 'api'))) {
    try {
      copyDirectoryRecursiveSync(
        path.join(__dirname, '..', 'api'),
        path.join(backupDir, 'api')
      );
      console.log('✓ Copiada pasta api');
    } catch (error) {
      console.warn('Aviso: Não foi possível copiar a pasta api:', error);
    }
  }
  
  if (fs.existsSync(path.join(__dirname, '..', 'scripts'))) {
    try {
      copyDirectoryRecursiveSync(
        path.join(__dirname, '..', 'scripts'),
        path.join(backupDir, 'scripts')
      );
      console.log('✓ Copiada pasta scripts');
    } catch (error) {
      console.warn('Aviso: Não foi possível copiar a pasta scripts:', error);
    }
  }
}

// Backup de arquivos de configuração
function backupConfigFiles() {
  console.log('\nRealizando backup de arquivos de configuração...');
  
  const configFiles = [
    '.gitignore',
    '.npmrc',
    '.npmignore'
  ];
  
  for (const file of configFiles) {
    if (fs.existsSync(path.join(__dirname, '..', file))) {
      try {
        fs.copyFileSync(
          path.join(__dirname, '..', file),
          path.join(backupDir, file)
        );
        console.log(`✓ Copiado arquivo de configuração ${file}`);
      } catch (error) {
        console.warn(`Aviso: Não foi possível copiar o arquivo de configuração ${file}:`, error);
      }
    }
  }
  
  // Cria um arquivo .env.example seguro
  const envExampleContent = `# Arquivo de exemplo de variáveis de ambiente
# IMPORTANTE: Substitua com seus próprios valores ao restaurar

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
SUPABASE_SERVICE_KEY=sua-chave-service

# API e segurança
API_SECRET_KEY=sua-chave-secreta-api
ADMIN_PASSWORD=sua-senha-admin
CRON_SECRET=seu-segredo-cron

# Configuração da aplicação
BASE_URL=https://seu-site.vercel.app
NODE_ENV=production
`;

  fs.writeFileSync(path.join(backupDir, '.env.example'), envExampleContent);
  console.log('✓ Criado arquivo .env.example');
}

// Criar README e instruções de backup
function createBackupInstructions() {
  console.log('\nCriando instruções de backup...');
  
  const readmeContent = `# INSTRUÇÕES DE RESTAURAÇÃO DO BACKUP DO SISTEMA DE SORTEIOS

Este arquivo contém instruções para restaurar o backup completo do sistema de sorteios baseado em Supabase e Next.js.

## 1. RESTAURAÇÃO DO FRONTEND

1. Descompacte o arquivo de backup
2. Acesse a pasta 'frontend'
3. Instale as dependências:
   \`\`\`
   npm install
   \`\`\`
4. Crie um arquivo \`.env.local\` na raiz do projeto com base no arquivo \`.env.example\` (substitua com seus valores)
5. Execute o build do projeto:
   \`\`\`
   npm run build
   \`\`\`
6. Inicie o servidor:
   \`\`\`
   npm start
   \`\`\`

## 2. RESTAURAÇÃO DO BANCO DE DADOS SUPABASE

1. Acesse o painel de administração do Supabase e crie um novo projeto
2. Use o Editor SQL para criar as tabelas e funções do banco:
   - Execute os scripts SQL da pasta \`sql\` para criar a estrutura do banco de dados
   - Execute os scripts da pasta \`supabase_functions\` para criar funções personalizadas

## 3. CONFIGURAÇÃO DO CRON

1. Configure o cron job para o sorteio automático:
   - Se usando Vercel, configure um cron no arquivo \`vercel.json\`
   - Se usando outro serviço, configure um job para chamar o endpoint \`/api/cron-sorteio\` periodicamente

## 4. VERIFICAÇÃO DO SISTEMA

1. Acesse \`/api/debug-env\` para verificar se as variáveis de ambiente estão configuradas corretamente
2. Acesse \`/api/diagnostico-cron\` para verificar se os crons estão funcionando
3. Teste um sorteio manual para garantir que tudo está funcionando corretamente

## NOTAS DE SEGURANÇA

- Mantenha o arquivo \`.env.local\` seguro e nunca o compartilhe
- Mude todas as senhas e chaves de API após a restauração
- Configure corretamente as RLS (Row Level Security) policies no Supabase para proteger seus dados

Para mais detalhes, consulte os arquivos de documentação na pasta \`docs\`.

## INFORMAÇÕES DO BACKUP

- Data do backup: ${new Date().toLocaleString()}
- Tipo: Backup completo baseado em arquivos
`;

  // Escreve o arquivo com a codificação UTF-8 explícita
  fs.writeFileSync(path.join(backupDir, 'README.txt'), readmeContent, { encoding: 'utf8' });
  console.log('✓ Criado arquivo README.txt com instruções de restauração');
}

// Função de utilidade para copiar diretórios recursivamente
function copyDirectoryRecursiveSync(source, target) {
  // Cria o diretório de destino
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  
  // Lê os itens do diretório de origem
  const items = fs.readdirSync(source);
  
  // Copia cada item
  for (const item of items) {
    const sourceItemPath = path.join(source, item);
    const targetItemPath = path.join(target, item);
    
    // Ignora node_modules e diretórios de build
    if (item === 'node_modules' || item === '.git' || item === 'build' || 
        item === '.next' || item === 'out' || item === '.vercel') {
      continue;
    }
    
    const stat = fs.statSync(sourceItemPath);
    
    if (stat.isDirectory()) {
      // Se for um diretório, copia recursivamente
      copyDirectoryRecursiveSync(sourceItemPath, targetItemPath);
    } else {
      // Se for um arquivo, copia diretamente
      fs.copyFileSync(sourceItemPath, targetItemPath);
    }
  }
}

// Executa a função principal
backupFiles(); 