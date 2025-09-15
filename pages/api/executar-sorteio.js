import { getSupabaseServiceClient, sanitizarEntrada } from "../../src/lib/supabaseManager";
import { checkRateLimit, recordAttempt } from "../../src/middleware/rateLimiting";

// Usar cliente de serviço para operações administrativas
const supabase = getSupabaseServiceClient();
import { withErrorHandling, successResponse, errorResponse } from "../../src/utils/apiResponse";

async function handler(req, res) {
  // Verificar se é uma chamada GET ou POST (aceita ambos)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return errorResponse(res, 405, 'Método não permitido', 'O método deve ser GET ou POST');
  }

  // SEGURANÇA: Rate limiting para execução de sorteios
  const userIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  const rateLimitResult = await checkRateLimit(userIP, 'sorteio_request');
  
  if (!rateLimitResult.allowed) {
    return errorResponse(res, 429, 'Rate limit excedido', rateLimitResult.message);
  }

  try {
    console.log('Executando sorteio com realizar_sorteio_seguro_v2...');
    
    // Chamar a nova função de sorteio corrigida no banco de dados
    const { data, error } = await supabase.rpc("realizar_sorteio_seguro_v2");
    
    if (error) {
      console.error('SORTEIO DEBUG: Erro ao executar sorteio:', error);
      
      // Se ocorreu um erro específico com a nova função, tentar com a função antiga como fallback
      try {
        console.log('SORTEIO DEBUG: Tentando função alternativa realizar_sorteio_automatico...');
        const { data: oldData, error: oldError } = await supabase.rpc("realizar_sorteio_automatico");
        
        if (oldError) {
          console.error('SORTEIO DEBUG: Erro com função alternativa:', oldError);
          return errorResponse(
            res, 
            500, 
            'Não foi possível realizar o sorteio', 
            `Erro em ambas as funções de sorteio. Último erro: ${oldError.message}`,
            { detalhes: 'Todas as funções de sorteio falharam' }
          );
        }
        
        console.log('SORTEIO DEBUG: Função alternativa executada com sucesso');
        return successResponse(res, 'Sorteio realizado com sucesso (método alternativo)', {
          resultado: oldData,
          metodo: "alternativo"
        });
      } catch (fallbackError) {
        console.error('SORTEIO DEBUG: Erro completo no fallback:', fallbackError);
        return errorResponse(
          res, 
          500, 
          'Falha no sorteio', 
          `Todos os métodos de sorteio falharam. Último erro: ${fallbackError.message}`
        );
      }
    }
    
    console.log('SORTEIO DEBUG: Sorteio realizado com sucesso', data);
    
    // Verificar se o sorteio foi bem-sucedido
    if (!data?.sucesso) {
      try {
        // Limpar participantes antigos (mais de 7 dias)
        try {
          const { error: errorLimpeza } = await supabase.rpc("limpar_historico_participantes_antigos");
          
          if (errorLimpeza) {
            console.warn('SORTEIO DEBUG: Erro ao limpar participantes antigos:', errorLimpeza);
          } else {
            console.log('SORTEIO DEBUG: Limpeza de participantes antigos concluída');
          }
        } catch (e) {
          console.warn('SORTEIO DEBUG: Erro ao limpar participantes antigos:', e);
        }
        
        // Validar participantes para evitar problemas futuros
        try {
          const { error: errorValidacao } = await supabase.rpc("validar_corrigir_participantes_ativos");
          
          if (errorValidacao) {
            console.warn('SORTEIO DEBUG: Erro ao validar participantes:', errorValidacao);
          } else {
            console.log('SORTEIO DEBUG: Validação de participantes concluída');
          }
        } catch (e) {
          console.warn('SORTEIO DEBUG: Erro ao validar participantes:', e);
        }
      } catch (e) {
        console.warn('SORTEIO DEBUG: Erro ao processar atualizações adicionais:', e);
      }
    }
    
    // Retornar o resultado do sorteio
    return successResponse(res, 'Sorteio realizado com sucesso', {
      resultado: data,
      metodo: "seguro_v2"
    });
  } catch (error) {
    console.error('SORTEIO DEBUG: Erro inesperado no sorteio:', error);
    return errorResponse(res, 500, 'Erro ao realizar o sorteio', error);
  }
}

// Exportar o handler com o middleware de tratamento de erros
export default withErrorHandling(handler); 