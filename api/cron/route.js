const fetch = require('node-fetch');
const logger = require('../../lib/logger');
const { errorResponse, successResponse, withErrorHandling } = require('../../lib/apiResponse');
const { getSupabaseServiceClient } = require('../../src/lib/supabaseManager');
const { cleanupOldRecords } = require('../../src/middleware/rateLimiting');

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
    
    // ============================================================================
    // SEÇÃO DE MÉTRICAS - AGREGAÇÃO E LIMPEZA
    // ============================================================================
    logger.cron(`[${cronRunId}] 🔄 Iniciando processamento de métricas de anúncios...`);
    
    try {
      // Usar cliente de serviço otimizado para cron
      const supabase = getSupabaseServiceClient();
      
      // 1. AGREGAÇÃO DE MÉTRICAS DIÁRIAS
      logger.cron(`[${cronRunId}] 📊 Executando agregação de métricas diárias...`);
      const { data: resultadosDiarios, error: erroDiarios } = await supabase.rpc('atualizar_metricas_resumo');
      
      if (erroDiarios) {
        logger.cron(`[${cronRunId}] ❌ Erro na agregação diária: ${erroDiarios.message}`);
      } else {
        logger.cron(`[${cronRunId}] ✅ Agregação diária: ${resultadosDiarios} registros processados`);
      }
      
      // 2. AGREGAÇÃO DE MÉTRICAS MENSAIS (primeira semana do mês)
      const hoje = new Date();
      if (hoje.getDate() <= 7) { // Executar na primeira semana do mês
        logger.cron(`[${cronRunId}] 📅 Executando agregação de métricas mensais...`);
        const { data: resultadosMensais, error: erroMensais } = await supabase.rpc('agregar_metricas_mensais');
        
        if (erroMensais) {
          logger.cron(`[${cronRunId}] ❌ Erro na agregação mensal: ${erroMensais.message}`);
        } else {
          logger.cron(`[${cronRunId}] ✅ Agregação mensal: ${resultadosMensais} registros processados`);
        }
      }
      
      // 3. AGREGAÇÃO DE MÉTRICAS TRIMESTRAIS (primeira semana do trimestre)
      const isInicioTrimestre = (hoje.getMonth() % 3 === 0) && (hoje.getDate() <= 7);
      if (isInicioTrimestre) {
        logger.cron(`[${cronRunId}] 📈 Executando agregação de métricas trimestrais...`);
        const { data: resultadosTrimestrais, error: erroTrimestrais } = await supabase.rpc('agregar_metricas_trimestrais');
        
        if (erroTrimestrais) {
          logger.cron(`[${cronRunId}] ❌ Erro na agregação trimestral: ${erroTrimestrais.message}`);
        } else {
          logger.cron(`[${cronRunId}] ✅ Agregação trimestral: ${resultadosTrimestrais} registros processados`);
        }
      }
      
      // 4. LIMPEZA DE DADOS ANTIGOS (manter 60 dias)
      logger.cron(`[${cronRunId}] 🗑️ Executando limpeza de dados antigos...`);
      const { data: resultadosLimpeza, error: erroLimpeza } = await supabase.rpc('limpar_eventos_anuncios_antigos', { dias_retencao: 60 });
      
      if (erroLimpeza) {
        logger.cron(`[${cronRunId}] ❌ Erro na limpeza: ${erroLimpeza.message}`);
      } else if (resultadosLimpeza) {
        // A função retorna um formato específico que precisa ser parseado
        const resultadoString = resultadosLimpeza.toString();
        const matches = resultadoString.match(/\((\d+),"([^"]+)",([^)]+)\)/);
        
        if (matches) {
          const registrosRemovidos = matches[1];
          const tamanhoLiberado = matches[2];
          const dataCorte = matches[3];
          logger.cron(`[${cronRunId}] ✅ Limpeza: ${registrosRemovidos} registros removidos, ${tamanhoLiberado} liberados (data corte: ${dataCorte})`);
        } else {
          logger.cron(`[${cronRunId}] ✅ Limpeza executada, resultado: ${resultadoString}`);
        }
      } else {
        logger.cron(`[${cronRunId}] ✅ Limpeza executada sem retorno de dados`);
      }
      
      logger.cron(`[${cronRunId}] 🎉 Processamento de métricas concluído com sucesso!`);
      
    } catch (errorMetricas) {
      logger.cron(`[${cronRunId}] ❌ ERRO no processamento de métricas: ${errorMetricas.message}`);
      // Não falhar o cron por erro de métricas, continuar...
    }
    
    // ============================================================================
    // SEÇÃO DE LIMPEZA DE SEGURANÇA - EXECUTAR AOS DOMINGOS
    // ============================================================================
    let resultadosLimpezaSeguranca = {
      executada: false,
      operacoes: []
    };
    
    // Verificar se é domingo (0 = domingo)
    const isDomingo = agora.getDay() === 0;
    
    if (isDomingo) {
      logger.cron(`[${cronRunId}] 🧹 DOMINGO DETECTADO - Iniciando limpeza de segurança...`);
      
      try {
        const supabase = getSupabaseServiceClient();
        resultadosLimpezaSeguranca.executada = true;

        // 1. Limpeza de logs antigos (manter apenas 30 dias)
        logger.cron(`[${cronRunId}] 📜 Limpando logs antigos (>30 dias)...`);
        try {
          const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const { data: deletedLogs, error: logsError } = await supabase
            .from('logs')
            .delete()
            .lt('data_hora', cutoffDate.toISOString())
            .select('id');

          const logsResult = {
            operation: 'cleanup_old_logs',
            status: logsError ? 'error' : 'success',
            records_affected: deletedLogs?.length || 0,
            error: logsError?.message
          };
          
          resultadosLimpezaSeguranca.operacoes.push(logsResult);
          
          if (logsError) {
            logger.cron(`[${cronRunId}] ❌ Erro na limpeza de logs: ${logsError.message}`);
          } else {
            logger.cron(`[${cronRunId}] ✅ Logs limpos: ${deletedLogs?.length || 0} registros removidos`);
          }
        } catch (error) {
          resultadosLimpezaSeguranca.operacoes.push({
            operation: 'cleanup_old_logs',
            status: 'error',
            error: error.message
          });
          logger.cron(`[${cronRunId}] ❌ Erro crítico na limpeza de logs: ${error.message}`);
        }

        // 2. Limpeza de registros de rate limiting antigos (manter apenas 7 dias)
        logger.cron(`[${cronRunId}] 🛡️ Limpando registros de rate limiting (>7 dias)...`);
        try {
          const rateLimitCleanup = await cleanupOldRecords(7);
          const rateLimitResult = {
            operation: 'cleanup_rate_limiting',
            status: rateLimitCleanup ? 'success' : 'error'
          };
          
          resultadosLimpezaSeguranca.operacoes.push(rateLimitResult);
          
          if (rateLimitCleanup) {
            logger.cron(`[${cronRunId}] ✅ Rate limiting limpo com sucesso`);
          } else {
            logger.cron(`[${cronRunId}] ❌ Falha na limpeza de rate limiting`);
          }
        } catch (error) {
          resultadosLimpezaSeguranca.operacoes.push({
            operation: 'cleanup_rate_limiting',
            status: 'error',
            error: error.message
          });
          logger.cron(`[${cronRunId}] ❌ Erro crítico na limpeza de rate limiting: ${error.message}`);
        }

        // 3. Limpeza de eventos de anúncios antigos processados (manter apenas 90 dias)
        logger.cron(`[${cronRunId}] 📊 Limpando eventos de anúncios processados (>90 dias)...`);
        try {
          const eventsCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
          const { data: deletedEvents, error: eventsError } = await supabase
            .from('eventos_anuncios')
            .delete()
            .eq('processado', true)
            .lt('timestamp', eventsCutoff.toISOString())
            .select('id');

          const eventsResult = {
            operation: 'cleanup_processed_events',
            status: eventsError ? 'error' : 'success',
            records_affected: deletedEvents?.length || 0,
            error: eventsError?.message
          };
          
          resultadosLimpezaSeguranca.operacoes.push(eventsResult);
          
          if (eventsError) {
            logger.cron(`[${cronRunId}] ❌ Erro na limpeza de eventos: ${eventsError.message}`);
          } else {
            logger.cron(`[${cronRunId}] ✅ Eventos limpos: ${deletedEvents?.length || 0} registros removidos`);
          }
        } catch (error) {
          resultadosLimpezaSeguranca.operacoes.push({
            operation: 'cleanup_processed_events',
            status: 'error',
            error: error.message
          });
          logger.cron(`[${cronRunId}] ❌ Erro crítico na limpeza de eventos: ${error.message}`);
        }

        // 4. Limpeza de atividades suspeitas antigas (manter apenas 180 dias)
        logger.cron(`[${cronRunId}] 🚨 Limpando atividades suspeitas (>180 dias)...`);
        try {
          const suspiciousCutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
          const { data: deletedSuspicious, error: suspiciousError } = await supabase
            .from('atividades_suspeitas')
            .delete()
            .lt('data_hora', suspiciousCutoff.toISOString())
            .select('id');

          const suspiciousResult = {
            operation: 'cleanup_suspicious_activities',
            status: suspiciousError ? 'error' : 'success',
            records_affected: deletedSuspicious?.length || 0,
            error: suspiciousError?.message
          };
          
          resultadosLimpezaSeguranca.operacoes.push(suspiciousResult);
          
          if (suspiciousError) {
            logger.cron(`[${cronRunId}] ❌ Erro na limpeza de atividades suspeitas: ${suspiciousError.message}`);
          } else {
            logger.cron(`[${cronRunId}] ✅ Atividades suspeitas limpas: ${deletedSuspicious?.length || 0} registros removidos`);
          }
        } catch (error) {
          resultadosLimpezaSeguranca.operacoes.push({
            operation: 'cleanup_suspicious_activities',
            status: 'error',
            error: error.message
          });
          logger.cron(`[${cronRunId}] ❌ Erro crítico na limpeza de atividades suspeitas: ${error.message}`);
        }

        // 5. Otimização de índices (VACUUM ANALYZE)
        logger.cron(`[${cronRunId}] ⚡ Otimizando tabelas do banco...`);
        try {
          // Nota: VACUUM não pode ser executado em transação, então fazemos apenas ANALYZE
          await supabase.rpc('analyze_tables_security');
          resultadosLimpezaSeguranca.operacoes.push({
            operation: 'optimize_tables',
            status: 'success'
          });
          logger.cron(`[${cronRunId}] ✅ Otimização de tabelas concluída`);
        } catch (error) {
          resultadosLimpezaSeguranca.operacoes.push({
            operation: 'optimize_tables',
            status: 'warning',
            error: 'ANALYZE function not available'
          });
          logger.cron(`[${cronRunId}] ⚠️ Otimização de tabelas não disponível: ${error.message}`);
        }

        // Registrar limpeza nos logs
        try {
          const successCount = resultadosLimpezaSeguranca.operacoes.filter(op => op.status === 'success').length;
          const errorCount = resultadosLimpezaSeguranca.operacoes.filter(op => op.status === 'error').length;
          
          await supabase.from('logs').insert([{
            descricao: `Limpeza automática de segurança integrada executada - ${resultadosLimpezaSeguranca.operacoes.length} operações (${successCount} sucessos, ${errorCount} erros)`
          }]);
          
          logger.cron(`[${cronRunId}] 📝 Log de limpeza registrado no banco`);
        } catch (logError) {
          logger.cron(`[${cronRunId}] ⚠️ Erro ao registrar log de limpeza: ${logError.message}`);
        }

        logger.cron(`[${cronRunId}] 🧹 LIMPEZA DE SEGURANÇA CONCLUÍDA!`);
        
      } catch (errorLimpezaSeguranca) {
        logger.cron(`[${cronRunId}] ❌ ERRO na limpeza de segurança: ${errorLimpezaSeguranca.message}`);
        resultadosLimpezaSeguranca.operacoes.push({
          operation: 'security_cleanup_general',
          status: 'error',
          error: errorLimpezaSeguranca.message
        });
        // Não falhar o cron por erro de limpeza, continuar...
      }
      
    } else {
      logger.cron(`[${cronRunId}] ℹ️ Limpeza de segurança agendada apenas para domingos (hoje: ${agora.toLocaleDateString('pt-BR', { weekday: 'long' })})`);
    }
    
    // Processo concluído
    logger.cron(`[${cronRunId}] ===== FIM CRON JOB [SUCESSO] =====`);
    return successResponse(res, 'Sorteio, métricas e limpeza de segurança processados com sucesso', {
      sorteio: resultadoSorteio,
      metricas: 'Processadas com sucesso',
      limpeza_seguranca: resultadosLimpezaSeguranca
    });

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
module.exports = withErrorHandling(handler); 