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

/**
 * Log informativo - visível apenas em desenvolvimento
 */
function info(mensagem, ...args) {
  if (!isProduction) {
    console.log(`[INFO] ${mensagem}`, ...args);
  }
}

/**
 * Log de depuração - visível apenas em desenvolvimento
 */
function debug(mensagem, ...args) {
  if (!isProduction) {
    console.log(`[DEBUG] ${mensagem}`, ...args);
  }
}

/**
 * Log de aviso - simplificado em produção
 */
function warn(mensagem, ...args) {
  if (isProduction) {
    console.warn('[AVISO] Ocorreu um aviso na aplicação.');
  } else {
    console.warn(`[AVISO] ${mensagem}`, ...args);
  }
}

/**
 * Log de erro - simplificado em produção
 */
function error(mensagem, ...args) {
  if (isProduction) {
    console.error('[ERRO] Ocorreu um erro na aplicação.');
  } else {
    console.error(`[ERRO] ${mensagem}`, ...args);
  }
}

/**
 * Log de erro crítico - sempre visível, mas sanitizado em produção
 */
function critical(mensagem, erro = null) {
  if (isProduction) {
    console.error('[ERRO CRÍTICO] Ocorreu um erro crítico na aplicação.');
    
    // Em produção, registramos apenas o nome e mensagem do erro, sem stack trace
    if (erro) {
      console.error(`Tipo: ${erro.name}, Mensagem: ${erro.message}`);
    }
  } else {
    console.error(`[ERRO CRÍTICO] ${mensagem}`);
    
    // Em desenvolvimento, mostramos todos os detalhes
    if (erro) {
      console.error(erro);
    }
  }
}

/**
 * Log de API - para endpoints, simplificado em produção
 */
function api(endpoint, mensagem, ...args) {
  if (isProduction) {
    // Em produção, registramos apenas o endpoint sem detalhes
    console.log(`[API] ${endpoint}`);
  } else {
    console.log(`[API] ${endpoint} - ${mensagem}`, ...args);
  }
}

// Exportar funções de log
export default {
  info,
  debug,
  warn,
  error,
  critical,
  api,
  isProduction
}; 