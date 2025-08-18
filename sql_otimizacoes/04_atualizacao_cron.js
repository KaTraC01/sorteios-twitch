// ===================================================================
// SCRIPT 4: ATUALIZAÇÃO DO CRON JOB
// ===================================================================
// Descrição: Modifica o cron job existente para incluir manutenção
//            das métricas de anúncios junto com o sorteio
// Arquivo: api/cron/route.js
// ===================================================================

import fetch from 'node-fetch';
import logger from '../../lib/logger';
import { errorResponse, successResponse, withErrorHandling } from '../../lib/apiResponse';
import { createClient } from '@supabase/supabase-js';

// Inicializar cliente Supabase para operações de manutenção
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function handler(req, res) {
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
    logger.cron(`Hora Brasília: ${horaBrasilia.toISOString()}`);
    
    // Verificar variáveis de ambiente críticas
    const configVars = {
      API_SECRET_KEY: !!process.env.API_SECRET_KEY,
      BASE_URL: !!process.env.BASE_URL,
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY
    };
    
    logger.cron(`[${cronRunId}] Status de configuração: ${JSON.stringify(configVars)}`);
    
    if (!process.env.API_SECRET_KEY) {
      logger.critical('A variável de ambiente API_SECRET_KEY não está configurada.');
      return errorResponse(res, 500, 'Configuração do servidor incompleta', 'API_SECRET_KEY não configurada');
    }
    
    if (!process.env.BASE_URL) {
      logger.critical('A variável de ambiente BASE_URL não está configurada.');
      return errorResponse(res, 500, 'Configuração do servidor incompleta', 'BASE_URL não configurada');
    }

    // ===================================================================
    // NOVA FUNCIONALIDADE: MANUTENÇÃO DE MÉTRICAS
    // ===================================================================
    logger.cron(`[${cronRunId}] Iniciando manutenção de métricas de anúncios...`);
    
    const resultadosManutencao = await executarManutencaoMetricas(cronRunId);
    
    // ===================================================================
    // FUNCIONALIDADE ORIGINAL: SORTEIO
    // ===================================================================
    logger.cron(`[${cronRunId}] Iniciando requisição para API de sorteio...`);
    
    const resultadoSorteio = await realizarSorteio(cronRunId);
    
    // ===================================================================
    // RESULTADO CONSOLIDADO
    // ===================================================================
    const resultadoFinal = {
      cronRunId,
      horario: {
        utc: agora.toISOString(),
        brasilia: horaBrasilia.toISOString()
      },
      tarefas: {
        manutencao_metricas: resultadosManutencao,
        sorteio: resultadoSorteio
      }
    };
    
    logger.cron(`[${cronRunId}] ===== FIM CRON JOB [SUCESSO] =====`);
    return successResponse(res, 'Cron job executado com sucesso', resultadoFinal);

  } catch (error) {
    logger.cron(`[${cronRunId}] ❌❌❌ ERRO CRÍTICO NO CRON JOB ❌❌❌`);
    logger.cron(`[${cronRunId}] Mensagem: ${error.message}`);
    logger.cron(`[${cronRunId}] Stack: ${error.stack || 'Sem stack trace'}`);
    
    logger.cron(`[${cronRunId}] ===== FIM CRON JOB [FALHA] =====`);
    return errorResponse(res, 500, 'Erro interno do servidor', error);
  }
}

// ===================================================================
// NOVA FUNÇÃO: MANUTENÇÃO DE MÉTRICAS
// ===================================================================
async function executarManutencaoMetricas(cronRunId) {
  try {
    logger.cron(`[${cronRunId}] Executando função de manutenção de métricas...`);
    
    // Executar função principal de manutenção criada no script SQL
    const { data: resultados, error } = await supabase
      .rpc('executar_manutencao_metricas');
    
    if (error) {
      logger.cron(`[${cronRunId}] ❌ Erro na manutenção de métricas: ${error.message}`);
      throw error;
    }
    
    // Processar resultados de cada tarefa
    const tarefas = {};
    resultados.forEach(resultado => {
      tarefas[resultado.tarefa] = {
        status: resultado.status,
        detalhes: resultado.detalhes
      };
      
      if (resultado.status === 'sucesso') {
        logger.cron(`[${cronRunId}] ✅ ${resultado.tarefa}: ${resultado.detalhes}`);
      } else {
        logger.cron(`[${cronRunId}] ❌ ${resultado.tarefa}: ${resultado.detalhes}`);
      }
    });
    
    // Registrar resultado geral da manutenção
    const sucessos = resultados.filter(r => r.status === 'sucesso').length;
    const erros = resultados.filter(r => r.status === 'erro').length;
    
    await supabase
      .from('logs')
      .insert([{
        descricao: `Manutenção de métricas: ${sucessos} sucessos, ${erros} erros`
      }]);
    
    logger.cron(`[${cronRunId}] Manutenção de métricas concluída: ${sucessos} sucessos, ${erros} erros`);
    
    return {
      sucesso: erros === 0,
      tarefas_executadas: resultados.length,
      sucessos,
      erros,
      detalhes: tarefas
    };
    
  } catch (error) {
    logger.cron(`[${cronRunId}] ❌ Erro crítico na manutenção de métricas: ${error.message}`);
    
    // Registrar erro crítico
    await supabase
      .from('logs')
      .insert([{
        descricao: `ERRO CRÍTICO na manutenção de métricas: ${error.message}`
      }]);
    
    return {
      sucesso: false,
      erro: error.message
    };
  }
}

// ===================================================================
// FUNÇÃO ORIGINAL: SORTEIO (MANTIDA INTACTA)
// ===================================================================
async function realizarSorteio(cronRunId) {
  const baseUrl = process.env.BASE_URL;
  logger.cron(`[${cronRunId}] URL base configurada: ${baseUrl}`);
  
  const urlSorteio = `${baseUrl}/api/sorteio`;
  const payloadSorteio = { action: 'sorteio' };
  
  try {
    logger.cron(`[${cronRunId}] Enviando requisição para ${urlSorteio}`);
    
    const inicioRequest = Date.now();
    
    const respostaSorteio = await fetch(urlSorteio, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.API_SECRET_KEY}`,
        'X-Cron-Run-ID': cronRunId
      },
      body: JSON.stringify(payloadSorteio),
      timeout: 8000
    });
    
    const fimRequest = Date.now();
    const tempoRequest = fimRequest - inicioRequest;
    
    logger.cron(`[${cronRunId}] Resposta recebida em ${tempoRequest}ms - Status: ${respostaSorteio.status}`);
    
    if (!respostaSorteio.ok) {
      const errorData = await respostaSorteio.json();
      throw new Error(`Erro HTTP ${respostaSorteio.status}: ${JSON.stringify(errorData)}`);
    }
    
    const resultadoSorteio = await respostaSorteio.json();
    
    const vencedorNome = resultadoSorteio.resultado?.vencedor?.nome || 'N/A';
    const vencedorStreamer = resultadoSorteio.resultado?.vencedor?.streamer || 'N/A';
    const sorteioId = resultadoSorteio.resultado?.sorteioId || 'N/A';
    
    logger.cron(`[${cronRunId}] ✅ SORTEIO REALIZADO COM SUCESSO!`);
    logger.cron(`[${cronRunId}] ✅ Vencedor: ${vencedorNome}`);
    logger.cron(`[${cronRunId}] ✅ Streamer: ${vencedorStreamer}`);
    logger.cron(`[${cronRunId}] ✅ ID do Sorteio: ${sorteioId}`);
    
    return {
      sucesso: true,
      vencedor: vencedorNome,
      streamer: vencedorStreamer,
      sorteioId,
      tempoExecucao: tempoRequest
    };
    
  } catch (error) {
    logger.cron(`[${cronRunId}] ❌ ERRO NO SORTEIO: ${error.message}`);
    throw error;
  }
}

// Exportar o handler com o middleware de tratamento de erros
export default withErrorHandling(handler);

// ===================================================================
// INSTRUÇÕES DE IMPLEMENTAÇÃO
// ===================================================================
/*
1. Substitua o conteúdo do arquivo api/cron/route.js por este código

2. Verifique se as dependências estão instaladas:
   npm install @supabase/supabase-js

3. Teste o cron job localmente:
   curl -X POST http://localhost:3000/api/cron/route \
   -H "Authorization: Bearer SEU_API_SECRET_KEY"

4. Monitore os logs do Vercel após o deploy para confirmar execução:
   - Vercel Dashboard > Functions > Logs
   - Procure por "[cronRunId] Manutenção de métricas"

5. Valide no Supabase:
   - Verifique a tabela 'logs' para entradas de manutenção
   - Execute: SELECT * FROM relatorio_uso_espaco_metricas();
   - Confirme se resumos diários estão sendo criados automaticamente

OBSERVAÇÃO IMPORTANTE:
- Este código mantém a funcionalidade original do sorteio INTACTA
- Adiciona a manutenção de métricas como nova funcionalidade
- Respeita a limitação do Vercel Free (1 cron job apenas)
- Inclui logging detalhado para monitoramento
- Trata erros individualmente sem quebrar outras operações
*/
