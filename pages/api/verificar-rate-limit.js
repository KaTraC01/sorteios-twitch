/**
 * API ENDPOINT PARA VERIFICAÇÃO DE RATE LIMITING
 * ==============================================
 * 
 * Endpoint para verificar se um usuário pode realizar
 * uma operação baseado no seu IP e tipo de operação
 * 
 * @author Sistema de Segurança v2.0
 * @date 2025-09-20
 */

import { 
    verificarRateLimitIP, 
    obterIPReal, 
    validarTipoOperacao,
    obterInfoRateLimit 
} from './middleware/rateLimitParticipantes.js';

export default async function handler(req, res) {
    // Verificar método HTTP
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Método não permitido',
            message: 'Use POST para verificar rate limit' 
        });
    }
    
    try {
        // Extrair dados da requisição
        const { tipo, debug = false } = req.body;
        
        // Validar tipo de operação
        if (!tipo || !validarTipoOperacao(tipo)) {
            return res.status(400).json({
                error: 'Tipo de operação inválido',
                message: 'Tipos válidos: participante_add_individual, lote',
                tiposValidos: ['participante_add_individual', 'lote']
            });
        }
        
        // Obter IP real do usuário
        const ip = obterIPReal(req);
        
        if (ip === 'unknown') {
            console.warn('⚠️ IP não detectado, assumindo local');
        }
        
        console.log(`🔍 Verificação solicitada - IP: ${ip}, Tipo: ${tipo}`);
        
        // Verificar rate limiting
        const resultado = await verificarRateLimitIP(req, ip, tipo);
        
        // Preparar resposta base
        const resposta = {
            permitido: resultado.permitido,
            mensagem: resultado.mensagem,
            tipo: tipo,
            ip: ip.slice(0, 8) + '***', // IP parcialmente mascarado para privacy
            timestamp: new Date().toISOString()
        };
        
        // Adicionar informações extras se permitido
        if (resultado.proximoPermitido) {
            resposta.proximoPermitido = resultado.proximoPermitido;
        }
        
        if (resultado.tentativasConsecutivas !== undefined) {
            resposta.tentativasConsecutivas = resultado.tentativasConsecutivas;
        }
        
        if (resultado.motivo) {
            resposta.motivo = resultado.motivo;
        }
        
        // Adicionar informações de debug se solicitado
        if (debug && process.env.NODE_ENV === 'development') {
            try {
                const infoDebug = await obterInfoRateLimit(ip, tipo);
                resposta.debug = infoDebug;
            } catch (debugError) {
                console.warn('Erro ao obter debug info:', debugError);
            }
        }
        
        // Log da verificação
        console.log(`${resultado.permitido ? '✅' : '❌'} Rate limit - ${tipo}: ${resultado.mensagem}`);
        
        // Responder com status apropriado
        const statusCode = resultado.permitido ? 200 : 429;
        return res.status(statusCode).json(resposta);
        
    } catch (error) {
        console.error('❌ Erro no endpoint de verificação:', error);
        
        // Resposta de erro com fail-safe
        return res.status(500).json({
            error: 'Erro interno no servidor',
            message: 'Erro ao verificar rate limit, tente novamente',
            permitido: true, // Fail-safe: permitir em caso de erro
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
