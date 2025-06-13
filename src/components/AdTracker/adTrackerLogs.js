/**
 * AdTrackerLogs - Sistema centralizado de logs para monitoramento de eventos do AdTracker
 * 
 * Este módulo implementa um sistema de logs persistentes para monitorar eventos críticos
 * do AdTracker, especialmente falhas de envio e eventos perdidos.
 */

// Configurações
const LOGS_STORAGE_KEY = 'adtracker_logs';
const LOGS_MAX_SIZE = 200; // Máximo de logs armazenados
const LOGS_RETENTION_DAYS = 3; // Dias para manter logs antigos

// Tipos de logs
export const LOG_TYPES = {
  BEACON_ATTEMPT: 'beacon_attempt',      // Tentativa de envio via sendBeacon
  BEACON_SUCCESS: 'beacon_success',      // Sucesso no envio via sendBeacon
  BEACON_FAILURE: 'beacon_failure',      // Falha no envio via sendBeacon
  FLUSH_ATTEMPT: 'flush_attempt',        // Tentativa de flush do buffer
  FLUSH_SUCCESS: 'flush_success',        // Sucesso no flush do buffer
  FLUSH_FAILURE: 'flush_failure',        // Falha no flush do buffer
  BUFFER_ADD: 'buffer_add',              // Evento adicionado ao buffer
  BUFFER_OVERFLOW: 'buffer_overflow',    // Buffer atingiu tamanho limite
  BUFFER_STALE: 'buffer_stale',          // Evento ficou muito tempo no buffer
  PAGE_UNLOAD: 'page_unload',            // Página fechada/recarregada
  RECOVERY_ATTEMPT: 'recovery_attempt',  // Tentativa de recuperar eventos
  RECOVERY_SUCCESS: 'recovery_success',  // Sucesso na recuperação de eventos
  RECOVERY_FAILURE: 'recovery_failure'   // Falha na recuperação de eventos
};

// Array global para armazenar logs em memória
let adTrackerLogs = [];

/**
 * Inicializa o sistema de logs
 */
export const initLogs = () => {
  if (typeof window === 'undefined') return;
  
  // Recuperar logs anteriores do localStorage
  try {
    const storedLogs = localStorage.getItem(LOGS_STORAGE_KEY);
    if (storedLogs) {
      adTrackerLogs = JSON.parse(storedLogs);
      
      // Limpar logs antigos (mais de X dias)
      const now = Date.now();
      const maxAge = LOGS_RETENTION_DAYS * 24 * 60 * 60 * 1000; // dias em ms
      adTrackerLogs = adTrackerLogs.filter(log => {
        return (now - new Date(log.timestamp).getTime()) < maxAge;
      });
      
      // Truncar se exceder o tamanho máximo
      if (adTrackerLogs.length > LOGS_MAX_SIZE) {
        adTrackerLogs = adTrackerLogs.slice(-LOGS_MAX_SIZE);
      }
      
      console.log(`%c[AdTrackerLogs] ${adTrackerLogs.length} logs recuperados do localStorage`, 'color: #9C27B0');
    }
  } catch (error) {
    console.error('%c[AdTrackerLogs] Erro ao recuperar logs:', 'color: red', error);
    adTrackerLogs = [];
  }
  
  // Expor logs no escopo global para debugging
  window.adTrackerLogs = adTrackerLogs;
  
  // Adicionar listener para salvar logs no beforeunload
  window.addEventListener('beforeunload', () => {
    saveLogs();
  });
  
  // Adicionar funções de diagnóstico ao escopo global
  if (process.env.NODE_ENV === 'development') {
    window.adTrackerDiagnostico = diagnosticarAdTracker;
    window.limparLogsAdTracker = limparLogs;
    console.log('%c[AdTrackerLogs] Funções de diagnóstico disponíveis: window.adTrackerDiagnostico(), window.limparLogsAdTracker()', 'color: #9C27B0');
  }
};

/**
 * Adiciona um novo log ao sistema
 * @param {string} tipo - Tipo do log (usar LOG_TYPES)
 * @param {object} detalhes - Detalhes do log
 */
export const adicionarLog = (tipo, detalhes = {}) => {
  if (typeof window === 'undefined') return;
  
  // Criar objeto de log
  const log = {
    tipo,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    ...detalhes
  };
  
  // Adicionar ao array em memória
  adTrackerLogs.push(log);
  
  // Truncar se exceder o tamanho máximo
  if (adTrackerLogs.length > LOGS_MAX_SIZE) {
    adTrackerLogs.shift(); // Remover o log mais antigo
  }
  
  // Atualizar a referência global
  if (typeof window !== 'undefined') {
    window.adTrackerLogs = adTrackerLogs;
  }
  
  // Salvar logs periodicamente (não a cada log para evitar sobrecarga)
  if (adTrackerLogs.length % 10 === 0) {
    saveLogs();
  }
  
  return log;
};

/**
 * Salva os logs no localStorage
 */
export const saveLogs = () => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(adTrackerLogs));
  } catch (error) {
    console.error('%c[AdTrackerLogs] Erro ao salvar logs:', 'color: red', error);
    
    // Se o erro for de espaço, reduzir pela metade
    if (error.name === 'QuotaExceededError') {
      adTrackerLogs = adTrackerLogs.slice(-Math.floor(LOGS_MAX_SIZE / 2));
      try {
        localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(adTrackerLogs));
      } catch (e) {
        // Se ainda falhar, desistir
      }
    }
  }
};

/**
 * Limpa todos os logs
 */
export const limparLogs = () => {
  adTrackerLogs = [];
  if (typeof window !== 'undefined') {
    window.adTrackerLogs = adTrackerLogs;
    localStorage.removeItem(LOGS_STORAGE_KEY);
    console.log('%c[AdTrackerLogs] Todos os logs foram limpos', 'background: #F44336; color: white; padding: 3px 5px; border-radius: 3px');
  }
  return 'Logs do AdTracker limpos com sucesso!';
};

/**
 * Função de diagnóstico para analisar logs e eventos
 */
export const diagnosticarAdTracker = () => {
  if (typeof window === 'undefined') return 'Indisponível no servidor';
  
  try {
    // Recuperar eventos do buffer
    const eventosBuffer = JSON.parse(localStorage.getItem('adtracker_events_buffer') || '[]');
    
    // Estatísticas de logs
    const stats = {
      total_logs: adTrackerLogs.length,
      logs_por_tipo: {},
      beacon_attempts: 0,
      beacon_success: 0,
      beacon_failure: 0,
      eventos_pendentes: eventosBuffer.length,
      eventos_por_tipo: {},
      tempo_medio_no_buffer: 0,
      eventos_antigos: 0,
      erros_frequentes: {}
    };
    
    // Contar logs por tipo
    adTrackerLogs.forEach(log => {
      stats.logs_por_tipo[log.tipo] = (stats.logs_por_tipo[log.tipo] || 0) + 1;
      
      // Contar tentativas e resultados de beacon
      if (log.tipo === LOG_TYPES.BEACON_ATTEMPT) stats.beacon_attempts++;
      if (log.tipo === LOG_TYPES.BEACON_SUCCESS) stats.beacon_success++;
      if (log.tipo === LOG_TYPES.BEACON_FAILURE) {
        stats.beacon_failure++;
        
        // Contar erros frequentes
        const motivo = log.motivo || 'desconhecido';
        stats.erros_frequentes[motivo] = (stats.erros_frequentes[motivo] || 0) + 1;
      }
    });
    
    // Calcular taxa de sucesso do beacon
    stats.beacon_taxa_sucesso = stats.beacon_attempts > 0 
      ? (stats.beacon_success / stats.beacon_attempts * 100).toFixed(1) + '%' 
      : 'N/A';
    
    // Analisar eventos pendentes
    if (eventosBuffer.length > 0) {
      // Contar por tipo de anúncio
      eventosBuffer.forEach(evento => {
        const tipo = evento.tipo_anuncio || 'desconhecido';
        stats.eventos_por_tipo[tipo] = (stats.eventos_por_tipo[tipo] || 0) + 1;
        
        // Verificar idade do evento
        if (evento.timestamp) {
          const idade = Date.now() - new Date(evento.timestamp).getTime();
          if (idade > 24 * 60 * 60 * 1000) { // mais de 24h
            stats.eventos_antigos++;
          }
        }
      });
      
      // Verificar tempo médio no buffer
      const agora = Date.now();
      let tempoTotal = 0;
      let eventosComTimestamp = 0;
      
      eventosBuffer.forEach(evento => {
        if (evento.timestamp) {
          tempoTotal += agora - new Date(evento.timestamp).getTime();
          eventosComTimestamp++;
        }
      });
      
      if (eventosComTimestamp > 0) {
        stats.tempo_medio_no_buffer = Math.round(tempoTotal / eventosComTimestamp / 1000) + 's';
      }
    }
    
    // Exibir relatório no console
    console.log('%c[AdTrackerDiagnóstico] Relatório de Saúde do Sistema', 
      'background: #4CAF50; color: white; font-size: 14px; padding: 5px; border-radius: 3px');
    
    console.log('%c[AdTrackerDiagnóstico] Estatísticas de Logs:', 'color: #2196F3; font-weight: bold');
    console.table(stats.logs_por_tipo);
    
    console.log('%c[AdTrackerDiagnóstico] Estatísticas de SendBeacon:', 'color: #2196F3; font-weight: bold');
    console.table({
      tentativas: stats.beacon_attempts,
      sucessos: stats.beacon_success,
      falhas: stats.beacon_failure,
      taxa_sucesso: stats.beacon_taxa_sucesso
    });
    
    console.log('%c[AdTrackerDiagnóstico] Eventos Pendentes:', 'color: #2196F3; font-weight: bold');
    console.table({
      total: stats.eventos_pendentes,
      tempo_medio_no_buffer: stats.tempo_medio_no_buffer,
      eventos_antigos: stats.eventos_antigos
    });
    
    if (Object.keys(stats.eventos_por_tipo).length > 0) {
      console.log('%c[AdTrackerDiagnóstico] Eventos por Tipo de Anúncio:', 'color: #2196F3; font-weight: bold');
      console.table(stats.eventos_por_tipo);
    }
    
    if (Object.keys(stats.erros_frequentes).length > 0) {
      console.log('%c[AdTrackerDiagnóstico] Erros Frequentes:', 'color: #2196F3; font-weight: bold');
      console.table(stats.erros_frequentes);
    }
    
    // Últimos 10 logs para análise
    console.log('%c[AdTrackerDiagnóstico] Últimos 10 logs:', 'color: #2196F3; font-weight: bold');
    console.table(adTrackerLogs.slice(-10));
    
    return stats;
  } catch (error) {
    console.error('%c[AdTrackerDiagnóstico] Erro ao gerar diagnóstico:', 'color: red', error);
    return 'Erro ao gerar diagnóstico. Veja o console para detalhes.';
  }
};

// Inicializar automaticamente
if (typeof window !== 'undefined') {
  initLogs();
}

export default {
  adicionarLog,
  LOG_TYPES,
  diagnosticarAdTracker,
  limparLogs
}; 