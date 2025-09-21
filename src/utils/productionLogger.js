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
export const logger = {
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

/**
 * Substituir console SEMPRE (não apenas em produção) para proteger informações sensíveis
 */
if (typeof window !== 'undefined') {
  // Salvar métodos originais
  const originalMethods = {
    log: console.log,
    info: console.info,
    debug: console.debug,
    warn: console.warn,
    error: console.error,
    table: console.table
  };
  
  // Função para filtrar argumentos sensíveis
  const filterSensitiveArgs = (args) => {
    return args.map(arg => {
      if (containsSensitiveInfo(arg)) {
        return sanitizeContent(arg);
      }
      return arg;
    });
  };
  
  // Sobrescrever métodos do console
  console.log = (...args) => {
    if (isProduction) return; // Silenciar completamente em produção
    const filteredArgs = filterSensitiveArgs(args);
    originalMethods.log.apply(console, filteredArgs);
  };
  
  console.info = (...args) => {
    if (isProduction) return; // Silenciar completamente em produção
    const filteredArgs = filterSensitiveArgs(args);
    originalMethods.info.apply(console, filteredArgs);
  };
  
  console.debug = (...args) => {
    if (isProduction) return; // Silenciar completamente em produção
    const filteredArgs = filterSensitiveArgs(args);
    originalMethods.debug.apply(console, filteredArgs);
  };
  
  console.warn = (...args) => {
    const filteredArgs = filterSensitiveArgs(args);
    if (isProduction) {
      originalMethods.warn('Sistema: Operação com aviso');
    } else {
      originalMethods.warn.apply(console, filteredArgs);
    }
  };
  
  console.error = (...args) => {
    // Manter erros mas filtrar informações sensíveis
    const filteredArgs = filterSensitiveArgs(args);
    originalMethods.error.apply(console, filteredArgs);
  };
  
  console.table = (data) => {
    if (isProduction) return; // Silenciar completamente em produção
    if (containsSensitiveInfo(data)) {
      const sanitized = sanitizeContent(data);
      originalMethods.table(sanitized);
    } else {
      originalMethods.table(data);
    }
  };
}

export default logger;
