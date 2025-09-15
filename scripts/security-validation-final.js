/**
 * SCRIPT DE VALIDAÇÃO FINAL DE SEGURANÇA
 * ======================================
 * 
 * Verifica se todas as melhorias de segurança foram implementadas corretamente
 * 
 * @author Security Team
 * @date 2025-01-15
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ===================================================================
// CONFIGURAÇÕES DE VALIDAÇÃO
// ===================================================================

const VALIDATION_CONFIG = {
  // URLs para teste
  baseUrl: 'https://sorteios-twitch.vercel.app',
  
  // Headers de segurança esperados
  expectedHeaders: {
    'x-frame-options': 'DENY',
    'x-content-type-options': 'nosniff',
    'x-xss-protection': '1; mode=block',
    'strict-transport-security': /.+/,
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': /.+/
  },
  
  // Arquivos de segurança que devem existir
  securityFiles: [
    'src/utils/securityUtils.js',
    'src/utils/securityHeaders.js',
    'scripts/security-mitigation.js',
    'scripts/validate-dependencies.js',
    'webpack.config.security.js',
    'postcss.config.security.js',
    'patches/nth-check+2.0.0.patch',
    'SECURITY_IMPROVEMENTS_REPORT.md',
    'CONFIGURACAO_SEGURANCA_SUPABASE.md'
  ]
};

// ===================================================================
// FUNÇÕES DE VALIDAÇÃO
// ===================================================================

/**
 * Validar headers de segurança
 */
async function validateSecurityHeaders() {
  console.log('🔍 Validando headers de segurança...');
  
  return new Promise((resolve, reject) => {
    const url = new URL(VALIDATION_CONFIG.baseUrl);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: '/',
      method: 'HEAD'
    };
    
    const req = https.request(options, (res) => {
      const results = [];
      
      Object.entries(VALIDATION_CONFIG.expectedHeaders).forEach(([header, expected]) => {
        const actual = res.headers[header.toLowerCase()];
        
        if (!actual) {
          results.push({
            header,
            status: '❌ AUSENTE',
            expected: expected.toString(),
            actual: 'undefined'
          });
        } else if (expected instanceof RegExp ? expected.test(actual) : actual === expected) {
          results.push({
            header,
            status: '✅ OK',
            expected: expected.toString(),
            actual
          });
        } else {
          results.push({
            header,
            status: '⚠️ DIVERGENTE',
            expected: expected.toString(),
            actual
          });
        }
      });
      
      resolve(results);
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => reject(new Error('Timeout')));
    req.end();
  });
}

/**
 * Validar existência de arquivos de segurança
 */
function validateSecurityFiles() {
  console.log('📁 Validando arquivos de segurança...');
  
  const results = [];
  
  VALIDATION_CONFIG.securityFiles.forEach(filePath => {
    const fullPath = path.join(__dirname, '..', filePath);
    const exists = fs.existsSync(fullPath);
    
    results.push({
      file: filePath,
      status: exists ? '✅ EXISTE' : '❌ AUSENTE',
      path: fullPath
    });
  });
  
  return results;
}

/**
 * Validar package.json scripts de segurança
 */
function validatePackageScripts() {
  console.log('📦 Validando scripts de segurança no package.json...');
  
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  const expectedScripts = [
    'security:validate',
    'security:audit', 
    'security:check'
  ];
  
  const results = [];
  
  expectedScripts.forEach(script => {
    const exists = packageJson.scripts && packageJson.scripts[script];
    results.push({
      script,
      status: exists ? '✅ CONFIGURADO' : '❌ AUSENTE',
      command: exists ? packageJson.scripts[script] : 'undefined'
    });
  });
  
  return results;
}

/**
 * Validar configurações do Vercel
 */
function validateVercelConfig() {
  console.log('⚡ Validando configurações do Vercel...');
  
  const vercelPath = path.join(__dirname, '..', 'vercel.json');
  
  if (!fs.existsSync(vercelPath)) {
    return [{ 
      item: 'vercel.json', 
      status: '❌ ARQUIVO NÃO ENCONTRADO' 
    }];
  }
  
  const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  const results = [];
  
  // Verificar headers
  const hasHeaders = vercelConfig.headers && vercelConfig.headers.length > 0;
  results.push({
    item: 'Headers de segurança',
    status: hasHeaders ? '✅ CONFIGURADO' : '❌ AUSENTE'
  });
  
  // Verificar crons
  const hasCrons = vercelConfig.crons && vercelConfig.crons.length > 0;
  results.push({
    item: 'Cron jobs',
    status: hasCrons ? '✅ CONFIGURADO' : '❌ AUSENTE'
  });
  
  return results;
}

/**
 * Testar vulnerabilidades conhecidas
 */
function validateVulnerabilityMitigations() {
  console.log('🛡️ Validando mitigações de vulnerabilidades...');
  
  const results = [];
  
  // Verificar patch nth-check
  const patchPath = path.join(__dirname, '..', 'patches', 'nth-check+2.0.0.patch');
  results.push({
    vulnerability: 'nth-check ReDoS',
    mitigation: 'Patch criado',
    status: fs.existsSync(patchPath) ? '✅ MITIGADO' : '❌ PENDENTE'
  });
  
  // Verificar configuração webpack segura
  const webpackPath = path.join(__dirname, '..', 'webpack.config.security.js');
  results.push({
    vulnerability: 'webpack-dev-server',
    mitigation: 'Configuração segura',
    status: fs.existsSync(webpackPath) ? '✅ MITIGADO' : '❌ PENDENTE'
  });
  
  // Verificar configuração PostCSS segura
  const postcssPath = path.join(__dirname, '..', 'postcss.config.security.js');
  results.push({
    vulnerability: 'PostCSS parsing',
    mitigation: 'Parser seguro',
    status: fs.existsSync(postcssPath) ? '✅ MITIGADO' : '❌ PENDENTE'
  });
  
  return results;
}

/**
 * Gerar relatório de segurança
 */
function generateSecurityReport(results) {
  const timestamp = new Date().toISOString();
  
  let report = `# 🔒 RELATÓRIO DE VALIDAÇÃO DE SEGURANÇA\n\n`;
  report += `**Data:** ${timestamp}\n`;
  report += `**Status:** VALIDAÇÃO AUTOMÁTICA\n\n`;
  
  // Headers de segurança
  report += `## 🌐 HEADERS DE SEGURANÇA\n\n`;
  results.headers.forEach(item => {
    report += `- **${item.header}**: ${item.status}\n`;
    if (item.status !== '✅ OK') {
      report += `  - Esperado: ${item.expected}\n`;
      report += `  - Atual: ${item.actual}\n`;
    }
  });
  
  // Arquivos de segurança
  report += `\n## 📁 ARQUIVOS DE SEGURANÇA\n\n`;
  results.files.forEach(item => {
    report += `- **${item.file}**: ${item.status}\n`;
  });
  
  // Scripts do package.json
  report += `\n## 📦 SCRIPTS DE SEGURANÇA\n\n`;
  results.scripts.forEach(item => {
    report += `- **${item.script}**: ${item.status}\n`;
  });
  
  // Configurações Vercel
  report += `\n## ⚡ CONFIGURAÇÕES VERCEL\n\n`;
  results.vercel.forEach(item => {
    report += `- **${item.item}**: ${item.status}\n`;
  });
  
  // Mitigações de vulnerabilidades
  report += `\n## 🛡️ MITIGAÇÕES DE VULNERABILIDADES\n\n`;
  results.vulnerabilities.forEach(item => {
    report += `- **${item.vulnerability}**: ${item.status}\n`;
    report += `  - Mitigação: ${item.mitigation}\n`;
  });
  
  // Calcular score de segurança
  const totalChecks = Object.values(results).flat().length;
  const passedChecks = Object.values(results).flat().filter(item => 
    item.status && item.status.includes('✅')
  ).length;
  
  const securityScore = Math.round((passedChecks / totalChecks) * 100);
  
  report += `\n## 📊 SCORE DE SEGURANÇA\n\n`;
  report += `**${securityScore}%** (${passedChecks}/${totalChecks} verificações aprovadas)\n\n`;
  
  if (securityScore >= 90) {
    report += `🎉 **EXCELENTE**: Segurança implementada corretamente!\n`;
  } else if (securityScore >= 75) {
    report += `👍 **BOM**: Algumas melhorias menores necessárias.\n`;
  } else if (securityScore >= 50) {
    report += `⚠️ **ATENÇÃO**: Várias correções de segurança pendentes.\n`;
  } else {
    report += `🚨 **CRÍTICO**: Implementação de segurança insuficiente!\n`;
  }
  
  return report;
}

// ===================================================================
// FUNÇÃO PRINCIPAL
// ===================================================================

async function runSecurityValidation() {
  console.log('🔒 INICIANDO VALIDAÇÃO FINAL DE SEGURANÇA');
  console.log('==========================================\n');
  
  try {
    const results = {
      headers: await validateSecurityHeaders(),
      files: validateSecurityFiles(),
      scripts: validatePackageScripts(),
      vercel: validateVercelConfig(),
      vulnerabilities: validateVulnerabilityMitigations()
    };
    
    // Exibir resultados no console
    console.log('\n📊 RESULTADOS DA VALIDAÇÃO:');
    console.log('============================\n');
    
    Object.entries(results).forEach(([category, items]) => {
      console.log(`${category.toUpperCase()}:`);
      items.forEach(item => {
        const key = Object.keys(item).find(k => k !== 'status');
        console.log(`  ${item[key]}: ${item.status}`);
      });
      console.log('');
    });
    
    // Gerar relatório
    const report = generateSecurityReport(results);
    const reportPath = path.join(__dirname, '..', 'SECURITY_VALIDATION_REPORT.md');
    fs.writeFileSync(reportPath, report, 'utf8');
    
    console.log(`✅ Relatório salvo em: ${reportPath}`);
    
    // Calcular score final
    const totalChecks = Object.values(results).flat().length;
    const passedChecks = Object.values(results).flat().filter(item => 
      item.status && item.status.includes('✅')
    ).length;
    
    const finalScore = Math.round((passedChecks / totalChecks) * 100);
    
    console.log(`\n🎯 SCORE FINAL DE SEGURANÇA: ${finalScore}%`);
    
    if (finalScore >= 90) {
      console.log('🎉 Sistema altamente seguro! Implementação bem-sucedida.');
      process.exit(0);
    } else {
      console.log('⚠️  Algumas verificações falharam. Revise o relatório.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Erro durante validação:', error.message);
    process.exit(1);
  }
}

// ===================================================================
// EXECUÇÃO
// ===================================================================

if (require.main === module) {
  runSecurityValidation();
}

module.exports = {
  runSecurityValidation,
  validateSecurityHeaders,
  validateSecurityFiles,
  validatePackageScripts,
  validateVercelConfig,
  validateVulnerabilityMitigations
};
