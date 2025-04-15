import { supabase } from "../../lib/supabaseClient";

export default async function handler(req, res) {
  // Adicionar logs para depuração
  console.log("API adicionar-varios: método recebido:", req.method);
  console.log("API adicionar-varios: headers:", JSON.stringify(req.headers));
  
  if (req.method !== 'POST') {
    console.log("API adicionar-varios: método inválido:", req.method);
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Obter e validar body
    const { nome, streamer, quantidade } = req.body;
    console.log("API adicionar-varios: dados recebidos:", { nome, streamer, quantidade });

    // Validações básicas
    if (!nome || !streamer) {
      console.log("API adicionar-varios: campos obrigatórios faltando");
      return res.status(400).json({ 
        sucesso: false,
        error: 'Campos obrigatórios faltando' 
      });
    }

    // Limitar quantidade máxima para 10
    const quantidadeReal = Math.min(quantidade || 10, 10);

    try {
      // Registrar início da operação em lote
      const { error: logError } = await supabase.from('logs').insert({
        descricao: `Iniciando inserção em lote: ${quantidadeReal} participações para ${nome}`
      });
      
      if (logError) {
        console.log("API adicionar-varios: erro ao registrar log:", logError);
      }

      // Verificar se a lista está congelada
      const { data: configData, error: configError } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'lista_congelada')
        .single();

      if (configError) {
        console.log("API adicionar-varios: erro ao verificar configuração:", configError);
      }

      if (configData && configData.valor === 'true') {
        console.log("API adicionar-varios: lista congelada");
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

      console.log(`API adicionar-varios: tentando inserir ${quantidadeReal} entradas`);

      // Inserir usando uma única operação de inserção em lote
      const { error } = await supabase
        .from('participantes_ativos')
        .insert(entradas);

      if (error) {
        console.log("API adicionar-varios: erro na inserção:", error);
        throw error;
      }

      // Registrar sucesso no log
      await supabase.from('logs').insert({
        descricao: `Sucesso: Inserção em lote de ${quantidadeReal} participações para ${nome}`
      });

      console.log(`API adicionar-varios: inserção bem-sucedida de ${quantidadeReal} participações`);
      
      return res.status(200).json({ 
        sucesso: true, 
        mensagem: `${quantidadeReal} participações adicionadas com sucesso`,
        quantidade: quantidadeReal
      });
    } catch (supabaseError) {
      console.error('API adicionar-varios: erro no Supabase:', supabaseError);
      
      // Registrar erro no log
      await supabase.from('logs').insert({
        descricao: `ERRO: Falha na inserção em lote para ${nome} - ${supabaseError.message}`
      });
      
      return res.status(500).json({ 
        sucesso: false, 
        mensagem: `Erro ao adicionar participações: ${supabaseError.message}` 
      });
    }
  } catch (error) {
    console.error('API adicionar-varios: erro geral:', error);
    return res.status(500).json({ 
      sucesso: false, 
      mensagem: `Erro ao processar requisição: ${error.message}` 
    });
  }
} 