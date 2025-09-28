/**
 * SCRIPT DE LIMPEZA DE SEGURANÇA AUTOMATIZADA
 * ===========================================
 * 
 * Executa limpeza automática de dados de segurança antigos
 * Previne acúmulo excessivo de logs e registros de rate limiting
 * 
 * @author Sistema de Segurança v1.0
 * @date 2025-01-15
 */

const { getSupabaseServiceClient } = require('../src/lib/supabaseManager');
const { cleanupOldRecords } = require('../src/middleware/rateLimiting');
const { withErrorHandling, successResponse, errorResponse } = require('../lib/apiResponse');

const supabase = getSupabaseServiceClient();

async function handler(req, res) {
  try {
    // SEGURANÇA: Apenas com autenticação válida
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 404, 'Endpoint não encontrado');
    }
    
    const token = authHeader.split(' ')[1];
    if (token !== process.env.API_SECRET_KEY) {
      return errorResponse(res, 404, 'Endpoint não encontrado');
    }

    const results = {
      timestamp: new Date().toISOString(),
      operations: []
    };

    // 1. Limpeza de logs antigos (manter apenas 30 dias)
    try {
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const { data: deletedLogs, error: logsError } = await supabase
        .from('logs')
        .delete()
        .lt('data_hora', cutoffDate.toISOString())
        .select('id');

      results.operations.push({
        operation: 'cleanup_old_logs',
        status: logsError ? 'error' : 'success',
        records_affected: deletedLogs?.length || 0,
        error: logsError?.message
      });
    } catch (error) {
      results.operations.push({
        operation: 'cleanup_old_logs',
        status: 'error',
        error: error.message
      });
    }

    // 2. Limpeza de registros de rate limiting antigos (manter apenas 7 dias)
    try {
      const rateLimitCleanup = await cleanupOldRecords(7);
      results.operations.push({
        operation: 'cleanup_rate_limiting',
        status: rateLimitCleanup ? 'success' : 'error'
      });
    } catch (error) {
      results.operations.push({
        operation: 'cleanup_rate_limiting',
        status: 'error',
        error: error.message
      });
    }

    // 3. Limpeza de eventos de anúncios antigos não processados (manter apenas 90 dias)
    try {
      const eventsCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const { data: deletedEvents, error: eventsError } = await supabase
        .from('eventos_anuncios')
        .delete()
        .eq('processado', true)
        .lt('timestamp', eventsCutoff.toISOString())
        .select('id');

      results.operations.push({
        operation: 'cleanup_processed_events',
        status: eventsError ? 'error' : 'success',
        records_affected: deletedEvents?.length || 0,
        error: eventsError?.message
      });
    } catch (error) {
      results.operations.push({
        operation: 'cleanup_processed_events',
        status: 'error',
        error: error.message
      });
    }

    // 4. Limpeza de atividades suspeitas antigas (manter apenas 180 dias)
    try {
      const suspiciousCutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
      const { data: deletedSuspicious, error: suspiciousError } = await supabase
        .from('atividades_suspeitas')
        .delete()
        .lt('data_hora', suspiciousCutoff.toISOString())
        .select('id');

      results.operations.push({
        operation: 'cleanup_suspicious_activities',
        status: suspiciousError ? 'error' : 'success',
        records_affected: deletedSuspicious?.length || 0,
        error: suspiciousError?.message
      });
    } catch (error) {
      results.operations.push({
        operation: 'cleanup_suspicious_activities',
        status: 'error',
        error: error.message
      });
    }

    // 5. Otimização de índices (VACUUM ANALYZE)
    try {
      // Nota: VACUUM não pode ser executado em transação, então fazemos apenas ANALYZE
      await supabase.rpc('analyze_tables_security');
      results.operations.push({
        operation: 'optimize_tables',
        status: 'success'
      });
    } catch (error) {
      results.operations.push({
        operation: 'optimize_tables',
        status: 'warning',
        error: 'ANALYZE function not available'
      });
    }

    // Registrar limpeza nos logs
    await supabase.from('logs').insert([{
      descricao: `Limpeza automática de segurança executada - ${results.operations.length} operações`
    }]);

    const successCount = results.operations.filter(op => op.status === 'success').length;
    const errorCount = results.operations.filter(op => op.status === 'error').length;

    return successResponse(res, 'Limpeza de segurança concluída', {
      summary: {
        total_operations: results.operations.length,
        successful: successCount,
        errors: errorCount
      },
      details: results
    });

  } catch (error) {
    console.error('Erro na limpeza de segurança:', error);
    return errorResponse(res, 500, 'Erro na limpeza', error.message);
  }
}

module.exports = withErrorHandling(handler);
