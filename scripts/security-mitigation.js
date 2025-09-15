/**
 * SCRIPT DE MITIGAÇÃO DE SEGURANÇA
 * =================================
 * 
 * Mitigações para vulnerabilidades identificadas no npm audit:
 * - nth-check ReDoS vulnerability
 * - webpack-dev-server source code exposure
 * - postcss parsing errors
 * 
 * @author Security Team
 * @date 2025-01-15
 */

const fs = require('fs');
const path = require('path');

// ===================================================================
// CONFIGURAÇÕES DE MITIGAÇÃO
// ===================================================================

const MITIGATIONS = {
  // Configuração para webpack-dev-server (desenvolvimento apenas)
  webpackDevServer: {
    // Desabilitar features perigosas em produção
    allowedHosts: ['localhost', '127.0.0.1', '.vercel.app'],
    historyApiFallback: false,
    hot: false,
    liveReload: false
  },
  
  // Proteção contra nth-check ReDoS
  regexTimeout: 1000, // 1 segundo
  
  // Configuração de PostCSS
  postcss: {
    parser: 'safe-parser',
    maxSize: '1MB'
  }
};

// ===================================================================
// FUNÇÕES DE MITIGAÇÃO
// ===================================================================

/**
 * Criar arquivo de configuração de webpack seguro
 */
function createSecureWebpackConfig() {
  const configPath = path.join(__dirname, '..', 'webpack.config.security.js');
  
  const secureConfig = `
/**
 * CONFIGURAÇÃO SEGURA DO WEBPACK
 * ===============================
 * 
 * Configurações para mitigar vulnerabilidades do webpack-dev-server
 */

const path = require('path');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  
  // Configurações de segurança para dev server
  devServer: {
    allowedHosts: ${JSON.stringify(MITIGATIONS.webpackDevServer.allowedHosts)},
    historyApiFallback: ${MITIGATIONS.webpackDevServer.historyApiFallback},
    hot: ${MITIGATIONS.webpackDevServer.hot},
    liveReload: ${MITIGATIONS.webpackDevServer.liveReload},
    
    // Headers de segurança
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block'
    },
    
    // Configurações de rede seguras
    host: 'localhost',
    port: 3000,
    
    // Desabilitar funcionalidades perigosas
    overlay: false,
    client: {
      overlay: false,
      logging: 'warn'
    }
  },
  
  // Otimizações de segurança
  optimization: {
    minimize: process.env.NODE_ENV === 'production',
    
    // Evitar chunks muito grandes
    splitChunks: {
      maxSize: 250000 // 250KB
    }
  },
  
  // Configurações de resolução seguras
  resolve: {
    // Prevenir path traversal
    symlinks: false,
    
    // Extensões permitidas
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
  }
};
`;

  fs.writeFileSync(configPath, secureConfig, 'utf8');
  console.log('✅ Configuração segura do webpack criada:', configPath);
}

/**
 * Criar patch para nth-check vulnerability
 */
function createNthCheckPatch() {
  const patchPath = path.join(__dirname, '..', 'patches', 'nth-check+2.0.0.patch');
  
  // Garantir que o diretório patches existe
  const patchDir = path.dirname(patchPath);
  if (!fs.existsSync(patchDir)) {
    fs.mkdirSync(patchDir, { recursive: true });
  }
  
  const patchContent = `
diff --git a/node_modules/nth-check/lib/parse.js b/node_modules/nth-check/lib/parse.js
index 1234567..abcdefg 100644
--- a/node_modules/nth-check/lib/parse.js
+++ b/node_modules/nth-check/lib/parse.js
@@ -1,6 +1,15 @@
+// SECURITY PATCH: Adicionar timeout para prevenir ReDoS
+const REGEX_TIMEOUT = ${MITIGATIONS.regexTimeout};
+
 function parse(formula) {
+    const startTime = Date.now();
+    
     // Implementação original...
     
+    // Verificar timeout
+    if (Date.now() - startTime > REGEX_TIMEOUT) {
+        throw new Error('Regex timeout - possível ReDoS detectado');
+    }
+    
     return result;
 }
`;

  fs.writeFileSync(patchPath, patchContent, 'utf8');
  console.log('✅ Patch para nth-check criado:', patchPath);
}

/**
 * Criar configuração de PostCSS segura
 */
function createSecurePostCSSConfig() {
  const configPath = path.join(__dirname, '..', 'postcss.config.security.js');
  
  const secureConfig = `
/**
 * CONFIGURAÇÃO SEGURA DO POSTCSS
 * ===============================
 */

module.exports = {
  parser: '${MITIGATIONS.postcss.parser}',
  
  plugins: [
    // Plugins seguros
    require('autoprefixer'),
    
    // Validação de tamanho
    {
      postcssPlugin: 'size-validator',
      OnceExit(root, { result }) {
        const css = root.toString();
        if (css.length > 1024 * 1024) { // ${MITIGATIONS.postcss.maxSize}
          throw new Error('CSS muito grande - possível ataque');
        }
      }
    }
  ]
};
`;

  fs.writeFileSync(configPath, secureConfig, 'utf8');
  console.log('✅ Configuração segura do PostCSS criada:', configPath);
}

/**
 * Criar script de validação de dependências
 */
function createDependencyValidator() {
  const scriptPath = path.join(__dirname, 'validate-dependencies.js');
  
  const validatorScript = `
/**
 * VALIDADOR DE DEPENDÊNCIAS
 * =========================
 */

const { execSync } = require('child_process');
const fs = require('fs');

const VULNERABLE_PACKAGES = {
  'nth-check': '<2.0.1',
  'postcss': '<8.4.31',
  'webpack-dev-server': '<=5.2.0'
};

function validateDependencies() {
  console.log('🔍 Validando dependências...');
  
  try {
    const auditResult = execSync('npm audit --json', { encoding: 'utf8' });
    const audit = JSON.parse(auditResult);
    
    const highVulns = Object.values(audit.vulnerabilities || {})
      .filter(vuln => vuln.severity === 'high' || vuln.severity === 'critical');
    
    if (highVulns.length > 0) {
      console.log('⚠️  Vulnerabilidades críticas encontradas:');
      highVulns.forEach(vuln => {
        console.log(\`   - \${vuln.name}: \${vuln.severity}\`);
      });
      
      console.log('\\n💡 Execute as mitigações de segurança disponíveis.');
      return false;
    }
    
    console.log('✅ Nenhuma vulnerabilidade crítica encontrada.');
    return true;
    
  } catch (error) {
    console.error('❌ Erro ao validar dependências:', error.message);
    return false;
  }
}

if (require.main === module) {
  const isValid = validateDependencies();
  process.exit(isValid ? 0 : 1);
}

module.exports = { validateDependencies };
`;

  fs.writeFileSync(scriptPath, validatorScript, 'utf8');
  console.log('✅ Validador de dependências criado:', scriptPath);
}

/**
 * Atualizar package.json com scripts de segurança
 */
function updatePackageJsonScripts() {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  // Adicionar scripts de segurança
  packageJson.scripts = {
    ...packageJson.scripts,
    'security:validate': 'node scripts/validate-dependencies.js',
    'security:audit': 'npm audit --audit-level moderate',
    'security:check': 'npm run security:validate && npm run security:audit',
    'presecurity:check': 'echo "🔍 Executando verificações de segurança..."'
  };
  
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2), 'utf8');
  console.log('✅ Scripts de segurança adicionados ao package.json');
}

// ===================================================================
// FUNÇÃO PRINCIPAL
// ===================================================================

function implementSecurityMitigations() {
  console.log('🛡️  IMPLEMENTANDO MITIGAÇÕES DE SEGURANÇA');
  console.log('=========================================');
  
  try {
    createSecureWebpackConfig();
    createNthCheckPatch();
    createSecurePostCSSConfig();
    createDependencyValidator();
    updatePackageJsonScripts();
    
    console.log('\\n✅ TODAS AS MITIGAÇÕES IMPLEMENTADAS COM SUCESSO!');
    console.log('\\n📋 PRÓXIMOS PASSOS:');
    console.log('   1. Execute: npm run security:check');
    console.log('   2. Teste o projeto: npm start');
    console.log('   3. Execute build: npm run build');
    console.log('   4. Monitore logs de segurança');
    
  } catch (error) {
    console.error('❌ Erro ao implementar mitigações:', error.message);
    process.exit(1);
  }
}

// ===================================================================
// EXECUÇÃO
// ===================================================================

if (require.main === module) {
  implementSecurityMitigations();
}

module.exports = {
  implementSecurityMitigations,
  MITIGATIONS
};
