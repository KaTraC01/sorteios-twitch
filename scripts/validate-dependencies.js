
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
        console.log(`   - ${vuln.name}: ${vuln.severity}`);
      });
      
      console.log('\n💡 Execute as mitigações de segurança disponíveis.');
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
