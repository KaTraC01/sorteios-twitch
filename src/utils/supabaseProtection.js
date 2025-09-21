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
    
    // Se é uma requisição para Supabase, não logar detalhes
    if (url && String(url).includes('supabase')) {
      // Executar a requisição normalmente mas sem logs
      return originalFetch.apply(this, args);
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
