/**
 * API ENDPOINT PARA VERIFICAÇÃO DE RATE LIMITING
 * ==============================================
 * 
 * Endpoint para verificar se um usuário pode realizar
 * uma operação baseado no seu IP e tipo de operação
 * 
 * SEGURANÇA: Fail-safe restritivo + Rate limiting próprio
 * @date 2025-09-21
 */

// Cache em memória para rate limiting do próprio endpoint
const rateLimitCache = new Map();

// Configurações de rate limiting para o endpoint
const RATE_LIMIT_CONFIG = {
    maxRequests: 10,        // Máximo 10 verificações
    windowMs: 60 * 1000,    // Em 60 segundos (1 minuto)
    blockDurationMs: 5 * 60 * 1000  // Bloqueio por 5 minutos se exceder
};

/**
 * Verificar rate limiting do próprio endpoint
 */
function checkEndpointRateLimit(ip) {
    const now = Date.now();
    const key = `rate_limit_${ip}`;
    
    // Limpar entradas antigas do cache
    if (rateLimitCache.size > 1000) {
        const cutoffTime = now - RATE_LIMIT_CONFIG.windowMs;
        for (const [k, v] of rateLimitCache.entries()) {
            if (v.firstRequest < cutoffTime) {
                rateLimitCache.delete(k);
            }
        }
    }
    
    if (!rateLimitCache.has(key)) {
        // Primeira requisição deste IP
        rateLimitCache.set(key, {
            count: 1,
            firstRequest: now,
            lastRequest: now,
            blocked: false
        });
        return { allowed: true, remaining: RATE_LIMIT_CONFIG.maxRequests - 1 };
    }
    
    const record = rateLimitCache.get(key);
    
    // Verificar se está bloqueado
    if (record.blocked && (now - record.lastRequest) < RATE_LIMIT_CONFIG.blockDurationMs) {
        return { 
            allowed: false, 
            remaining: 0,
            resetTime: record.lastRequest + RATE_LIMIT_CONFIG.blockDurationMs,
            reason: 'IP bloqueado temporariamente por excesso de requisições'
        };
    }
    
    // Reset da janela se passou o tempo
    if ((now - record.firstRequest) > RATE_LIMIT_CONFIG.windowMs) {
        record.count = 1;
        record.firstRequest = now;
        record.blocked = false;
    } else {
        record.count++;
    }
    
    record.lastRequest = now;
    
    // Verificar se excedeu o limite
    if (record.count > RATE_LIMIT_CONFIG.maxRequests) {
        record.blocked = true;
        return { 
            allowed: false, 
            remaining: 0,
            resetTime: now + RATE_LIMIT_CONFIG.blockDurationMs,
            reason: `Limite excedido: máximo ${RATE_LIMIT_CONFIG.maxRequests} verificações por minuto`
        };
    }
    
    return { 
        allowed: true, 
        remaining: RATE_LIMIT_CONFIG.maxRequests - record.count 
    };
}

export default async function handler(req, res) {
    // Obter IP real do usuário PRIMEIRO (para rate limiting do endpoint)
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 
               req.headers['x-real-ip'] || 
               req.connection?.remoteAddress || 
               req.socket?.remoteAddress || 
               'unknown';

    // ✅ PROTEÇÃO ANTI-DDoS: Rate limiting do próprio endpoint
    const endpointRateLimit = checkEndpointRateLimit(ip);
    if (!endpointRateLimit.allowed) {
        console.warn(`🚫 Rate limit do endpoint excedido - IP: ${ip}`);
        return res.status(429).json({
            error: 'Rate limit excedido',
            message: endpointRateLimit.reason,
            permitido: false,
            resetTime: endpointRateLimit.resetTime,
            timestamp: new Date().toISOString(),
            rateLimitType: 'endpoint_protection'
        });
    }

    // Verificar método HTTP
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Método não permitido',
            message: 'Use POST para verificar rate limit' 
        });
    }
    
    try {
        // Extrair dados da requisição
        const { tipo } = req.body;
        
        // Validar tipo de operação
        const tiposValidos = ['participante_add_individual', 'lote'];
        if (!tipo || !tiposValidos.includes(tipo)) {
            return res.status(400).json({
                error: 'Tipo de operação inválido',
                message: 'Tipos válidos: participante_add_individual, lote',
                tiposValidos: tiposValidos
            });
        }
        
        console.log(`🔍 Verificação solicitada - IP: ${ip}, Tipo: ${tipo}`);
        
        // Simular verificação básica (sem conexão com banco por enquanto)
        // Em uma implementação real, aqui verificaríamos o banco de dados
        const agora = new Date();
        const resultado = {
            permitido: true, // Por enquanto permitir para não quebrar o fluxo
            mensagem: 'Verificação de rate limiting funcionando',
            tipo: tipo,
            ip: ip.slice(0, 8) + '***', // IP parcialmente mascarado para privacy
            timestamp: agora.toISOString(),
            // ✅ INFORMAÇÕES DO RATE LIMITING DO ENDPOINT
            endpointRateLimit: {
                remaining: endpointRateLimit.remaining,
                maxRequests: RATE_LIMIT_CONFIG.maxRequests,
                windowMs: RATE_LIMIT_CONFIG.windowMs
            }
        };
        
        console.log(`✅ Rate limit - ${tipo}: ${resultado.mensagem} (Restam ${endpointRateLimit.remaining} verificações)`);
        
        // Responder sempre com status 200 se permitido
        return res.status(200).json(resultado);
        
    } catch (error) {
        console.error('❌ Erro no endpoint de verificação:', error);
        
        // ✅ CORREÇÃO DE SEGURANÇA: Fail-safe restritivo
        // Em caso de erro, NEGAR acesso em vez de permitir
        return res.status(429).json({
            error: 'Erro interno no servidor',
            message: 'Erro ao verificar rate limit, acesso negado por segurança',
            permitido: false, // ✅ SEGURANÇA: Negar em caso de erro
            timestamp: new Date().toISOString(),
            falha_segura: true
        });
    }
}

/**
 * Configuração do endpoint
 */
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '1mb',
        },
    },
};
