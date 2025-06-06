import fetch from 'node-fetch';
import logger from '../../lib/logger';
import { errorResponse, successResponse, withErrorHandling } from '../../lib/apiResponse';

async function handler(req, res) {
  // Identificação única para esta execução do cron
  const cronRunId = `cron-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  try {
    // Informações do ambiente para debug
    const ambiente = {
      vercel_env: process.env.VERCEL_ENV || 'local',
      node_env: process.env.NODE_ENV || 'development',
      vercel_region: process.env.VERCEL_REGION || 'desconhecido',
      vercel_url: process.env.VERCEL_URL || 'desconhecido'
    };
    
    // Log detalhado de horários
    const agora = new Date();
    const horaBrasilia = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    
    logger.cron(`===== INÍCIO CRON JOB [${cronRunId}] =====`);
    logger.cron(`Ambiente: ${JSON.stringify(ambiente)}`);
    logger.cron(`Hora UTC: ${agora.toISOString()}`);
    logger.cron(`Hora Brasília: ${horaBrasilia.toISOString()} (${horaBrasilia.getHours()}:${horaBrasilia.getMinutes().toString().padStart(2, '0')})`);
    
    // Verificar variáveis de ambiente críticas
    logger.cron(`[${cronRunId}] Verificando variáveis de ambiente...`);
    
    const configVars = {
      API_SECRET_KEY: !!process.env.API_SECRET_KEY,
      BASE_URL: !!process.env.BASE_URL,
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY
    };
    
    logger.cron(`[${cronRunId}] Status de configuração: ${JSON.stringify(configVars)}`);
    
    // Verificar API_SECRET_KEY
    if (!process.env.API_SECRET_KEY) {
      logger.critical('A variável de ambiente API_SECRET_KEY não está configurada.');
      return errorResponse(res, 500, 'Configuração do servidor incompleta', 'API_SECRET_KEY não configurada');
    }
    
    // Verificar BASE_URL
    if (!process.env.BASE_URL) {
      logger.critical('A variável de ambiente BASE_URL não está configurada.');
      return errorResponse(res, 500, 'Configuração do servidor incompleta', 'BASE_URL não configurada');
    }
    
    const baseUrl = process.env.BASE_URL;
    logger.cron(`[${cronRunId}] URL base configurada: ${baseUrl}`);
    
    // Realizar o sorteio diretamente
    logger.cron(`[${cronRunId}] Iniciando requisição para API de sorteio...`);
    
    // Adicionar timeout para evitar problemas de rede
    let respostaSorteio;
    const urlSorteio = `${baseUrl}/api/sorteio`;
    const payloadSorteio = { action: 'sorteio' };
    
    try {
      logger.cron(`[${cronRunId}] Enviando requisição para ${urlSorteio}`);
      logger.cron(`[${cronRunId}] Payload: ${JSON.stringify(payloadSorteio)}`);
      
      const inicioRequest = Date.now();
      
      respostaSorteio = await fetch(urlSorteio, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.API_SECRET_KEY}`,
          'X-Cron-Run-ID': cronRunId
        },
        body: JSON.stringify(payloadSorteio),
        timeout: 8000 // 8 segundos de timeout para respeitar o limite da Vercel
      });
      
      const fimRequest = Date.now();
      const tempoRequest = fimRequest - inicioRequest;
      
      logger.cron(`[${cronRunId}] Resposta recebida em ${tempoRequest}ms - Status: ${respostaSorteio.status}`);
    } catch (fetchError) {
      logger.cron(`[${cronRunId}] ❌ ERRO NA REQUISIÇÃO: ${fetchError.message}`);
      logger.cron(`[${cronRunId}] ❌ DETALHES DO ERRO: ${fetchError.stack || 'Sem stack trace'}`);
      logger.cron(`[${cronRunId}] ❌ URL: ${urlSorteio}`);
      logger.cron(`[${cronRunId}] ❌ AUTH: ${process.env.API_SECRET_KEY ? 'Configurada' : 'NÃO CONFIGURADA'}`);
      
      throw new Error(`Erro de conexão com API: ${fetchError.message}`);
    }
    
    // Verificar resposta HTTP
    if (!respostaSorteio.ok) {
      logger.cron(`[${cronRunId}] ❌ ERRO HTTP: ${respostaSorteio.status} ${respostaSorteio.statusText}`);
      
      let mensagemErro = 'Erro desconhecido';
      let conteudoResposta = null;
      
      try {
        const contentType = respostaSorteio.headers.get('content-type') || '';
        logger.cron(`[${cronRunId}] Content-Type: ${contentType}`);
        
        if (contentType.includes('application/json')) {
          conteudoResposta = await respostaSorteio.json();
          mensagemErro = JSON.stringify(conteudoResposta);
          logger.cron(`[${cronRunId}] Resposta JSON: ${mensagemErro}`);
        } else {
          conteudoResposta = await respostaSorteio.text();
          mensagemErro = conteudoResposta;
          logger.cron(`[${cronRunId}] Resposta texto: ${mensagemErro.substring(0, 200)}${mensagemErro.length > 200 ? '...' : ''}`);
        }
      } catch (parseError) {
        mensagemErro = `Status HTTP: ${respostaSorteio.status} - Erro ao processar resposta: ${parseError.message}`;
        logger.cron(`[${cronRunId}] ❌ Erro ao processar resposta: ${parseError.message}`);
      }
      
      logger.cron(`[${cronRunId}] ❌ FALHA NO SORTEIO: ${mensagemErro}`);
      throw new Error(`Erro ao realizar o sorteio: ${mensagemErro}`);
    }
    
    // Processar resposta de sucesso
    let resultadoSorteio;
    try {
      resultadoSorteio = await respostaSorteio.json();
      logger.cron(`[${cronRunId}] Resposta processada com sucesso: ${JSON.stringify(resultadoSorteio)}`);
    } catch (jsonError) {
      logger.cron(`[${cronRunId}] ❌ ERRO AO PROCESSAR JSON: ${jsonError.message}`);
      logger.cron(`[${cronRunId}] ❌ Stack: ${jsonError.stack || 'Sem stack trace'}`);
      throw new Error(`Erro ao processar resposta: ${jsonError.message}`);
    }
    
    const vencedorNome = resultadoSorteio.resultado?.vencedor?.nome || 'N/A';
    const vencedorStreamer = resultadoSorteio.resultado?.vencedor?.streamer || 'N/A';
    const sorteioId = resultadoSorteio.resultado?.sorteioId || 'N/A';
    
    logger.cron(`[${cronRunId}] ✅ SORTEIO REALIZADO COM SUCESSO!`);
    logger.cron(`[${cronRunId}] ✅ Vencedor: ${vencedorNome}`);
    logger.cron(`[${cronRunId}] ✅ Streamer: ${vencedorStreamer}`);
    logger.cron(`[${cronRunId}] ✅ ID do Sorteio: ${sorteioId}`);
    
    // Processo concluído
    logger.cron(`[${cronRunId}] ===== FIM CRON JOB [SUCESSO] =====`);
    return successResponse(res, 'Sorteio realizado com sucesso', resultadoSorteio);

  } catch (error) {
    logger.cron(`[${cronRunId}] ❌❌❌ ERRO CRÍTICO NO CRON JOB ❌❌❌`);
    logger.cron(`[${cronRunId}] Mensagem: ${error.message}`);
    logger.cron(`[${cronRunId}] Stack: ${error.stack || 'Sem stack trace'}`);
    
    // Tentar registrar detalhes adicionais para diagnóstico
    try {
      const errorDetails = {
        mensagem: error.message,
        horario: new Date().toISOString(),
        cronRunId: cronRunId,
        ambiente: {
          vercel_env: process.env.VERCEL_ENV || 'desconhecido',
          vercel_region: process.env.VERCEL_REGION || 'desconhecido',
          node_version: process.version || 'desconhecido'
        },
        configuracao: {
          base_url_configurada: !!process.env.BASE_URL,
          api_key_configurada: !!process.env.API_SECRET_KEY,
          supabase_url_configurada: !!process.env.SUPABASE_URL,
          supabase_key_configurada: !!process.env.SUPABASE_SERVICE_KEY
        }
      };
      
      logger.cron(`[${cronRunId}] Detalhes do erro: ${JSON.stringify(errorDetails)}`);
    } catch (logError) {
      logger.cron(`[${cronRunId}] Erro ao registrar detalhes: ${logError.message}`);
    }
    
    logger.cron(`[${cronRunId}] ===== FIM CRON JOB [FALHA] =====`);
    return errorResponse(res, 500, 'Erro interno do servidor', error);
  }
}

// Exportar o handler com o middleware de tratamento de erros
export default withErrorHandling(handler); 