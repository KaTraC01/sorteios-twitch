/**
 * Biblioteca de logs seguros para a aplicação
 * Fornece funções de log que respeitam o ambiente (desenvolvimento vs produção)
 */

// Detectar ambiente no servidor (Node.js)
function isServerProduction() {
  const environment = process.env.NODE_ENV || process.env.VERCEL_ENV || 'development';
  return environment === 'production';
}

// Detectar ambiente no cliente (browser)
function isClientProduction() {
  if (typeof window === 'undefined') return true;
  
  return !(
    window.location.hostname.includes('localhost') || 
    window.location.hostname.includes('127.0.0.1') ||
    window.location.hostname.includes('.vercel.app')
  );
}

// Determinar se estamos em ambiente de produção
const isProduction = 
  typeof window === 'undefined' ? isServerProduction() : isClientProduction();

// Verificar se devemos mostrar logs detalhados (para cron jobs)
// Isso permite que cron jobs exibam logs detalhados mesmo em produção
function shouldShowDetailedLogs() {
  // Se VERBOSE_LOGS estiver definida como 'true', mostrar logs detalhados
  return process.env.VERBOSE_LOGS === 'true' || 
         // Sempre mostrar logs detalhados para cron jobs
         (typeof window === 'undefined' && 
          process.env.VERCEL_REGION &&
          process.env.VERCEL_URL);
}

/**
 * Log informativo - sempre visível em cron jobs
 */
function info(mensagem, ...args) {
  if (!isProduction || shouldShowDetailedLogs()) {
    const timestamp = new Date().toISOString();
    console.log(`[INFO][${timestamp}] ${mensagem}`, ...args);
  } else {
    console.log(`[INFO] Informação registrada`);
  }
}

/**
 * Log de depuração - visível em cron jobs mesmo em produção
 */
function debug(mensagem, ...args) {
  if (!isProduction || shouldShowDetailedLogs()) {
    const timestamp = new Date().toISOString();
    console.log(`[DEBUG][${timestamp}] ${mensagem}`, ...args);
  }
}

/**
 * Log de aviso - detalhado em cron jobs
 */
function warn(mensagem, ...args) {
  if (!isProduction || shouldShowDetailedLogs()) {
    const timestamp = new Date().toISOString();
    console.warn(`[AVISO][${timestamp}] ${mensagem}`, ...args);
  } else {
    console.warn('[AVISO] Ocorreu um aviso na aplicação.');
  }
}

/**
 * Log de erro - detalhado em cron jobs
 */
function error(mensagem, ...args) {
  if (!isProduction || shouldShowDetailedLogs()) {
    const timestamp = new Date().toISOString();
    console.error(`[ERRO][${timestamp}] ${mensagem}`, ...args);
  } else {
    console.error('[ERRO] Ocorreu um erro na aplicação.');
  }
}

/**
 * Log de erro crítico - sempre detalhado
 */
function critical(mensagem, erro = null) {
  const timestamp = new Date().toISOString();
  
  if (!isProduction || shouldShowDetailedLogs()) {
    console.error(`[ERRO CRÍTICO][${timestamp}] ${mensagem}`);
    
    // Mostrar todos os detalhes do erro
    if (erro) {
      console.error(erro);
    }
  } else {
    console.error(`[ERRO CRÍTICO][${timestamp}] Ocorreu um erro crítico na aplicação.`);
    
    // Em produção, registramos apenas o nome e mensagem do erro, sem stack trace
    if (erro) {
      console.error(`Tipo: ${erro.name}, Mensagem: ${erro.message}`);
    }
  }
}

/**
 * Log de API - detalhado para cron jobs
 */
function api(endpoint, mensagem, ...args) {
  const timestamp = new Date().toISOString();
  
  if (!isProduction || shouldShowDetailedLogs()) {
    console.log(`[API][${timestamp}] ${endpoint} - ${mensagem}`, ...args);
  } else {
    console.log(`[API][${timestamp}] ${endpoint}`);
  }
}

/**
 * Log específico para cron jobs - sempre detalhado
 */
function cron(mensagem, ...args) {
  const timestamp = new Date().toISOString();
  console.log(`[CRON][${timestamp}] ${mensagem}`, ...args);
}

// Exportar funções de log
export default {
  info,
  debug,
  warn,
  error,
  critical,
  api,
  cron,
  isProduction
}; 