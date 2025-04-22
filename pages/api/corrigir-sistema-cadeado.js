import { supabase } from "../../lib/supabaseClient";

export default async function handler(req, res) {
  try {
    // Verificar método
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método não permitido' });
    }

    // Verificar senha de acesso (opcional - para segurança)
    const { senha } = req.body;
    if (!senha || senha !== process.env.ADMIN_PASSWORD) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    // Registrar início da execução
    console.log('Iniciando correção do sistema de cadeado');

    // 1. Verificar se a coluna dados_disponiveis existe e adicioná-la se necessário
    try {
      // Esta operação exige privilégios de administrador no Supabase
      const { error } = await supabase.rpc('adicionar_coluna_dados_disponiveis');
      if (error) {
        console.error('Erro ao adicionar coluna:', error);
        
        // Se ocorrer erro, vamos assumir que a coluna já existe e continuar
        console.log('Continuando a execução assumindo que a coluna já existe');
      } else {
        console.log('Coluna dados_disponiveis verificada/adicionada com sucesso');
      }
    } catch (e) {
      console.error('Erro ao verificar/adicionar coluna:', e);
      // Continuar mesmo com erro para tentar as outras operações
    }

    // 2. Atualizar sorteios existentes
    const { data: sorteiosAtualizados, error: errorAtualizacao } = await supabase
      .rpc('atualizar_disponibilidade_sorteios_todos');

    if (errorAtualizacao) {
      console.error('Erro ao atualizar sorteios:', errorAtualizacao);
      return res.status(500).json({ error: 'Erro ao atualizar sorteios', details: errorAtualizacao });
    }

    console.log('Sorteios atualizados com sucesso');

    // 3. Atualizar o trigger de reset_participantes_ativos
    const { error: errorTrigger } = await supabase
      .rpc('atualizar_trigger_reset_participantes_ativos');

    if (errorTrigger) {
      console.error('Erro ao atualizar trigger:', errorTrigger);
      return res.status(500).json({ error: 'Erro ao atualizar trigger', details: errorTrigger });
    }

    console.log('Trigger atualizado com sucesso');

    // 4. Verificar sorteios atuais
    const { data: sorteiosRecentes, error: errorConsulta } = await supabase
      .from('sorteios')
      .select('id, data, dados_disponiveis')
      .order('data', { ascending: false })
      .limit(10);

    if (errorConsulta) {
      console.error('Erro ao consultar sorteios:', errorConsulta);
    }

    // Retornar resposta de sucesso
    return res.status(200).json({
      success: true,
      message: 'Sistema de cadeado corrigido com sucesso',
      sorteiosRecentes: sorteiosRecentes || []
    });

  } catch (error) {
    console.error('Erro geral na correção do sistema de cadeado:', error);
    return res.status(500).json({ error: 'Erro ao processar a solicitação', details: error.message });
  }
} 