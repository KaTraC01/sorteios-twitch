/**
 * SANITIZADOR DE LOGS - REMOÇÃO DE INFORMAÇÕES SENSÍVEIS
 * ======================================================
 * 
 * Remove automaticamente dados sensíveis dos logs antes de salvá-los
 * Protege contra vazamento de credenciais e informações pessoais
 * 
 * @author Sistema de Segurança v1.0
 * @date 2025-01-15
 */

/**
 * Padrões de informações sensíveis para remover
 */
const SENSITIVE_PATTERNS = [
  // Tokens e chaves
  /(?:token|key|secret|password|pwd|pass)\s*[=:]\s*[\w\-._]+/gi,
  /bearer\s+[\w\-._]+/gi,
  /authorization:\s*[\w\-._\s]+/gi,
  
  // Chaves de API comuns
  /sk_[a-zA-Z0-9]{20,}/gi,
  /pk_[a-zA-Z0-9]{20,}/gi,
  /eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+/gi, // JWT tokens
  
  // URLs com credenciais
  /https?:\/\/[^@\s]+:[^@\s]+@[^\s]+/gi,
  
  // IPs privados (parcial)
  /(?:192\.168\.|10\.|172\.)[\d.]+/gi,
  
  // Emails (manter domínio, mascarar usuário)
  /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
  
  // CPF/CNPJ (Brasil)
  /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/gi,
  /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/gi,
  
  // Telefones
  /\(?[\d\s\-\+\(\)]{8,15}\)?/gi,
  
  // Supabase URLs e chaves
  /https:\/\/[a-zA-Z0-9]+\.supabase\.co/gi,
  /sb-[a-zA-Z0-9\-_]+/gi
];

/**
 * Substituições específicas para diferentes tipos de dados
 */
const REPLACEMENTS = {
  token: '***TOKEN***',
  key: '***KEY***',
  secret: '***SECRET***',
  password: '***PASSWORD***',
  bearer: 'Bearer ***TOKEN***',
  jwt: '***JWT***',
  url_with_creds: 'https://***:***@***',
  ip: '***.***.***',
  email: '***@domain.com',
  cpf: '***.***.***.***',
  cnpj: '**.***.***/****-**',
  phone: '(***) ***-****',
  supabase_url: 'https://***.supabase.co',
  supabase_key: 'sb-***'
};

/**
 * Sanitizar string removendo informações sensíveis
 * @param {string} text - Texto a ser sanitizado
 * @returns {string} Texto sanitizado
 */
export function sanitizeLogMessage(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let sanitized = text;

  // Aplicar padrões de sanitização
  SENSITIVE_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, (match) => {
      // Determinar tipo de substituição baseado no conteúdo
      const lowerMatch = match.toLowerCase();
      
      if (lowerMatch.includes('token')) return REPLACEMENTS.token;
      if (lowerMatch.includes('key')) return REPLACEMENTS.key;
      if (lowerMatch.includes('secret')) return REPLACEMENTS.secret;
      if (lowerMatch.includes('password')) return REPLACEMENTS.password;
      if (lowerMatch.includes('bearer')) return REPLACEMENTS.bearer;
      if (lowerMatch.includes('eyj')) return REPLACEMENTS.jwt;
      if (lowerMatch.includes('://') && lowerMatch.includes('@')) return REPLACEMENTS.url_with_creds;
      if (lowerMatch.includes('supabase.co')) return REPLACEMENTS.supabase_url;
      if (lowerMatch.includes('sb-')) return REPLACEMENTS.supabase_key;
      if (/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/.test(match)) return REPLACEMENTS.cpf;
      if (/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/.test(match)) return REPLACEMENTS.cnpj;
      if (/@/.test(match)) return REPLACEMENTS.email;
      if (/^\d+\./.test(match)) return REPLACEMENTS.ip;
      
      return '***SENSITIVE***';
    });
  });

  return sanitized;
}

/**
 * Sanitizar objeto recursivamente
 * @param {any} obj - Objeto a ser sanitizado
 * @param {number} depth - Profundidade atual (para evitar recursão infinita)
 * @returns {any} Objeto sanitizado
 */
export function sanitizeLogObject(obj, depth = 0) {
  if (depth > 5) return '[TOO_DEEP]'; // Evitar recursão infinita
  
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeLogMessage(obj);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeLogObject(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Chaves que devem ser sempre mascaradas
      const sensitiveKeys = ['password', 'token', 'key', 'secret', 'authorization', 'auth'];
      const isSensitiveKey = sensitiveKeys.some(sk => key.toLowerCase().includes(sk));
      
      if (isSensitiveKey) {
        sanitized[key] = '***MASKED***';
      } else {
        sanitized[key] = sanitizeLogObject(value, depth + 1);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Wrapper para logger que sanitiza automaticamente
 * @param {Function} originalLogger - Função de log original
 * @returns {Function} Função de log sanitizada
 */
export function createSanitizedLogger(originalLogger) {
  return (...args) => {
    const sanitizedArgs = args.map(arg => sanitizeLogObject(arg));
    return originalLogger(...sanitizedArgs);
  };
}

/**
 * Sanitizar dados antes de salvar no banco
 * @param {string} description - Descrição do log
 * @param {Object} data - Dados adicionais (opcional)
 * @returns {Object} Dados sanitizados
 */
export function sanitizeForDatabase(description, data = null) {
  return {
    description: sanitizeLogMessage(description),
    data: data ? sanitizeLogObject(data) : null,
    timestamp: new Date().toISOString()
  };
}

/**
 * Verificar se uma string contém informações sensíveis
 * @param {string} text - Texto a verificar
 * @returns {boolean} True se contém dados sensíveis
 */
export function containsSensitiveData(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }

  return SENSITIVE_PATTERNS.some(pattern => pattern.test(text));
}

export default {
  sanitizeLogMessage,
  sanitizeLogObject,
  createSanitizedLogger,
  sanitizeForDatabase,
  containsSensitiveData
};
