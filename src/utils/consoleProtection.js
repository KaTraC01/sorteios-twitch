/**
 * PROTEÇÃO CRÍTICA DO CONSOLE
 * ===========================
 * 
 * Bloqueia completamente logs que contenham informações sensíveis
 * Solução simples e eficaz sem recursão
 * 
 * @date 2025-09-21
 */

// Detectar ambiente
const isProduction = process.env.NODE_ENV === 'production';

// Palavras críticas que devem ser bloqueadas
const CRITICAL_KEYWORDS = [
  'key', 'token', 'secret', 'password', 'authorization', 'bearer',
  'supabase', 'anon', 'service_role', 'api_key', 'jwt', 'eyJ'
];

/**
 * Verificar se o texto contém informações sensíveis
 */
function containsSecrets(text) {
  if (!text) return false;
  const str = String(text).toLowerCase();
  return CRITICAL_KEYWORDS.some(keyword => str.includes(keyword));
}

/**
 * Verificar argumentos de log
 */
function checkLogArgs(args) {
  for (const arg of args) {
    if (containsSecrets(arg)) return true;
    if (typeof arg === 'object' && arg !== null) {
      if (containsSecrets(JSON.stringify(arg))) return true;
    }
  }
  return false;
}

/**
 * Aplicar proteção apenas se estamos no browser
 */
if (typeof window !== 'undefined') {
  // Salvar métodos originais uma única vez
  const originalConsole = {
    log: window.console.log,
    info: window.console.info,
    warn: window.console.warn,
    error: window.console.error,
    debug: window.console.debug,
    table: window.console.table
  };

  // Substituir métodos do console
  window.console.log = function(...args) {
    if (checkLogArgs(args)) {
      originalConsole.warn('🔒 Log bloqueado: contém informações sensíveis');
      return;
    }
    if (!isProduction) {
      originalConsole.log.apply(this, args);
    }
  };

  window.console.info = function(...args) {
    if (checkLogArgs(args)) {
      originalConsole.warn('🔒 Info bloqueado: contém informações sensíveis');
      return;
    }
    if (!isProduction) {
      originalConsole.info.apply(this, args);
    }
  };

  window.console.warn = function(...args) {
    if (checkLogArgs(args)) {
      originalConsole.warn('🔒 Warning bloqueado: contém informações sensíveis');
      return;
    }
    originalConsole.warn.apply(this, args);
  };

  window.console.error = function(...args) {
    if (checkLogArgs(args)) {
      originalConsole.error('🔒 Erro bloqueado: contém informações sensíveis');
      return;
    }
    originalConsole.error.apply(this, args);
  };

  window.console.debug = function(...args) {
    if (checkLogArgs(args)) {
      originalConsole.warn('🔒 Debug bloqueado: contém informações sensíveis');
      return;
    }
    if (!isProduction) {
      originalConsole.debug.apply(this, args);
    }
  };

  window.console.table = function(data) {
    if (containsSecrets(data) || containsSecrets(JSON.stringify(data))) {
      originalConsole.warn('🔒 Tabela bloqueada: contém informações sensíveis');
      return;
    }
    if (!isProduction) {
      originalConsole.table.apply(this, [data]);
    }
  };

  // Proteção adicional contra acesso direto
  try {
    Object.defineProperty(window, 'console', {
      value: window.console,
      writable: false,
      configurable: false
    });
  } catch (e) {
    // Falha silenciosa se não conseguir redefinir
  }
}

export default {
  containsSecrets,
  checkLogArgs
};
