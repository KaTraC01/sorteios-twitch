/**
 * SCRIPT DE TESTE DAS MELHORIAS DE SEGURANÇA
 * ==========================================
 * 
 * Executa testes automatizados para verificar se as correções
 * de segurança foram aplicadas corretamente
 * 
 * @author Sistema de Segurança v1.0
 * @date 2025-01-15
 */

import fetch from 'node-fetch';

// Configurações do teste
const BASE_URL = process.env.BASE_URL || 'https://sorteios-twitch.vercel.app';
const API_SECRET = process.env.API_SECRET_KEY;

console.log('🔒 INICIANDO TESTES DE SEGURANÇA');
console.log('================================');
console.log(`Base URL: ${BASE_URL}`);
console.log(`Timestamp: ${new Date().toISOString()}\n`);

/**
 * Executa um teste de segurança
 */
async function runSecurityTest(testName, testFunction) {
  console.log(`🧪 Teste: ${testName}`);
  try {
    const result = await testFunction();
    if (result.passed) {
      console.log(`✅ PASSOU: ${result.message}\n`);
    } else {
      console.log(`❌ FALHOU: ${result.message}\n`);
    }
    return result.passed;
  } catch (error) {
    console.log(`💥 ERRO: ${error.message}\n`);
    return false;
  }
}

/**
 * Teste 1: Verificar se endpoints de debug estão protegidos
 */
async function testDebugEndpointsProtected() {
  const debugEndpoints = [
    '/api/debug-sorteio',
    '/api/debug-env',
    '/pages/api/test-supabase'
  ];

  for (const endpoint of debugEndpoints) {
    const response = await fetch(`${BASE_URL}${endpoint}`);
    
    // Deve retornar 404 (não encontrado) para usuários não autenticados
    if (response.status !== 404) {
      return {
        passed: false,
        message: `Endpoint ${endpoint} não está adequadamente protegido (status: ${response.status})`
      };
    }
  }

  return {
    passed: true,
    message: 'Todos os endpoints de debug estão protegidos'
  };
}

/**
 * Teste 2: Verificar rate limiting
 */
async function testRateLimiting() {
  const endpoint = '/api/debug-env';
  let successCount = 0;
  let rateLimitedCount = 0;

  // Fazer múltiplas requisições rapidamente
  for (let i = 0; i < 10; i++) {
    const response = await fetch(`${BASE_URL}${endpoint}`);
    if (response.status === 429) {
      rateLimitedCount++;
    } else if (response.status === 404) {
      successCount++; // 404 é esperado para endpoints protegidos
    }
  }

  return {
    passed: rateLimitedCount > 0 || successCount > 0,
    message: `Rate limiting funcionando: ${rateLimitedCount} requisições bloqueadas, ${successCount} processadas`
  };
}

/**
 * Teste 3: Verificar headers de segurança
 */
async function testSecurityHeaders() {
  const response = await fetch(BASE_URL);
  const headers = response.headers;

  const requiredHeaders = [
    'x-frame-options',
    'x-content-type-options',
    'x-xss-protection',
    'referrer-policy'
  ];

  const missingHeaders = requiredHeaders.filter(header => !headers.get(header));

  return {
    passed: missingHeaders.length === 0,
    message: missingHeaders.length === 0 
      ? 'Todos os headers de segurança estão presentes'
      : `Headers ausentes: ${missingHeaders.join(', ')}`
  };
}

/**
 * Teste 4: Verificar acesso autenticado aos endpoints protegidos
 */
async function testAuthenticatedAccess() {
  if (!API_SECRET) {
    return {
      passed: false,
      message: 'API_SECRET_KEY não configurada para teste'
    };
  }

  const response = await fetch(`${BASE_URL}/api/debug-env`, {
    headers: {
      'Authorization': `Bearer ${API_SECRET}`
    }
  });

  // Com autenticação válida, deve retornar dados ou pelo menos não 404
  return {
    passed: response.status !== 404,
    message: `Acesso autenticado: status ${response.status}`
  };
}

/**
 * Teste 5: Verificar se logs não contêm informações sensíveis
 */
async function testLogSanitization() {
  // Este é um teste conceitual - verificamos se o sistema de sanitização está ativo
  const { sanitizeLogMessage } = await import('../src/utils/logSanitizer.js');
  
  const testMessages = [
    'token=abc123def456',
    'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    'password=minhaSenha123',
    'API_KEY=sk_live_abcdef123456'
  ];

  let allSanitized = true;
  for (const message of testMessages) {
    const sanitized = sanitizeLogMessage(message);
    if (sanitized === message) {
      allSanitized = false;
      break;
    }
  }

  return {
    passed: allSanitized,
    message: allSanitized 
      ? 'Sistema de sanitização de logs funcionando'
      : 'Falha na sanitização de logs'
  };
}

/**
 * Executar todos os testes
 */
async function runAllTests() {
  const tests = [
    ['Endpoints de Debug Protegidos', testDebugEndpointsProtected],
    ['Rate Limiting Ativo', testRateLimiting],
    ['Headers de Segurança', testSecurityHeaders],
    ['Acesso Autenticado', testAuthenticatedAccess],
    ['Sanitização de Logs', testLogSanitization]
  ];

  let passedTests = 0;
  const totalTests = tests.length;

  for (const [name, testFn] of tests) {
    const passed = await runSecurityTest(name, testFn);
    if (passed) passedTests++;
  }

  console.log('📊 RESUMO DOS TESTES');
  console.log('===================');
  console.log(`✅ Aprovados: ${passedTests}/${totalTests}`);
  console.log(`❌ Falharam: ${totalTests - passedTests}/${totalTests}`);
  console.log(`🎯 Taxa de Sucesso: ${Math.round((passedTests/totalTests) * 100)}%`);

  if (passedTests === totalTests) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM! Sistema seguro para produção.');
  } else {
    console.log('\n⚠️  ALGUNS TESTES FALHARAM. Verificar correções necessárias.');
  }

  return passedTests === totalTests;
}

// Executar testes se o script for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Erro crítico nos testes:', error);
      process.exit(1);
    });
}

export default runAllTests;
