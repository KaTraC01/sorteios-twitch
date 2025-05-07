import { supabase } from "../../lib/supabaseClient";
import { sanitizarEntrada } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  // Verificar se é uma chamada GET ou POST (aceita ambos)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
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
          return res.status(500).json({ 
            sucesso: false,
            erro: `Erro em ambas as funções de sorteio. Último erro: ${oldError.message}`,
            detalhes: oldError
          });
        }
        
        console.log('SORTEIO DEBUG: Função alternativa executada com sucesso');
        return res.status(200).json({
          sucesso: true,
          resultado: oldData,
          metodo: "alternativo"
        });
      } catch (fallbackError) {
        console.error('SORTEIO DEBUG: Erro completo no fallback:', fallbackError);
        return res.status(500).json({ 
          sucesso: false,
          erro: `Todos os métodos de sorteio falharam. Último erro: ${fallbackError.message}`
        });
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
    return res.status(200).json({
      sucesso: true,
      resultado: data,
      metodo: "seguro_v2"
    });
  } catch (error) {
    console.error('SORTEIO DEBUG: Erro inesperado no sorteio:', error);
    return res.status(500).json({ 
      sucesso: false,
      erro: error.message
    });
  }
} 