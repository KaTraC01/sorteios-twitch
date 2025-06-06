import fetch from 'node-fetch';
import logger from '../../lib/logger';
import { errorResponse, successResponse, withErrorHandling } from '../../lib/apiResponse';

async function handler(req, res) {
  try {
    // Log detalhado de horários para debug (apenas em desenvolvimento)
    const agora = new Date();
    const horaBrasilia = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    
    logger.api('cron-sorteio', `Iniciando função de sorteio automático`);
    logger.debug(`Hora Brasília: ${horaBrasilia.getHours()}:${horaBrasilia.getMinutes()}`);
    
    // Verificar se API_SECRET_KEY está configurada
    if (!process.env.API_SECRET_KEY) {
      logger.critical('A variável de ambiente API_SECRET_KEY não está configurada.');
      return errorResponse(res, 500, 'Configuração do servidor incompleta', 'API_SECRET_KEY não configurada');
    }
    
    if (!process.env.BASE_URL) {
      logger.critical('A variável de ambiente BASE_URL não está configurada.');
      return errorResponse(res, 500, 'Configuração do servidor incompleta', 'BASE_URL não configurada');
    }
    
    const baseUrl = process.env.BASE_URL;
    logger.debug(`URL base configurada: ${baseUrl}`);
    
    // Realizar o sorteio diretamente (sem congelar a lista)
    logger.info('Realizando o sorteio automático');
    
    // Adicionar timeout para evitar problemas de rede
    let respostaSorteio;
    try {
      respostaSorteio = await fetch(`${baseUrl}/api/sorteio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.API_SECRET_KEY}`
        },
        body: JSON.stringify({ action: 'sorteio' }),
        timeout: 8000 // 8 segundos de timeout para respeitar o limite da Vercel
      });
    } catch (fetchError) {
      logger.error(`ERRO AO FAZER REQUISIÇÃO: ${fetchError.message}`);
      logger.debug(`DETALHES: URL=${baseUrl}/api/sorteio, AUTH=${process.env.API_SECRET_KEY ? 'Configurada' : 'NÃO CONFIGURADA'}`);
      throw new Error(`Erro de conexão com API: ${fetchError.message}`);
    }
    
    if (!respostaSorteio.ok) {
      let mensagemErro = 'Erro desconhecido';
      try {
        const erro = await respostaSorteio.json();
        mensagemErro = JSON.stringify(erro);
      } catch {
        try {
          mensagemErro = await respostaSorteio.text();
        } catch {
          mensagemErro = `Status HTTP: ${respostaSorteio.status}`;
        }
      }
      
      logger.error(`ERRO ao realizar o sorteio - ${mensagemErro}`);
      throw new Error(`Erro ao realizar o sorteio: ${mensagemErro}`);
    }
    
    let resultadoSorteio;
    try {
      resultadoSorteio = await respostaSorteio.json();
    } catch (jsonError) {
      logger.error(`ERRO AO PROCESSAR RESPOSTA JSON: ${jsonError.message}`);
      throw new Error(`Erro ao processar resposta: ${jsonError.message}`);
    }
    
    logger.info(`Sorteio realizado com sucesso! Vencedor: ${resultadoSorteio.resultado?.vencedor?.nome || 'N/A'}`);
    
    // OBSERVAÇÃO:
    // O processo de sorteio já realiza automaticamente:
    // - Seleção aleatória do vencedor
    // - Salvamento do vencedor na tabela 'sorteios'
    // - Salvamento de todos participantes na tabela 'historico_participantes'
    // - Limpeza da tabela de 'participantes_ativos'
    
    logger.info('Processo de sorteio concluído com sucesso');
    return successResponse(res, 'Sorteio realizado com sucesso', resultadoSorteio);

  } catch (error) {
    logger.critical('ERRO CRÍTICO no cron job de sorteio:', error);
    
    // Tentar registrar o erro em logs para diagnóstico futuro
    try {
      // Se tivermos Supabase configurado, poderíamos registrar em uma tabela de logs
      // Como este é o cron job que está falhando, o registro seria no próprio log da Vercel
      logger.debug(`Detalhes do erro: ${JSON.stringify({
        mensagem: error.message,
        horario: new Date().toISOString(),
        ambiente: {
          vercel_env: process.env.VERCEL_ENV || 'desconhecido'
        }
      })}`);
    } catch (logError) {
      logger.error('Erro ao registrar logs:', logError);
    }
    
    return errorResponse(res, 500, 'Erro interno do servidor', error);
  } finally {
    logger.api('cron-sorteio', `Função finalizada`);
  }
}

// Exportar o handler com o middleware de tratamento de erros
export default withErrorHandling(handler); 