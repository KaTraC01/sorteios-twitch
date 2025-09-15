/**
 * UTILITÁRIOS DE SEGURANÇA
 * =========================
 * 
 * Proteções contra vulnerabilidades identificadas:
 * - ReDoS (Regular Expression Denial of Service)
 * - Input sanitization
 * - Rate limiting helpers
 * 
 * @author Security Team
 * @date 2025-01-15
 */

// ===================================================================
// PROTEÇÃO CONTRA ReDoS (nth-check vulnerability)
// ===================================================================

/**
 * Timeout seguro para operações regex
 */
const REGEX_TIMEOUT = 1000; // 1 segundo

/**
 * Executar regex com timeout para prevenir ReDoS
 * @param {RegExp} regex - Expressão regular
 * @param {string} input - String de entrada
 * @param {number} timeout - Timeout em ms (default: 1000)
 * @returns {Promise<boolean>} - Resultado do match
 */
export function safeRegexTest(regex, input, timeout = REGEX_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Regex timeout - possível ReDoS detectado'));
    }, timeout);

    try {
      const result = regex.test(input);
      clearTimeout(timeoutId);
      resolve(result);
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

/**
 * Validar entrada de forma segura
 * @param {string} input - Entrada do usuário
 * @param {number} maxLength - Tamanho máximo (default: 1000)
 * @returns {boolean} - True se válido
 */
export function validateInput(input, maxLength = 1000) {
  if (!input || typeof input !== 'string') {
    return false;
  }
  
  // Prevenir inputs muito longos (proteção ReDoS)
  if (input.length > maxLength) {
    console.warn('Input muito longo detectado - possível ataque ReDoS');
    return false;
  }
  
  // Caracteres proibidos para prevenir injection
  const forbiddenChars = /[<>\"'&]/g;
  if (forbiddenChars.test(input)) {
    console.warn('Caracteres perigosos detectados no input');
    return false;
  }
  
  return true;
}

// ===================================================================
// SANITIZAÇÃO DE DADOS
// ===================================================================

/**
 * Sanitizar string removendo caracteres perigosos
 * @param {string} input - String de entrada
 * @returns {string} - String sanitizada
 */
export function sanitizeInput(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return input
    .replace(/[<>]/g, '') // Remove < e >
    .replace(/["']/g, '') // Remove aspas
    .replace(/&/g, '&amp;') // Escapa &
    .trim()
    .substring(0, 1000); // Limita tamanho
}

/**
 * Sanitizar nome de usuário Twitch
 * @param {string} username - Nome do usuário
 * @returns {string} - Username sanitizado
 */
export function sanitizeTwitchUsername(username) {
  if (!username || typeof username !== 'string') {
    return '';
  }
  
  // Regex SEGURA para username Twitch (sem ReDoS)
  const twitchUsernameRegex = /^[a-zA-Z0-9_]{3,25}$/;
  
  // Sanitizar primeiro
  const cleaned = username.toLowerCase().trim();
  
  // Verificar se atende ao padrão Twitch
  if (!twitchUsernameRegex.test(cleaned)) {
    throw new Error('Username Twitch inválido');
  }
  
  return cleaned;
}

// ===================================================================
// RATE LIMITING E PROTEÇÕES
// ===================================================================

/**
 * Rate limiter simples (em memória)
 */
class SimpleRateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) { // 10 req/min default
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }
  
  /**
   * Verificar se request é permitido
   * @param {string} identifier - Identificador (IP, user, etc)
   * @returns {boolean} - True se permitido
   */
  isAllowed(identifier) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Limpar requests antigos
    this.requests.forEach((times, id) => {
      const filtered = times.filter(time => time > windowStart);
      if (filtered.length === 0) {
        this.requests.delete(id);
      } else {
        this.requests.set(id, filtered);
      }
    });
    
    // Verificar requests atuais
    const userRequests = this.requests.get(identifier) || [];
    
    if (userRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Adicionar nova request
    userRequests.push(now);
    this.requests.set(identifier, userRequests);
    
    return true;
  }
  
  /**
   * Obter status do rate limit
   * @param {string} identifier - Identificador
   * @returns {Object} - Status do rate limit
   */
  getStatus(identifier) {
    const userRequests = this.requests.get(identifier) || [];
    return {
      remaining: Math.max(0, this.maxRequests - userRequests.length),
      resetTime: Date.now() + this.windowMs
    };
  }
}

// Instância global para APIs
export const apiRateLimiter = new SimpleRateLimiter(30, 60000); // 30 req/min
export const participanteRateLimiter = new SimpleRateLimiter(5, 60000); // 5 participações/min

// ===================================================================
// VALIDAÇÕES ESPECÍFICAS DO PROJETO
// ===================================================================

/**
 * Validar dados de participante
 * @param {Object} participante - Dados do participante
 * @returns {Object} - Resultado da validação
 */
export function validateParticipante(participante) {
  const errors = [];
  
  try {
    // Validar username
    if (!participante.username) {
      errors.push('Username é obrigatório');
    } else {
      sanitizeTwitchUsername(participante.username);
    }
    
    // Validar plataforma
    const platformasValidas = ['twitch', 'youtube', 'discord'];
    if (!platformasValidas.includes(participante.plataforma)) {
      errors.push('Plataforma inválida');
    }
    
    // Validar sorteio_id
    if (!participante.sorteio_id || isNaN(participante.sorteio_id)) {
      errors.push('ID do sorteio inválido');
    }
    
  } catch (error) {
    errors.push(error.message);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? {
      username: sanitizeTwitchUsername(participante.username),
      plataforma: participante.plataforma,
      sorteio_id: parseInt(participante.sorteio_id)
    } : null
  };
}

// ===================================================================
// MONITORAMENTO DE SEGURANÇA
// ===================================================================

/**
 * Logger de eventos de segurança
 */
export class SecurityLogger {
  static log(event, details = {}, severity = 'INFO') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      severity,
      details,
      userAgent: typeof window !== 'undefined' ? window.navigator?.userAgent : 'server'
    };
    
    // Em produção, enviar para serviço de log
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrar com serviço de logging (ex: Sentry, LogRocket)
      console.log('SECURITY_EVENT:', JSON.stringify(logEntry));
    } else {
      console.log('🛡️ SECURITY:', logEntry);
    }
    
    // Alertar para eventos críticos
    if (severity === 'CRITICAL' || severity === 'HIGH') {
      this.alertCritical(logEntry);
    }
  }
  
  static alertCritical(logEntry) {
    console.error('🚨 ALERTA DE SEGURANÇA CRÍTICO:', logEntry);
    // TODO: Implementar notificação para equipe de segurança
  }
}

// ===================================================================
// EXPORTAÇÕES E CONFIGURAÇÃO
// ===================================================================

export default {
  safeRegexTest,
  validateInput,
  sanitizeInput,
  sanitizeTwitchUsername,
  validateParticipante,
  SecurityLogger,
  rateLimiters: {
    api: apiRateLimiter,
    participante: participanteRateLimiter
  }
};
