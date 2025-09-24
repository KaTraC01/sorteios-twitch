/**
 * PRODUCTION LOGGER - SISTEMA DE LOG SEGURO
 * =========================================
 * 
 * Sistema que remove automaticamente logs detalhados em produção
 * Mantém apenas logs essenciais de erro
 * 
 * @date 2025-09-21
 */

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Logger seguro para produção
 */
const logger = {
  // Logs críticos - sempre mostrar
  error: (...args) => {
    console.error(...args);
  },
  
  // Logs de desenvolvimento - apenas em dev
  dev: (...args) => {
    if (isDevelopment) {
      console.log('[DEV]', ...args);
    }
  },
  
  // Logs de info - apenas em dev
  info: (...args) => {
    if (isDevelopment) {
      console.info('[INFO]', ...args);
    }
  },
  
  // Logs de debug - apenas em dev
  debug: (...args) => {
    if (isDevelopment) {
      console.debug('[DEBUG]', ...args);
    }
  },
  
  // Warnings importantes - sempre mostrar mas sem detalhes em prod
  warn: (...args) => {
    if (isProduction) {
      console.warn('Sistema: Operação com aviso');
    } else {
      console.warn('[WARN]', ...args);
    }
  },
  
  // Tabelas - apenas em dev
  table: (data) => {
    if (isDevelopment && console.table) {
      console.table(data);
    }
  },
  
  // Log de operação bem-sucedida - simplificado em prod
  success: (message, details = null) => {
    if (isProduction) {
      // Em produção: apenas confirmar sucesso sem detalhes
      if (message.includes('sucesso') || message.includes('✅')) {
        // Silencioso em produção
        return;
      }
    } else {
      console.log('✅', message, details || '');
    }
  }
};

/**
 * Lista de palavras sensíveis que nunca devem aparecer em logs
 */
const SENSITIVE_PATTERNS = [
  /key/i,
  /token/i,
  /secret/i,
  /password/i,
  /api.*key/i,
  /supabase.*key/i,
  /anon.*key/i,
  /service.*key/i,
  /bearer/i,
  /authorization/i,
  /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, // JWT tokens
  /sk_[a-zA-Z0-9_-]+/g, // Stripe secret keys
  /pk_[a-zA-Z0-9_-]+/g, // Stripe public keys
];

/**
 * Verificar se o conteúdo contém informações sensíveis
 */
function containsSensitiveInfo(content) {
  const contentStr = typeof content === 'object' ? JSON.stringify(content) : String(content);
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(contentStr));
}

/**
 * Sanitizar conteúdo removendo informações sensíveis
 */
function sanitizeContent(content) {
  if (typeof content === 'object') {
    const sanitized = JSON.parse(JSON.stringify(content));
    // Recursivamente sanitizar objetos
    return sanitizeObject(sanitized);
  }
  
  let sanitized = String(content);
  SENSITIVE_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[DADOS_SENSÍVEIS_REMOVIDOS]');
  });
  return sanitized;
}

/**
 * Sanitizar objeto recursivamente
 */
function sanitizeObject(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // Se a chave contém informação sensível, remover o valor
    if (SENSITIVE_PATTERNS.some(pattern => pattern.test(key))) {
      sanitized[key] = '[REMOVIDO_POR_SEGURANÇA]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else if (containsSensitiveInfo(value)) {
      sanitized[key] = '[DADOS_SENSÍVEIS_REMOVIDOS]';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// Proteção de console delegada para consoleProtection.js
// Este logger agora funciona apenas como interface para desenvolvimento

module.exports = { logger };
module.exports.default = logger;
