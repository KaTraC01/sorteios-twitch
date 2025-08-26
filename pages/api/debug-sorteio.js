import { getSupabaseServiceClient } from "../../src/lib/supabaseManager";

// Usar cliente de serviço para debug
const supabase = getSupabaseServiceClient();
import { withErrorHandling, successResponse, errorResponse } from "../../src/utils/apiResponse";

async function handler(req, res) {
  try {
    // Este endpoint é apenas para testes em ambiente de desenvolvimento
    // Por segurança, verificar se estamos em desenvolvimento
    const isDev = process.env.NODE_ENV === 'development' || req.headers['x-vercel-env'] === 'development';
    if (!isDev && !req.query.force) {
      return errorResponse(
        res, 
        403, 
        'Este endpoint só está disponível em ambiente de desenvolvimento',
        'Acesso não autorizado em produção',
        { tip: 'Adicione ?force=true se realmente quiser forçar a execução em produção' }
      );
    }

    // Obter informações sobre o sistema
    const diagnostico = {
      timestamp: new Date().toISOString(),
      ambiente: process.env.NODE_ENV || 'desconhecido',
      variaveis_configuradas: {
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
        API_SECRET_KEY: !!process.env.API_SECRET_KEY,
        CRON_SECRET: !!process.env.CRON_SECRET,
        BASE_URL: process.env.BASE_URL || 'não configurado'
      }
    };

    // Checar conexão com Supabase
    try {
      const { data, error } = await supabase.from('configuracoes').select('*').limit(1);
      
      if (error) {
        diagnostico.supabase_conexao = { status: 'erro', mensagem: error.message };
      } else {
        diagnostico.supabase_conexao = { status: 'ok', teste: 'Consulta bem sucedida' };
      }

      // Verificar configuração de lista congelada
      const { data: configData } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('chave', 'lista_congelada')
        .single();
      
      if (configData) {
        diagnostico.lista_congelada = configData.valor === 'true';
      }

      // Contar participantes
      const { data: participantesCount, error: countError } = await supabase
        .from('participantes_ativos')
        .select('count');
      
      if (!countError) {
        diagnostico.participantes_ativos = participantesCount[0]?.count || 0;
      }

      // Buscar último sorteio
      const { data: ultimoSorteio, error: sorteioError } = await supabase
        .from('sorteios')
        .select('*')
        .order('data', { ascending: false })
        .limit(1);
      
      if (!sorteioError && ultimoSorteio.length > 0) {
        diagnostico.ultimo_sorteio = {
          id: ultimoSorteio[0].id,
          vencedor: ultimoSorteio[0].nome,
          data: ultimoSorteio[0].data
        };
      }

      // Buscar logs recentes
      const { data: logsRecentes, error: logsError } = await supabase
        .from('logs')
        .select('descricao, data_hora')
        .order('data_hora', { ascending: false })
        .limit(5);
      
      if (!logsError) {
        diagnostico.logs_recentes = logsRecentes;
      }

    } catch (supabaseError) {
      diagnostico.supabase_conexao = { 
        status: 'erro crítico', 
        mensagem: supabaseError.message 
      };
    }

    // Se foi solicitado teste de uma ação específica
    if (req.query.action) {
      const { action } = req.query;
      
      if (['sorteio', 'congelar', 'resetar'].includes(action)) {
        // Tentar chamar o endpoint de sorteio
        try {
          const baseUrl = process.env.BASE_URL || (req.headers.host ? `https://${req.headers.host}` : 'https://sorteios-twitch.vercel.app');
          
          // Gravar log no banco de dados
          await supabase.from('logs').insert([{
            descricao: `Teste manual do endpoint de sorteio com ação "${action}" via debug-sorteio`
          }]);
          
          // Chamar o endpoint
          const fetchResponse = await fetch(`${baseUrl}/api/sorteio`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.API_SECRET_KEY}`
            },
            body: JSON.stringify({ action })
          });
          
          // Analisar a resposta
          const fetchResult = await fetchResponse.json();
          diagnostico.teste_action = {
            acao: action,
            status: fetchResponse.ok ? 'sucesso' : 'erro',
            codigo: fetchResponse.status,
            resposta: fetchResult
          };
        } catch (testError) {
          diagnostico.teste_action = {
            acao: action,
            status: 'erro',
            mensagem: testError.message
          };
        }
      } else {
        diagnostico.teste_action = {
          status: 'erro',
          mensagem: 'Ação inválida. Use: sorteio, congelar ou resetar'
        };
      }
    }

    // Retornar diagnóstico
    return successResponse(res, 'Diagnóstico concluído com sucesso', {
      diagnostico,
      ajuda: {
        acoes_disponiveis: [
          { url: '/api/debug-sorteio?action=sorteio', descricao: 'Testar sorteio' },
          { url: '/api/debug-sorteio?action=congelar', descricao: 'Congelar lista' },
          { url: '/api/debug-sorteio?action=resetar', descricao: 'Resetar lista' }
        ]
      }
    });
  } catch (error) {
    console.error('Erro no endpoint de debug:', error);
    return errorResponse(res, 500, 'Erro no diagnóstico', error);
  }
}

// Exportar o handler com o middleware de tratamento de erros
export default withErrorHandling(handler); 