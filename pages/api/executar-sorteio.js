import { supabase } from "../../lib/supabaseClient";

export default async function handler(req, res) {
  // Verificar se é uma chamada GET ou POST (aceita ambos)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Chamar a função de sorteio no banco de dados
    const { data, error } = await supabase.rpc("realizar_sorteio_automatico");
    
    if (error) {
      console.error('Erro ao executar sorteio:', error);
      return res.status(500).json({ 
        sucesso: false,
        erro: error.message,
        detalhes: error
      });
    }
    
    // Já que o trigger reset_participantes_ativos contém a lógica para atualizar
    // dados_disponiveis e limpar participantes antigos, não precisamos chamar
    // nada adicional se o sorteio foi realizado e o trigger foi acionado
    
    // Porém, se o sorteio NÃO foi realizado (já aconteceu hoje, ou não há participantes),
    // vamos atualizar a disponibilidade e limpar participantes antigos manualmente
    if (!data?.realizado) {
      try {
        // Verificar se a coluna dados_disponiveis existe
        try {
          const { error: errorColunaDados } = await supabase.rpc("verificar_coluna_dados_disponiveis");
          if (errorColunaDados) {
            console.warn('Aviso: Erro ao verificar coluna dados_disponiveis:', errorColunaDados);
            // Não falha a operação principal
          }
        } catch (e) {
          console.warn('Aviso: Erro ao verificar coluna dados_disponiveis:', e);
          // Não falha a operação principal
        }
        
        // Verificar se a coluna created_at existe
        try {
          const { error: errorColuna } = await supabase.rpc("verificar_coluna_created_at");
          if (errorColuna) {
            console.warn('Aviso: Erro ao verificar coluna created_at:', errorColuna);
            // Não falha a operação principal
          }
        } catch (e) {
          console.warn('Aviso: Erro ao verificar coluna created_at:', e);
          // Não falha a operação principal
        }
        
        // Atualizar o trigger para incluir a limpeza
        try {
          const { error: errorTrigger } = await supabase.rpc("atualizar_trigger_reset");
          if (errorTrigger) {
            console.warn('Aviso: Erro ao atualizar trigger:', errorTrigger);
            // Não falha a operação principal
          }
        } catch (e) {
          console.warn('Aviso: Erro ao atualizar trigger:', e);
          // Não falha a operação principal
        }
        
        // Limpar participantes antigos (mais de 7 dias)
        try {
          const { error: errorLimpeza } = await supabase.rpc("limpar_historico_participantes_antigos");
          
          if (errorLimpeza) {
            console.warn('Aviso: Erro ao limpar participantes antigos:', errorLimpeza);
            // Não falha a operação principal, apenas registra o erro
          }
        } catch (e) {
          console.warn('Aviso: Erro ao limpar participantes antigos:', e);
          // Não falha a operação principal, apenas registra o erro
        }
      } catch (e) {
        console.warn('Aviso: Erro ao processar atualizações adicionais:', e);
        // Não falha a operação principal, apenas registra o erro
      }
    }
    
    // Retornar o resultado do sorteio
    return res.status(200).json({
      sucesso: true,
      resultado: data
    });
  } catch (error) {
    console.error('Erro inesperado no sorteio:', error);
    return res.status(500).json({ 
      sucesso: false,
      erro: error.message
    });
  }
} 