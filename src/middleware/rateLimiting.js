/**
 * MIDDLEWARE DE RATE LIMITING GLOBAL
 * ==================================
 * 
 * Sistema de rate limiting seguro e configurável
 * Protege contra ataques de DoS e spam
 * 
 * @author Sistema de Segurança v1.0
 * @date 2025-01-15
 */

import { getSupabaseServiceClient } from '../lib/supabaseManager';

const supabase = getSupabaseServiceClient();

/**
 * Configurações de rate limiting por tipo de operação
 */
const RATE_LIMITS = {
  api_call: { maxRequests: 60, windowMs: 60000 }, // 60 req/min
  debug_endpoint: { maxRequests: 5, windowMs: 60000 }, // 5 req/min
  test_connection: { maxRequests: 3, windowMs: 300000 }, // 3 req/5min
  sorteio_request: { maxRequests: 10, windowMs: 60000 }, // 10 req/min
  participante_add: { maxRequests: 30, windowMs: 60000 }, // 30 req/min
  anuncio_track: { maxRequests: 100, windowMs: 60000 } // 100 req/min
};

/**
 * Obter identificador único do usuário
 * @param {Object} req - Request object
 * @returns {string} Identificador único
 */
function getUserIdentifier(req) {
  const ip = req.headers['x-forwarded-for'] || 
             req.headers['x-real-ip'] || 
             req.connection.remoteAddress || 
             req.socket.remoteAddress || 
             'unknown';
  
  // Usar apenas o primeiro IP se houver múltiplos
  return ip.split(',')[0].trim();
}

/**
 * Verificar rate limit para uma operação
 * @param {string} identifier - Identificador do usuário
 * @param {string} operationType - Tipo de operação
 * @param {Object} customLimits - Limites personalizados (opcional)
 * @returns {Promise<Object>} Resultado da verificação
 */
export async function checkRateLimit(identifier, operationType, customLimits = null) {
  try {
    const limits = customLimits || RATE_LIMITS[operationType] || RATE_LIMITS.api_call;
    const windowStart = new Date(Date.now() - limits.windowMs);
    
    // Verificar tentativas recentes
    const { data: recentAttempts, error } = await supabase
      .from('secure_rate_control')
      .select('*')
      .eq('identificador', identifier)
      .eq('tipo_operacao', operationType)
      .gte('timestamp_operacao', windowStart.toISOString())
      .order('timestamp_operacao', { ascending: false });

    if (error) {
      console.warn('Erro ao verificar rate limit:', error);
      // Em caso de erro, permitir (fail-open para não quebrar o sistema)
      return { allowed: true, remaining: limits.maxRequests };
    }

    const attemptCount = recentAttempts?.length || 0;
    const allowed = attemptCount < limits.maxRequests;
    const remaining = Math.max(0, limits.maxRequests - attemptCount);

    // Se ultrapassou o limite, verificar se deve bloquear
    if (!allowed) {
      const firstAttempt = recentAttempts[recentAttempts.length - 1];
      const blockUntil = new Date(Date.parse(firstAttempt.timestamp_operacao) + limits.windowMs);
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: blockUntil,
        message: `Rate limit excedido. Tente novamente em ${Math.ceil((blockUntil - new Date()) / 1000)} segundos.`
      };
    }

    return { allowed: true, remaining, resetTime: new Date(Date.now() + limits.windowMs) };

  } catch (error) {
    console.error('Erro crítico no rate limiting:', error);
    // Fail-open: permitir em caso de erro crítico
    return { allowed: true, remaining: 999 };
  }
}

/**
 * Registrar tentativa de acesso
 * @param {string} identifier - Identificador do usuário
 * @param {string} operationType - Tipo de operação
 * @param {Object} metadata - Metadados adicionais
 * @returns {Promise<boolean>} Sucesso do registro
 */
export async function recordAttempt(identifier, operationType, metadata = {}) {
  try {
    const { error } = await supabase
      .from('secure_rate_control')
      .insert({
        identificador: identifier,
        tipo_operacao: operationType,
        timestamp_operacao: new Date().toISOString(),
        tentativas_consecutivas: 1,
        metadados_operacao: {
          ...metadata,
          timestamp: new Date().toISOString()
        }
      });

    if (error) {
      console.warn('Erro ao registrar tentativa:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro crítico ao registrar tentativa:', error);
    return false;
  }
}

/**
 * Middleware de rate limiting para Express/Vercel
 * @param {string} operationType - Tipo de operação
 * @param {Object} customLimits - Limites personalizados
 * @returns {Function} Middleware function
 */
export function createRateLimitMiddleware(operationType = 'api_call', customLimits = null) {
  return async (req, res, next) => {
    try {
      const identifier = getUserIdentifier(req);
      const rateLimitResult = await checkRateLimit(identifier, operationType, customLimits);

      // Adicionar headers de rate limiting
      res.setHeader('X-RateLimit-Limit', customLimits?.maxRequests || RATE_LIMITS[operationType]?.maxRequests || 60);
      res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
      
      if (rateLimitResult.resetTime) {
        res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimitResult.resetTime.getTime() / 1000));
      }

      if (!rateLimitResult.allowed) {
        res.setHeader('Retry-After', Math.ceil((rateLimitResult.resetTime - new Date()) / 1000));
        return res.status(429).json({
          error: 'Rate limit excedido',
          message: rateLimitResult.message,
          retryAfter: rateLimitResult.resetTime
        });
      }

      // Registrar tentativa válida
      await recordAttempt(identifier, operationType, {
        endpoint: req.url,
        method: req.method,
        userAgent: req.headers['user-agent']
      });

      // Continuar para o próximo middleware
      if (next) next();
      
    } catch (error) {
      console.error('Erro no middleware de rate limiting:', error);
      // Em caso de erro, permitir passagem para não quebrar a aplicação
      if (next) next();
    }
  };
}

/**
 * Limpeza automática de registros antigos
 * @param {number} daysToKeep - Dias para manter registros
 * @returns {Promise<boolean>} Sucesso da limpeza
 */
export async function cleanupOldRecords(daysToKeep = 7) {
  try {
    const cutoffDate = new Date(Date.now() - (daysToKeep * 24 * 60 * 60 * 1000));
    
    const { error } = await supabase
      .from('secure_rate_control')
      .delete()
      .lt('timestamp_operacao', cutoffDate.toISOString());

    if (error) {
      console.warn('Erro na limpeza de registros antigos:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro crítico na limpeza:', error);
    return false;
  }
}

export default {
  checkRateLimit,
  recordAttempt,
  createRateLimitMiddleware,
  cleanupOldRecords,
  RATE_LIMITS
};
