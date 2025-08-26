import { getSupabaseServiceClient, sanitizarEntrada } from "../../lib/supabaseManager";

// Usar cliente de serviço para correção do sistema
const supabase = getSupabaseServiceClient();

export default async function handler(req, res) {
  try {
    // Verificar método
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método não permitido' });
    }

    // Verificação de segurança mais robusta
    const authHeader = req.headers.authorization;
    const { senha } = req.body;
    
    let autorizado = false;
    
    // Verificar se algum dos métodos de autenticação funciona
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token === process.env.API_SECRET_KEY) {
        autorizado = true;
      }
    }
    
    if (!autorizado && senha && senha === process.env.ADMIN_PASSWORD) {
      autorizado = true;
    }
    
    if (!autorizado) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    // Registrar início da execução
    console.log('Iniciando correção do sistema de cadeado');
    
    // Adicionar logs no Supabase
    await supabase
      .from('logs')
      .insert([{ descricao: 'Correção do sistema de cadeado iniciada via API' }]);

    // 1. Verificar se a coluna dados_disponiveis existe e adicioná-la se necessário
    let colunaStatus = 'desconhecido';
    try {
      const { error } = await supabase.rpc('adicionar_coluna_dados_disponiveis');
      if (error) {
        console.error('Erro ao adicionar coluna:', error);
        colunaStatus = 'erro na RPC';
        
        // Tentar SQL direto se a RPC falhar
        try {
          // Verificar se temos função SQL segura
          const { data: temFuncao } = await supabase
            .from('pg_proc')
            .select('proname')
            .eq('proname', 'executar_sql_seguro')
            .single();
          
          if (temFuncao) {
            // Usar a função SQL segura
            const { error: sqlError } = await supabase.rpc('executar_sql_seguro', {
              sql: "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sorteios' AND column_name = 'dados_disponiveis') THEN ALTER TABLE sorteios ADD COLUMN dados_disponiveis BOOLEAN DEFAULT true; END IF; END $$;"
            });
            
            if (!sqlError) {
              colunaStatus = 'adicionada via SQL';
            }
          }
        } catch (sqlError) {
          console.error('Erro ao tentar SQL direto:', sqlError);
          // Continuamos mesmo com erro
        }
        
        // Se ocorrer erro, vamos assumir que a coluna já existe e continuar
        console.log('Continuando a execução assumindo que a coluna já existe');
      } else {
        colunaStatus = 'sucesso via RPC';
      }
    } catch (e) {
      console.error('Erro ao verificar/adicionar coluna:', e);
      // Continuar mesmo com erro para tentar as outras operações
    }

    // 2. Atualizar sorteios existentes - tentar múltiplos métodos
    let atualizacaoStatus = 'não realizada';
    let sorteiosAtualizados = 0;
    
    try {
      const { data, error: errorAtualizacao } = await supabase
        .rpc('atualizar_disponibilidade_sorteios_todos');

      if (errorAtualizacao) {
        console.error('Erro ao atualizar sorteios via RPC:', errorAtualizacao);
        atualizacaoStatus = 'erro na RPC';
        
        // Tentativa alternativa com SQL direto
        try {
          const sqlAtualizar = `
            UPDATE sorteios 
            SET dados_disponiveis = (data > CURRENT_TIMESTAMP - INTERVAL '7 days')
            WHERE dados_disponiveis IS NULL OR dados_disponiveis != (data > CURRENT_TIMESTAMP - INTERVAL '7 days');
          `;
          
          // Verificar se temos função SQL segura
          const { data: temFuncao } = await supabase
            .from('pg_proc')
            .select('proname')
            .eq('proname', 'executar_sql_seguro')
            .single();
          
          if (temFuncao) {
            const { error: sqlError } = await supabase.rpc('executar_sql_seguro', {
              sql: sqlAtualizar
            });
            
            if (!sqlError) {
              atualizacaoStatus = 'sucesso via SQL direto';
            }
          }
        } catch (sqlError) {
          console.error('Erro ao executar SQL direto:', sqlError);
        }
      } else {
        sorteiosAtualizados = data || 0;
        atualizacaoStatus = `sucesso via RPC (${sorteiosAtualizados} atualizados)`;
        console.log('Sorteios atualizados com sucesso');
      }
    } catch (e) {
      console.error('Erro na atualização:', e);
    }

    // 3. Atualizar o trigger de reset_participantes_ativos
    let triggerStatus = 'não atualizado';
    try {
      const { error: errorTrigger } = await supabase
        .rpc('atualizar_trigger_reset_participantes_ativos');

      if (errorTrigger) {
        console.error('Erro ao atualizar trigger:', errorTrigger);
        triggerStatus = 'erro';
      } else {
        triggerStatus = 'sucesso';
        console.log('Trigger atualizado com sucesso');
      }
    } catch (e) {
      console.error('Erro ao atualizar trigger:', e);
    }

    // 4. Verificar sorteios atuais
    const { data: sorteiosRecentes, error: errorConsulta } = await supabase
      .from('sorteios')
      .select('id, data, dados_disponiveis')
      .order('data', { ascending: false })
      .limit(10);

    if (errorConsulta) {
      console.error('Erro ao consultar sorteios:', errorConsulta);
    }

    // Verificar sorteios problemáticos
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 7);
    
    const sorteiosProblematicos = sorteiosRecentes?.filter(sorteio => {
      const sorteioData = new Date(sorteio.data);
      return sorteioData < dataLimite && sorteio.dados_disponiveis === true;
    }).length || 0;

    // Registrar resultado nos logs
    await supabase
      .from('logs')
      .insert([{ 
        descricao: `Correção finalizada - Coluna: ${colunaStatus}, Atualização: ${atualizacaoStatus}, Trigger: ${triggerStatus}` 
      }]);

    // Retornar resposta detalhada
    return res.status(200).json({
      success: true,
      message: 'Sistema de cadeado corrigido',
      detalhes: {
        coluna: colunaStatus,
        atualizacao: atualizacaoStatus,
        trigger: triggerStatus,
        sorteiosProblematicos
      },
      sorteiosRecentes: sorteiosRecentes || []
    });

  } catch (error) {
    console.error('Erro geral na correção do sistema de cadeado:', error);
    
    // Registrar erro nos logs
    try {
      await supabase
        .from('logs')
        .insert([{ descricao: `ERRO na correção: ${error.message}` }]);
    } catch (logError) {
      console.error('Erro ao registrar log:', logError);
    }
    
    return res.status(500).json({ 
      error: 'Erro ao processar a solicitação', 
      details: error.message 
    });
  }
} 