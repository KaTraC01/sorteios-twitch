import { getSupabaseServiceClient } from "../../src/lib/supabaseManager";
import { withErrorHandling, successResponse, errorResponse } from "../../src/utils/apiResponse";

const supabase = getSupabaseServiceClient();

async function handler(req, res) {
  try {
    // SEGURANÇA: Endpoint protegido - apenas com autenticação válida
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 404, 'Endpoint não encontrado');
    }
    
    const token = authHeader.split(' ')[1];
    if (token !== process.env.API_SECRET_KEY) {
      return errorResponse(res, 404, 'Endpoint não encontrado');
    }

    // Rate limiting para teste de conexão
    const userIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    const rateLimitKey = `test_supabase_${userIP}`;
    
    try {
      const { data: rateCheck } = await supabase
        .from('secure_rate_control')
        .select('*')
        .eq('identificador', rateLimitKey)
        .eq('tipo_operacao', 'test_connection')
        .gte('timestamp_operacao', new Date(Date.now() - 300000).toISOString()) // últimos 5 minutos
        .single();
        
      if (rateCheck && rateCheck.tentativas_consecutivas >= 3) {
        return errorResponse(res, 429, 'Rate limit excedido', 'Máximo 3 testes por 5 minutos.');
      }
    } catch (error) {
      // Ignorar erro se não encontrar registro
    }

    // Registrar tentativa
    await supabase.from('secure_rate_control').upsert({
      identificador: rateLimitKey,
      tipo_operacao: 'test_connection',
      timestamp_operacao: new Date().toISOString(),
      tentativas_consecutivas: 1,
      metadados_operacao: { 
        endpoint: '/api/test-supabase',
        user_agent: req.headers['user-agent']
      }
    }, { onConflict: 'identificador,tipo_operacao' });

    // Teste de conexão simples e seguro
    const { data, error } = await supabase
      .from('configuracoes')
      .select('chave')
      .limit(1);

    if (error) {
      return errorResponse(res, 500, 'Erro na conexão', 'Falha ao conectar com Supabase');
    }

    return successResponse(res, 'Conexão Supabase funcionando', {
      status: 'ok',
      timestamp: new Date().toISOString(),
      records_found: data?.length || 0
    });

  } catch (error) {
    return errorResponse(res, 500, 'Erro interno', 'Falha no teste de conexão');
  }
}

export default withErrorHandling(handler);
