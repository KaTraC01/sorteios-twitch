import { getSupabaseServiceClient } from "../../lib/supabaseManager";

// Usar cliente de serviço para cron jobs
const supabase = getSupabaseServiceClient();
import { withErrorHandling, successResponse, errorResponse } from "../../src/utils/apiResponse";
import logger from "../../src/utils/logger";

async function handler(req, res) {
  // Verificar se a requisição é do cron job do Vercel
  const isVercelCron = req.headers?.authorization === `Bearer ${process.env.CRON_SECRET}`;
  
  // Se não for uma requisição autorizada do cron
  if (!isVercelCron) {
    return errorResponse(
      res, 
      401, 
      'Acesso não autorizado', 
      'Este endpoint só pode ser acessado pelo cron job da Vercel'
    );
  }
  
  try {
    logger.info("Cron job de sorteio iniciado");
    
    // Função para verificar e realizar o sorteio
    async function verificarERealizarSorteio() {
      // Verificar se existem participantes
      const { data: participantes, error: erroParticipantes } = await supabase
        .from('participantes_ativos')
        .select('count');
      
      if (erroParticipantes) {
        throw new Error(`Erro ao verificar participantes: ${erroParticipantes.message}`);
      }
      
      const totalParticipantes = participantes[0]?.count || 0;
      if (totalParticipantes === 0) {
        return {
          realizado: false,
          mensagem: "Não há participantes para realizar o sorteio"
        };
      }
      
      // Configurar status de lista congelada
      const { error: erroConfig } = await supabase
        .from('configuracoes')
        .update({ valor: 'true' })
        .eq('chave', 'lista_congelada');
        
      if (erroConfig) {
        throw new Error(`Erro ao congelar lista: ${erroConfig.message}`);
      }
      
      // OTIMIZAÇÃO: Selecionar um participante aleatório diretamente no banco de dados
      // Isso garante que todos os participantes tenham chances iguais, sem limite de 1000
      const { data: sorteado, error: erroSorteio } = await supabase
        .from('participantes_ativos')
        .select('id, nome_twitch, streamer_escolhido, plataforma_premio')
        .order('random()') // Ordenação aleatória pelo PostgreSQL
        .limit(1);         // Pegar apenas um registro - o vencedor
        
      if (erroSorteio || !sorteado || sorteado.length === 0) {
        throw new Error(`Erro ao sortear participante: ${erroSorteio?.message || 'Nenhum participante encontrado'}`);
      }
      
      // Não precisamos mais selecionar um índice aleatório, já temos o vencedor
      const vencedor = sorteado[0];
      
      // Gerar número aleatório para o sorteio (1-100)
      const numeroSorteado = Math.floor(Math.random() * 100) + 1;
      
      // Registrar o sorteio
      const { data: novoSorteio, error: erroNovoSorteio } = await supabase
        .from('sorteios')
        .insert([{
          nome: vencedor.nome_twitch,
          streamer: vencedor.streamer_escolhido,
          numero: numeroSorteado,
          data: new Date().toISOString(),
          plataforma_premio: vencedor.plataforma_premio || 'twitch'
        }])
        .select();
        
      if (erroNovoSorteio) {
        throw new Error(`Erro ao registrar sorteio: ${erroNovoSorteio.message}`);
      }
      
      // O trigger já deve resetar a lista automaticamente
      
      // Registrar o log
      await supabase
        .from('logs')
        .insert([{
          descricao: `Sorteio realizado pelo cron job da Vercel. Vencedor: ${vencedor.nome_twitch}, Streamer: ${vencedor.streamer_escolhido}, Número: ${numeroSorteado}`
        }]);
      
      return {
        realizado: true,
        mensagem: "Sorteio realizado com sucesso",
        vencedor: {
          nome: vencedor.nome_twitch,
          streamer: vencedor.streamer_escolhido,
          numero: numeroSorteado,
          id: novoSorteio[0].id,
          data: novoSorteio[0].data,
          plataforma_premio: vencedor.plataforma_premio || 'twitch'
        }
      };
    }
    
    // Função para atualizar métricas resumidas de anúncios
    async function atualizarMetricasResumo() {
      try {
        // Chamar a função RPC do Supabase para atualizar as métricas resumidas
        const { data, error } = await supabase.rpc('atualizar_metricas_resumo');
        
        if (error) {
          logger.error("Erro ao atualizar métricas resumidas:", error);
          throw error;
        }
        
        // Registrar log do sucesso da atualização
        await supabase
          .from('logs')
          .insert([{
            descricao: `Métricas de anúncios atualizadas pelo cron job.`
          }]);
        
        return {
          sucesso: true,
          mensagem: "Métricas de anúncios atualizadas com sucesso"
        };
      } catch (error) {
        logger.error("Erro na atualização de métricas:", error);
        
        // Registrar erro em logs
        await supabase
          .from('logs')
          .insert([{
            descricao: `ERRO ao atualizar métricas de anúncios: ${error.message}`
          }]);
        
        return {
          sucesso: false,
          mensagem: `Erro na atualização de métricas: ${error.message}`
        };
      }
    }
    
    // Função para limpar dados antigos (eventos de anúncios e logs)
    async function limparDadosAntigos() {
      try {
        // Chamar a função RPC que executa todas as limpezas
        const { data, error } = await supabase.rpc('executar_limpeza_dados_antigos');
        
        if (error) {
          logger.error("Erro ao limpar dados antigos:", error);
          throw error;
        }
        
        // Registrar log do sucesso da limpeza
        await supabase
          .from('logs')
          .insert([{
            descricao: `Limpeza de dados antigos executada pelo cron job.`
          }]);
        
        return {
          sucesso: true,
          mensagem: "Limpeza de dados antigos executada com sucesso",
          resultado: data
        };
      } catch (error) {
        logger.error("Erro na limpeza de dados antigos:", error);
        
        // Registrar erro em logs
        await supabase
          .from('logs')
          .insert([{
            descricao: `ERRO ao limpar dados antigos: ${error.message}`
          }]);
        
        return {
          sucesso: false,
          mensagem: `Erro na limpeza de dados antigos: ${error.message}`
        };
      }
    }
    
    // Executar o sorteio
    const resultado = await verificarERealizarSorteio();
    
    // Registrar execução em logs
    await supabase
      .from('logs')
      .insert([{
        descricao: resultado.realizado 
          ? `Cron job executado com sucesso: sorteio realizado`
          : `Cron job executado: ${resultado.mensagem}`
      }]);
      
    // Atualizar métricas de anúncios após o sorteio
    const resultadoMetricas = await atualizarMetricasResumo();
    
    // Limpar dados antigos (eventos de anúncios e logs)
    const resultadoLimpeza = await limparDadosAntigos();
      
    return successResponse(res, 'Cron job executado com sucesso', {
      resultado: resultado,
      metricas: resultadoMetricas,
      limpeza: resultadoLimpeza
    });
  } catch (error) {
    logger.critical("Erro no cron job de sorteio:", error);
    
    // Registrar erro em logs
    await supabase
      .from('logs')
      .insert([{
        descricao: `ERRO no cron job: ${error.message}`
      }]);
      
    return errorResponse(res, 500, 'Erro na execução do cron job', error);
  }
}

// Exportar o handler com o middleware de tratamento de erros
export default withErrorHandling(handler); 