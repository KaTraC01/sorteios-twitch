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