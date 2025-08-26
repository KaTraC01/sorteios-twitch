import { getSupabaseServiceClient } from '../src/lib/supabaseManager';

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
        event_id: evento.e_id,
        dispositivo: evento.disp === 'm' ? 'mobile' : evento.disp === 'd' ? 'desktop' : evento.disp,
        // Adicionar dados comuns
        navegador: comuns.navegador,
        idioma: comuns.idioma,
        plataforma: comuns.plataforma,
        processado: false // Sempre definir como não processado inicialmente
      };
    });
    
    // Novo: Verificar eventos duplicados no banco de dados
    const eventIds = eventosExpandidos
      .filter(evento => evento.event_id) // Filtrar apenas eventos com ID
      .map(evento => evento.event_id);   // Extrair apenas os IDs
    
    let eventosUnicos = eventosExpandidos;
    
    // Se houver IDs para verificar
    if (eventIds.length > 0) {
      try {
        // Consultar eventos existentes com os mesmos IDs
        const { data: eventosExistentes } = await supabase
          .from('eventos_anuncios')
          .select('event_id')
          .in('event_id', eventIds);
        
        // Se encontrou eventos existentes
        if (eventosExistentes && eventosExistentes.length > 0) {
          // Criar um Set com os IDs existentes para verificação rápida
          const idsExistentes = new Set(eventosExistentes.map(e => e.event_id));
          
          // Filtrar apenas eventos que não existem no banco
          eventosUnicos = eventosExpandidos.filter(evento => 
            !evento.event_id || !idsExistentes.has(evento.event_id)
          );
          
          console.log(`[AdTracker API] Filtrados ${eventosExpandidos.length - eventosUnicos.length} eventos duplicados`);
        }
      } catch (error) {
        console.warn('[AdTracker API] Erro ao verificar duplicidade:', error);
        // Em caso de erro na verificação, continuar com todos os eventos
        // É melhor arriscar duplicidade do que perder eventos
      }
    }
    
    // Se todos os eventos forem duplicados, retornar sucesso
    if (eventosUnicos.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'Todos os eventos já existem no banco de dados',
        duplicados: eventosExpandidos.length,
        inseridos: 0
      });
    }
    
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
          count: eventosUnicos.length,
          duplicados: eventosExpandidos.length - eventosUnicos.length
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
      count: eventosUnicos.length,
      duplicados: eventosExpandidos.length - eventosUnicos.length
    });
    
  } catch (error) {
    console.error('Erro ao processar eventos otimizados:', error);
    return res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
} 