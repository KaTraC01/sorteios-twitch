import { getSupabaseServiceClient, sanitizarEntrada } from "../../src/lib/supabaseManager";

// Usar cliente de serviço para reparo
const supabase = getSupabaseServiceClient();

export default async function handler(req, res) {
  // Verificar se é uma chamada POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  // Verificar autenticação básica (pode implementar um método mais seguro se necessário)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    console.log('REPARO DEBUG: Iniciando reparo de histórico de participantes...');
    
    // Chamar a função de reparo no banco de dados
    const { data, error } = await supabase.rpc("reparar_historico_participantes");
    
    if (error) {
      console.error('REPARO DEBUG: Erro ao executar reparo:', error);
      return res.status(500).json({ 
        sucesso: false,
        erro: error.message,
        detalhes: error
      });
    }
    
    console.log('REPARO DEBUG: Reparo concluído com sucesso', data);
    
    // Retornar o resultado do reparo
    return res.status(200).json({
      sucesso: true,
      resultado: data
    });
  } catch (error) {
    console.error('REPARO DEBUG: Erro inesperado no reparo:', error);
    return res.status(500).json({ 
      sucesso: false,
      erro: error.message
    });
  }
} 