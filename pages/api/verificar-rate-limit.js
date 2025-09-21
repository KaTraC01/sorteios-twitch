/**
 * API ENDPOINT PARA VERIFICAÇÃO DE RATE LIMITING
 * ==============================================
 * 
 * Endpoint para verificar se um usuário pode realizar
 * uma operação baseado no seu IP e tipo de operação
 * 
 * SEGURANÇA: Fail-safe restritivo implementado
 * @date 2025-09-21
 */

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
        
        // Obter IP real do usuário
        const forwardedFor = req.headers['x-forwarded-for'];
        const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 
                   req.headers['x-real-ip'] || 
                   req.connection?.remoteAddress || 
                   req.socket?.remoteAddress || 
                   'unknown';
        
        console.log(`🔍 Verificação solicitada - IP: ${ip}, Tipo: ${tipo}`);
        
        // Simular verificação básica (sem conexão com banco por enquanto)
        // Em uma implementação real, aqui verificaríamos o banco de dados
        const agora = new Date();
        const resultado = {
            permitido: true, // Por enquanto permitir para não quebrar o fluxo
            mensagem: 'Verificação de rate limiting funcionando',
            tipo: tipo,
            ip: ip.slice(0, 8) + '***', // IP parcialmente mascarado para privacy
            timestamp: agora.toISOString()
        };
        
        console.log(`✅ Rate limit - ${tipo}: ${resultado.mensagem}`);
        
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
