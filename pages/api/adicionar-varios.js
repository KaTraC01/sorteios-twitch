import { supabase } from "../../lib/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Extrair dados do corpo da requisição
  const { nome, streamer, quantidade } = req.body;

  // Validações básicas
  if (!nome || !streamer) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando' });
  }

  // Limitar quantidade máxima para 10
  const quantidadeReal = Math.min(quantidade || 10, 10);

  try {
    // Registrar início da operação em lote
    await supabase.from('logs').insert({
      descricao: `Iniciando inserção em lote: ${quantidadeReal} participações para ${nome}`
    });

    // Verificar se a lista está congelada
    const { data: configData } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'lista_congelada')
      .single();

    if (configData && configData.valor === 'true') {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'A lista foi congelada! Você não pode mais adicionar nomes.' 
      });
    }

    // Criar array com as entradas a serem inseridas
    const entradas = Array.from({ length: quantidadeReal }, (_, i) => ({
      nome_twitch: `${nome}_${i+1}`,  // Adicionar um sufixo único
      streamer_escolhido: streamer
    }));

    // Inserir usando uma única operação de inserção em lote
    const { error } = await supabase
      .from('participantes_ativos')
      .insert(entradas);

    if (error) {
      console.error('Erro na inserção em lote:', error);
      throw error;
    }

    // Registrar sucesso no log
    await supabase.from('logs').insert({
      descricao: `Sucesso: Inserção em lote de ${quantidadeReal} participações para ${nome}`
    });

    return res.status(200).json({ 
      sucesso: true, 
      mensagem: `${quantidadeReal} participações adicionadas com sucesso`,
      quantidade: quantidadeReal
    });
  } catch (error) {
    console.error('Erro na inserção em lote:', error);
    
    // Registrar erro no log
    await supabase.from('logs').insert({
      descricao: `ERRO: Falha na inserção em lote para ${nome} - ${error.message}`
    });
    
    return res.status(500).json({ 
      sucesso: false, 
      mensagem: `Erro ao adicionar participações: ${error.message}` 
    });
  }
} 