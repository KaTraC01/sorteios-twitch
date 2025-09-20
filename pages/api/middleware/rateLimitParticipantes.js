/**
 * MIDDLEWARE DE RATE LIMITING PARA PARTICIPANTES
 * =============================================
 * 
 * Sistema de verificação de rate limiting baseado em IP
 * para prevenir burla via abas anônimas do navegador
 * 
 * @author Sistema de Segurança v2.0
 * @date 2025-09-20
 */

import { createClient } from '@supabase/supabase-js';

// Inicializar cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Verificar rate limiting baseado em IP usando o sistema do Supabase
 * @param {Object} req - Request object do Express/Vercel
 * @param {string} identificadorIP - IP do usuário
 * @param {string} tipoOperacao - Tipo de operação (participante_add_individual ou lote)
 * @returns {Promise<Object>} Resultado da verificação
 */
export async function verificarRateLimitIP(req, identificadorIP, tipoOperacao = 'participante_add_individual') {
    try {
        console.log(`🔍 Verificando rate limit - IP: ${identificadorIP}, Tipo: ${tipoOperacao}`);
        
        // Chamar a função de verificação do Supabase
        const { data, error } = await supabase.rpc('verificar_rate_limiting_seguro', {
            identificador_param: identificadorIP,
            tipo_operacao_param: tipoOperacao
        });
        
        if (error) {
            console.error('❌ Erro ao verificar rate limit:', error);
            // Fail-safe: permitir em caso de erro do banco
            return { 
                permitido: true, 
                mensagem: 'Verificação com erro, prosseguindo...', 
                falha_segura: true 
            };
        }
        
        if (data) {
            console.log(`✅ Rate limit verificado:`, data);
            
            // Formatar resposta
            return {
                permitido: data.permitido,
                mensagem: data.mensagem,
                proximoPermitido: data.proximo_permitido,
                motivo: data.motivo,
                tentativasConsecutivas: data.tentativas_consecutivas
            };
        }
        
        // Fallback se não há dados
        return { 
            permitido: false, 
            mensagem: 'Erro na verificação, tente novamente' 
        };
        
    } catch (error) {
        console.error('❌ Erro crítico no rate limiting:', error);
        // Fail-safe: permitir em caso de erro crítico
        return { 
            permitido: true, 
            mensagem: 'Erro crítico, prosseguindo...', 
            falha_segura: true 
        };
    }
}

/**
 * Obter o IP real do usuário considerando proxies e load balancers
 * @param {Object} req - Request object
 * @returns {string} IP do usuário
 */
export function obterIPReal(req) {
    // Verificar headers em ordem de prioridade
    const ip = 
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers['x-real-ip'] ||
        req.headers['x-client-ip'] ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        req.ip ||
        'unknown';
    
    // Limpar possíveis prefixos IPv6
    const cleanIP = ip.replace(/^::ffff:/, '');
    
    console.log(`🌐 IP detectado: ${cleanIP}`);
    return cleanIP;
}

/**
 * Sanitizar entrada para evitar injection
 * @param {string} input - Entrada do usuário
 * @returns {string} Entrada sanitizada
 */
export function sanitizarEntrada(input) {
    if (typeof input !== 'string') return '';
    
    return input
        .trim()
        .slice(0, 100) // Limitar tamanho
        .replace(/[<>'"&]/g, '') // Remover caracteres perigosos
        .replace(/\s+/g, ' '); // Normalizar espaços
}

/**
 * Middleware Express/Vercel para verificação automática de rate limiting
 * @param {string} tipoOperacao - Tipo de operação padrão
 * @returns {Function} Middleware function
 */
export function criarMiddlewareRateLimit(tipoOperacao = 'participante_add_individual') {
    return async (req, res, next) => {
        try {
            const ip = obterIPReal(req);
            const tipo = req.body?.tipo || tipoOperacao;
            
            const resultado = await verificarRateLimitIP(req, ip, tipo);
            
            // Adicionar headers informativos
            res.setHeader('X-RateLimit-Type', tipo);
            res.setHeader('X-RateLimit-IP', ip.slice(0, 10) + '***'); // IP parcialmente mascarado
            
            if (!resultado.permitido && !resultado.falha_segura) {
                return res.status(429).json({
                    error: 'Rate limit excedido',
                    message: resultado.mensagem,
                    type: 'rate_limit_exceeded',
                    retryAfter: resultado.proximoPermitido
                });
            }
            
            // Anexar resultado à request para uso posterior
            req.rateLimitResult = resultado;
            
            if (next) next();
            
        } catch (error) {
            console.error('❌ Erro no middleware de rate limiting:', error);
            // Fail-safe: continuar em caso de erro
            if (next) next();
        }
    };
}

/**
 * Validar se o tipo de operação é válido
 * @param {string} tipo - Tipo de operação
 * @returns {boolean} Se é válido
 */
export function validarTipoOperacao(tipo) {
    const tiposValidos = ['participante_add_individual', 'lote'];
    return tiposValidos.includes(tipo);
}

/**
 * Obter informações detalhadas sobre o rate limiting para debug
 * @param {string} ip - IP do usuário
 * @param {string} tipo - Tipo de operação
 * @returns {Promise<Object>} Informações detalhadas
 */
export async function obterInfoRateLimit(ip, tipo) {
    try {
        const { data, error } = await supabase
            .from('secure_rate_control')
            .select('*')
            .eq('identificador', ip)
            .eq('tipo_operacao', tipo)
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (error) {
            console.error('Erro ao obter informações de rate limit:', error);
            return { erro: error.message };
        }
        
        return { historico: data || [] };
        
    } catch (error) {
        console.error('Erro crítico ao obter informações:', error);
        return { erro: error.message };
    }
}
