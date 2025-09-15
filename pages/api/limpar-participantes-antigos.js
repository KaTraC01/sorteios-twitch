import { getSupabaseServiceClient, sanitizarEntrada } from "../../src/lib/supabaseManager";

// Usar cliente de serviço para limpeza
const supabase = getSupabaseServiceClient();

export default async function handler(req, res) {
  try {
    // Verificar método
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método não permitido' });
    }

    // Verificar autenticação robusta (dupla validação)
    const authHeader = req.headers.authorization;
    const { senha } = req.body;
    
    let autorizado = false;
    
    // Método 1: Bearer token
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token === process.env.API_SECRET_KEY) {
        autorizado = true;
      }
    }
    
    // Método 2: Senha admin (fallback)
    if (!autorizado && senha && senha === process.env.ADMIN_PASSWORD) {
      autorizado = true;
    }
    
    if (!autorizado) {
      return res.status(403).json({ error: 'Acesso não autorizado - Token ou senha requeridos' });
    }

    // Registrar início da execução
    console.log('Iniciando limpeza de participantes antigos');

    // 1. Verificar se a coluna created_at existe e adicioná-la se necessário
    try {
      const { error } = await supabase.rpc('verificar_coluna_created_at');
      if (error) {
        console.error('Erro ao verificar coluna created_at:', error);
        // Continue mesmo com erro
      } else {
        console.log('Coluna created_at verificada/adicionada com sucesso');
      }
    } catch (e) {
      console.error('Erro ao verificar coluna created_at:', e);
      // Continue mesmo com erro
    }

    // 2. Atualizar o trigger de limpeza
    try {
      const { error } = await supabase.rpc('atualizar_trigger_limpeza_participantes');
      if (error) {
        console.error('Erro ao atualizar trigger de limpeza:', error);
        return res.status(500).json({ 
          error: 'Erro ao atualizar trigger de limpeza', 
          details: error 
        });
      }
      console.log('Trigger de limpeza atualizado com sucesso');
    } catch (e) {
      console.error('Erro ao atualizar trigger de limpeza:', e);
      return res.status(500).json({ 
        error: 'Erro ao atualizar trigger de limpeza', 
        details: e.message 
      });
    }

    // 3. Executar limpeza manual de participantes antigos
    let registrosRemovidos = 0;
    try {
      const { data, error } = await supabase.rpc('limpar_historico_participantes_antigos');
      if (error) {
        console.error('Erro ao limpar participantes antigos:', error);
        // Continue mesmo com erro
      } else {
        registrosRemovidos = data || 0;
        console.log(`${registrosRemovidos} registros de participantes antigos removidos`);
      }
    } catch (e) {
      console.error('Erro ao limpar participantes antigos:', e);
      // Continue mesmo com erro
    }

    // 4. Executar limpeza manual de sorteios antigos (mais de 60 dias)
    let sorteiosRemovidos = 0;
    try {
      const { data, error } = await supabase.rpc('limpar_sorteios_antigos');
      if (error) {
        console.error('Erro ao limpar sorteios antigos:', error);
        // Continue mesmo com erro
      } else {
        sorteiosRemovidos = data || 0;
        console.log(`${sorteiosRemovidos} sorteios antigos removidos`);
      }
    } catch (e) {
      console.error('Erro ao limpar sorteios antigos:', e);
      // Continue mesmo com erro
    }

    // 5. Verificar sorteios recentes
    const { data: sorteiosRecentes, error: errorConsulta } = await supabase
      .from('sorteios')
      .select(`
        id, 
        data, 
        nome,
        dados_disponiveis,
        historico_participantes:historico_participantes!sorteio_id(count)
      `)
      .order('data', { ascending: false })
      .limit(10);

    if (errorConsulta) {
      console.error('Erro ao consultar sorteios:', errorConsulta);
    }

    // Retornar resposta de sucesso
    return res.status(200).json({
      success: true,
      message: 'Limpeza de dados antigos concluída com sucesso',
      registrosRemovidos,
      sorteiosRemovidos,
      sorteiosRecentes: sorteiosRecentes || []
    });

  } catch (error) {
    console.error('Erro geral na limpeza de dados antigos:', error);
    return res.status(500).json({ 
      error: 'Erro ao processar a solicitação', 
      details: error.message 
    });
  }
} 