/**
 * PROTEÇÃO ESPECÍFICA PARA SUPABASE
 * =================================
 * 
 * Intercepta e bloqueia especificamente objetos do Supabase
 * que podem conter chaves de API
 * 
 * @date 2025-09-21
 */

// Interceptar fetch para requests do Supabase
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  
  window.fetch = async function(...args) {
    const [url, options] = args;
    
    // Se é uma requisição para Supabase, interceptar e bloquear logs
    if (url && (String(url).includes('supabase') || String(url).includes('nsqiytflqwlyqhdmueki'))) {
      // Bloquear qualquer log que contenha a URL
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      const originalConsoleWarn = console.warn;
      
      console.log = (...args) => {
        if (args.some(arg => String(arg).includes(url))) return;
        originalConsoleLog.apply(console, args);
      };
      
      console.error = (...args) => {
        if (args.some(arg => String(arg).includes(url))) {
          originalConsoleError('🔒 Erro de requisição (URL bloqueada por segurança)');
          return;
        }
        originalConsoleError.apply(console, args);
      };
      
      console.warn = (...args) => {
        if (args.some(arg => String(arg).includes(url))) {
          originalConsoleWarn('🔒 Aviso de requisição (URL bloqueada por segurança)');
          return;
        }
        originalConsoleWarn.apply(console, args);
      };
      
      // Executar a requisição
      const result = await originalFetch.apply(this, args);
      
      // Restaurar console
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      
      return result;
    }
    
    return originalFetch.apply(this, args);
  };
  
  // Interceptar JSON.stringify para bloquear serialização de objetos com chaves
  const originalStringify = JSON.stringify;
  JSON.stringify = function(value, replacer, space) {
    if (value && typeof value === 'object') {
      // Verificar se o objeto contém propriedades suspeitas
      const keys = Object.keys(value);
      const suspiciousKeys = ['key', 'token', 'secret', 'authorization', 'supabaseKey', 'anonKey'];
      
      if (keys.some(key => suspiciousKeys.some(sus => key.toLowerCase().includes(sus)))) {
        // Retornar versão sanitizada
        const sanitized = {};
        for (const [k, v] of Object.entries(value)) {
          if (suspiciousKeys.some(sus => k.toLowerCase().includes(sus))) {
            sanitized[k] = '[REMOVIDO_POR_SEGURANÇA]';
          } else {
            sanitized[k] = v;
          }
        }
        return originalStringify.call(this, sanitized, replacer, space);
      }
    }
    
    return originalStringify.call(this, value, replacer, space);
  };
  
  // Proteção contra console.table com objetos do Supabase
  const originalConsoleTable = console.table;
  if (originalConsoleTable) {
    console.table = function(data) {
      if (data && typeof data === 'object') {
        // Verificar se contém dados sensíveis
        const str = JSON.stringify(data);
        if (str.includes('supabase') || str.includes('eyJ') || str.includes('key')) {
          console.warn('🔒 Tabela bloqueada: contém dados sensíveis do Supabase');
          return;
        }
      }
      originalConsoleTable.apply(this, arguments);
    };
  }
}

export default {};
