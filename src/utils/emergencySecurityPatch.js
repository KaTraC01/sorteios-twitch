/**
 * PATCH DE SEGURANÇA EMERGENCIAL
 * ==============================
 * 
 * Proteção adicional contra vazamento de chaves de API
 * Bloqueia completamente logs que contenham informações críticas
 * 
 * @date 2025-09-21
 */

// Detectar se está em produção
const isProduction = process.env.NODE_ENV === 'production';
const isDev = process.env.NODE_ENV === 'development';

// Padrões críticos que NUNCA devem aparecer
const CRITICAL_PATTERNS = [
  /eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*/, // JWT
  /supabase/i,
  /anon/i,
  /service_role/i,
  /\.supabase\.co/i,
  /Bearer\s+/i,
  /Authorization/i,
  /x-client-info/i
];

/**
 * Verificar se conteúdo é crítico e deve ser bloqueado
 */
function isCriticalContent(content) {
  if (!content) return false;
  
  const str = typeof content === 'object' ? JSON.stringify(content) : String(content);
  return CRITICAL_PATTERNS.some(pattern => pattern.test(str));
}

/**
 * Interceptar e bloquear logs críticos
 */
function interceptCriticalLogs() {
  if (typeof window === 'undefined') return; // Apenas no browser
  
  // Salvar métodos originais
  const original = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
    table: console.table
  };
  
  // Função de verificação universal
  const checkAndBlock = (method, args) => {
    // Verificar cada argumento
    for (const arg of args) {
      if (isCriticalContent(arg)) {
        console.warn('🔒 Log bloqueado por conter informações sensíveis');
        return; // Bloquear completamente
      }
    }
    
    // Se passou na verificação, permitir (mas ainda aplicar outras regras)
    if (isProduction) {
      // Em produção, apenas erros importantes
      if (method === 'error') {
        original.error('Erro do sistema (detalhes omitidos por segurança)');
      }
      return;
    }
    
    // Em desenvolvimento, permitir mas com filtro
    original[method].apply(console, args);
  };
  
  // Sobrescrever todos os métodos
  console.log = (...args) => checkAndBlock('log', args);
  console.info = (...args) => checkAndBlock('info', args);
  console.warn = (...args) => checkAndBlock('warn', args);
  console.error = (...args) => checkAndBlock('error', args);
  console.debug = (...args) => checkAndBlock('debug', args);
  console.table = (data) => {
    if (isCriticalContent(data)) {
      console.warn('🔒 Tabela bloqueada por conter informações sensíveis');
      return;
    }
    if (!isProduction) {
      original.table(data);
    }
  };
}

// Aplicar interceptação imediatamente
interceptCriticalLogs();

// Proteger contra reload/bypass
if (typeof window !== 'undefined') {
  // Interceptar tentativas de acessar console diretamente
  Object.defineProperty(window, 'console', {
    get() {
      return {
        log: (...args) => args.some(isCriticalContent) ? null : (isProduction ? null : console.log(...args)),
        info: (...args) => args.some(isCriticalContent) ? null : (isProduction ? null : console.info(...args)),
        warn: (...args) => args.some(isCriticalContent) ? null : console.warn(isProduction ? 'Sistema: Aviso' : ...args),
        error: (...args) => args.some(isCriticalContent) ? console.error('Erro do sistema (detalhes omitidos)') : console.error(...args),
        debug: (...args) => args.some(isCriticalContent) ? null : (isProduction ? null : console.debug(...args)),
        table: (data) => isCriticalContent(data) ? null : (isProduction ? null : console.table(data))
      };
    },
    configurable: false,
    enumerable: true
  });
}

export default {
  isCriticalContent,
  interceptCriticalLogs
};
