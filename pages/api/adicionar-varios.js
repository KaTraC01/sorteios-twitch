import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;

// Criar cliente do Supabase diretamente para evitar problemas de importação
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Configurar CORS para permitir acesso de qualquer origem
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Responder imediatamente a requisições OPTIONS (preflight CORS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verificar método HTTP
  if (req.method !== 'POST') {
    console.log(`[API] Método não permitido: ${req.method}`);
    return res.status(405).json({
      sucesso: false,
      error: 'Método não permitido. Use POST.'
    });
  }

  try {
    // Log para diagnóstico
    console.log('[API] Recebida requisição para adicionar-varios');
    
    // Extrair e validar os dados da requisição
    let { nome, streamer, quantidade } = req.body;
    
    // Se o corpo da requisição for uma string, fazer parse
    if (typeof req.body === 'string') {
      try {
        const parsedBody = JSON.parse(req.body);
        nome = parsedBody.nome;
        streamer = parsedBody.streamer;
        quantidade = parsedBody.quantidade;
      } catch (e) {
        console.error('[API] Erro ao fazer parse do body:', e);
        return res.status(400).json({
          sucesso: false,
          error: 'Body da requisição inválido'
        });
      }
    }
    
    console.log('[API] Dados recebidos:', { nome, streamer, quantidade });

    // Validações básicas
    if (!nome || !streamer) {
      return res.status(400).json({
        sucesso: false,
        error: 'Nome e streamer são campos obrigatórios'
      });
    }

    // Limitar quantidade a 5 para garantir sucesso
    const quantidadeReal = Math.min(parseInt(quantidade) || 5, 5);
    
    // Verificar se a lista está congelada
    const { data: configData, error: configError } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'lista_congelada')
      .single();
    
    if (configError) {
      console.error('[API] Erro ao verificar configuração:', configError);
    } else if (configData && configData.valor === 'true') {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'A lista foi congelada! Você não pode mais adicionar nomes.'
      });
    }

    // Preparar entradas com nomes únicos
    const entradas = [];
    for (let i = 1; i <= quantidadeReal; i++) {
      entradas.push({
        nome_twitch: `${nome}_${i}`,
        streamer_escolhido: streamer
      });
    }
    
    // Inserir os participantes no banco de dados
    console.log(`[API] Tentando inserir ${quantidadeReal} participantes`);
    
    const { error: insertError } = await supabase
      .from('participantes_ativos')
      .insert(entradas);
    
    if (insertError) {
      console.error('[API] Erro na inserção:', insertError);
      throw new Error(`Erro do Supabase: ${insertError.message}`);
    }
    
    // Registrar sucesso no log do sistema
    await supabase.from('logs').insert({
      descricao: `API: Adicionados ${quantidadeReal} participantes para ${nome}`
    });
    
    console.log('[API] Inserção concluída com sucesso');
    
    // Responder com sucesso
    return res.status(200).json({
      sucesso: true,
      mensagem: `${quantidadeReal} participações adicionadas com sucesso`,
      quantidade: quantidadeReal
    });
    
  } catch (error) {
    console.error('[API] Erro ao processar requisição:', error);
    
    // Tentar registrar o erro no log do sistema
    try {
      await supabase.from('logs').insert({
        descricao: `ERRO API: ${error.message}`
      });
    } catch (logError) {
      console.error('[API] Não foi possível registrar o erro no log:', logError);
    }
    
    return res.status(500).json({
      sucesso: false,
      error: 'Erro ao processar requisição',
      mensagem: error.message
    });
  }
} 