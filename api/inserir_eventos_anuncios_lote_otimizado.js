import { getSupabaseServiceClient } from '../src/lib/supabaseManager';
import { checkRateLimit, recordAttempt } from '../src/middleware/rateLimiting';

// Usar cliente de serviço otimizado para inserção em lote
const supabase = getSupabaseServiceClient();

/**
 * API para inserir eventos de anúncios em lote com formato otimizado
 * Esta função recebe um payload otimizado com dados comuns separados
 * e eventos com nomes de campos abreviados para reduzir o tamanho do payload
 */
export default async function handler(req, res) {
  // Verificar se o método é POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // SEGURANÇA: Rate limiting para inserção de eventos
  const userIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  const rateLimitResult = await checkRateLimit(userIP, 'anuncio_track');
  
  if (!rateLimitResult.allowed) {
    return res.status(429).json({ 
      error: 'Rate limit excedido', 
      message: rateLimitResult.message,
      retryAfter: rateLimitResult.resetTime 
    });
  }
  
  try {
    // Extrair payload otimizado
    const payload = req.body;
    
    // Verificar se o payload tem a estrutura esperada
    if (!payload || !payload.comuns || !payload.eventos || !Array.isArray(payload.eventos)) {
      return res.status(400).json({ error: 'Formato de payload inválido' });
    }
    
    // Extrair dados comuns e eventos
    const { comuns, eventos } = payload;
    
    // Verificar se há eventos para processar
    if (eventos.length === 0) {
      return res.status(200).json({ success: true, message: 'Nenhum evento para processar' });
    }
    
    // Expandir os eventos abreviados para o formato completo
    const eventosExpandidos = eventos.map(evento => {
      // Mapear campos abreviados para nomes completos
      return {
        anuncio_id: evento.a_id,
        pagina: evento.p_id,
        tipo_evento: evento.t_e,
        tipo_anuncio: evento.t_a,
        tempo_exposto: evento.t_exp,
        timestamp: evento.ts,
        session_id: evento.s_id,
        // REMOVIDO: event_id (coluna não existe na tabela)
        dispositivo: evento.disp === 'm' ? 'mobile' : evento.disp === 'd' ? 'desktop' : evento.disp,
        processado: false // Sempre definir como não processado inicialmente
      };
    });
    
    // Sem verificação de duplicidade (event_id não existe na tabela)
    // Usar session_id + timestamp para deduplicação básica se necessário
    let eventosUnicos = eventosExpandidos;
    
    // Inserir eventos únicos na tabela
    const { data, error } = await supabase
      .from('eventos_anuncios')
      .insert(eventosUnicos);
    
    if (error) {
      console.error('Erro ao inserir eventos otimizados:', error);
      
      // Tentar inserir via função RPC como fallback
      try {
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('inserir_eventos_anuncios_lote', {
            eventos: eventosUnicos
          });
        
        if (rpcError) {
          throw rpcError;
        }
        
        return res.status(200).json({ 
          success: true, 
          message: 'Eventos inseridos com sucesso via RPC',
          count: eventosUnicos.length
        });
      } catch (rpcError) {
        return res.status(500).json({ 
          error: 'Erro ao inserir eventos', 
          details: rpcError.message,
          fallback: 'Falha no fallback RPC'
        });
      }
    }
    
    // Responder com sucesso
    return res.status(200).json({ 
      success: true, 
      message: 'Eventos inseridos com sucesso',
      count: eventosUnicos.length
    });
    
  } catch (error) {
    console.error('Erro ao processar eventos otimizados:', error);
    return res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
} 