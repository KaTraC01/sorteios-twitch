import { supabase } from "../../lib/supabaseClient";

export default async function handler(req, res) {
  // Verificar se a requisição é do cron job do Vercel
  const isVercelCron = req.headers?.authorization === `Bearer ${process.env.CRON_SECRET}`;
  
  try {
    console.log("Cron job de sorteio iniciado");
    
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
      
      // Selecionar um participante aleatório
      const { data: sorteado, error: erroSorteio } = await supabase
        .from('participantes_ativos')
        .select('*')
        .limit(1000) // Limitamos para evitar problemas com grandes listas
        .order('id', { ascending: false });
        
      if (erroSorteio || !sorteado || sorteado.length === 0) {
        throw new Error(`Erro ao sortear participante: ${erroSorteio?.message || 'Nenhum participante encontrado'}`);
      }
      
      // Escolher um vencedor aleatório
      const indiceAleatorio = Math.floor(Math.random() * sorteado.length);
      const vencedor = sorteado[indiceAleatorio];
      
      // Gerar número aleatório para o sorteio (1-100)
      const numeroSorteado = Math.floor(Math.random() * 100) + 1;
      
      // Registrar o sorteio
      const { data: novoSorteio, error: erroNovoSorteio } = await supabase
        .from('sorteios')
        .insert([{
          nome: vencedor.nome_twitch,
          streamer: vencedor.streamer_escolhido,
          numero: numeroSorteado,
          data: new Date().toISOString()
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
          data: novoSorteio[0].data
        }
      };
    }
    
    // Função para atualizar métricas resumidas de anúncios
    async function atualizarMetricasResumo() {
      try {
        // Chamar a função RPC do Supabase para atualizar as métricas resumidas
        const { data, error } = await supabase.rpc('atualizar_metricas_resumo');
        
        if (error) {
          console.error("Erro ao atualizar métricas resumidas:", error);
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
        console.error("Erro na atualização de métricas:", error);
        
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
      
    return res.status(200).json({
      success: true,
      resultado: resultado,
      metricas: resultadoMetricas
    });
  } catch (error) {
    console.error("Erro no cron job de sorteio:", error);
    
    // Registrar erro em logs
    await supabase
      .from('logs')
      .insert([{
        descricao: `ERRO no cron job: ${error.message}`
      }]);
      
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
} 