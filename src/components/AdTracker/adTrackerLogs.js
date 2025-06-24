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
const BUFFER_STORAGE_KEY = 'adtracker_events_buffer'; // Chave para localStorage

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
  RECOVERY_FAILURE: 'recovery_failure',  // Falha na recuperação de eventos
  VISIBILITY_CHANGE: 'visibility_change', // Mudança de visibilidade da página
  BATCH_DIVISION: 'batch_division',      // Divisão de eventos em lotes
  PAYLOAD_OPTIMIZATION: 'payload_optimization', // Otimização de payload
  COMPRESSION_APPLIED: 'compression_applied', // Compressão de dados aplicada
  API_CALL: 'api_call'                   // Chamada para API
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
    window.limparLogsAdTracker = limparLogs;
    console.log('%c[AdTrackerLogs] Funções de diagnóstico disponíveis: window.limparLogsAdTracker()', 'color: #9C27B0');
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
 * Visualiza eventos pendentes no buffer
 */
export const verEventosPendentes = () => {
  if (typeof window === 'undefined') return 'Indisponível no servidor';
  
  try {
    // Recuperar eventos do buffer
    const eventosBuffer = JSON.parse(localStorage.getItem(BUFFER_STORAGE_KEY) || '[]');
    
    if (eventosBuffer.length === 0) {
      console.log('%c[AdTracker] Nenhum evento pendente no buffer', 'background: #4CAF50; color: white; padding: 3px 5px; border-radius: 3px');
      return 'Nenhum evento pendente no buffer';
    }
    
    console.log('%c[AdTracker] Eventos pendentes no buffer:', 'background: #2196F3; color: white; padding: 3px 5px; border-radius: 3px');
    console.table(eventosBuffer);
    
    // Calcular idade dos eventos
    const agora = new Date();
    const eventosComIdade = eventosBuffer.map(evento => {
      const timestamp = evento.timestamp ? new Date(evento.timestamp) : null;
      const idadeMs = timestamp ? agora - timestamp : null;
      const idadeMin = idadeMs ? Math.round(idadeMs / 60000) : 'N/A';
      
      return {
        ...evento,
        idade_minutos: idadeMin
      };
    });
    
    // Eventos antigos (mais de 5 minutos)
    const eventosAntigos = eventosComIdade.filter(e => e.idade_minutos !== 'N/A' && e.idade_minutos > 5);
    if (eventosAntigos.length > 0) {
      console.log('%c[AdTracker] ALERTA: Eventos antigos detectados!', 'background: #FF5722; color: white; padding: 3px 5px; border-radius: 3px');
      console.table(eventosAntigos);
    }
    
    return {
      total: eventosBuffer.length,
      eventos: eventosComIdade,
      eventos_antigos: eventosAntigos.length
    };
  } catch (error) {
    console.error('%c[AdTracker] Erro ao verificar eventos pendentes:', 'color: red', error);
    return `Erro ao verificar eventos pendentes: ${error.message}`;
  }
};

/**
 * Função de diagnóstico para analisar logs e eventos
 */
export const diagnosticarAdTracker = () => {
  if (typeof window === 'undefined') return 'Indisponível no servidor';
  
  try {
    // Recuperar eventos do buffer
    const eventosBuffer = JSON.parse(localStorage.getItem(BUFFER_STORAGE_KEY) || '[]');
    
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
      erros_frequentes: {},
      otimizacao_payload: {
        aplicada: 0,
        tamanho_original: 0,
        tamanho_otimizado: 0,
        reducao_media: '0%'
      },
      divisao_lotes: {
        ocorrencias: 0,
        lotes_totais: 0,
        media_por_divisao: 0
      },
      visibilidade: {
        mudancas: 0,
        oculta: 0,
        visivel: 0
      }
    };
    
    // Contar logs por tipo
    adTrackerLogs.forEach(log => {
      stats.logs_por_tipo[log.tipo] = (stats.logs_por_tipo[log.tipo] || 0) + 1;
      
      // Contar tentativas e resultados de beacon
      if (log.tipo === LOG_TYPES.BEACON_ATTEMPT) stats.beacon_attempts++;
      if (log.tipo === LOG_TYPES.BEACON_SUCCESS) {
        stats.beacon_success++;
        
        // Verificar se houve otimização de payload
        if (log.tamanho_otimizado) {
          stats.otimizacao_payload.aplicada++;
          
          // Se tiver informação sobre tamanho original vs otimizado
          if (log.tamanho_original && log.tamanho_payload) {
            stats.otimizacao_payload.tamanho_original += log.tamanho_original;
            stats.otimizacao_payload.tamanho_otimizado += log.tamanho_payload;
          }
        }
      }
      
      if (log.tipo === LOG_TYPES.BEACON_FAILURE) {
        stats.beacon_failure++;
        
        // Contar erros frequentes
        const motivo = log.motivo || 'desconhecido';
        stats.erros_frequentes[motivo] = (stats.erros_frequentes[motivo] || 0) + 1;
      }
      
      // Estatísticas de divisão em lotes
      if (log.tipo === LOG_TYPES.BATCH_DIVISION) {
        stats.divisao_lotes.ocorrencias++;
        stats.divisao_lotes.lotes_totais += (log.numero_lotes || 0);
      }
      
      // Estatísticas de visibilidade
      if (log.tipo === LOG_TYPES.VISIBILITY_CHANGE) {
        stats.visibilidade.mudancas++;
        if (log.visibilidade === 'oculta') stats.visibilidade.oculta++;
        if (log.visibilidade === 'visivel') stats.visibilidade.visivel++;
      }
    });
    
    // Calcular taxa de sucesso do beacon
    stats.beacon_taxa_sucesso = stats.beacon_attempts > 0 
      ? (stats.beacon_success / stats.beacon_attempts * 100).toFixed(1) + '%' 
      : 'N/A';
    
    // Calcular média de lotes por divisão
    if (stats.divisao_lotes.ocorrencias > 0) {
      stats.divisao_lotes.media_por_divisao = 
        (stats.divisao_lotes.lotes_totais / stats.divisao_lotes.ocorrencias).toFixed(1);
    }
    
    // Calcular redução média de payload
    if (stats.otimizacao_payload.aplicada > 0 && 
        stats.otimizacao_payload.tamanho_original > 0 &&
        stats.otimizacao_payload.tamanho_otimizado > 0) {
      const reducao = (1 - (stats.otimizacao_payload.tamanho_otimizado / stats.otimizacao_payload.tamanho_original)) * 100;
      stats.otimizacao_payload.reducao_media = reducao.toFixed(1) + '%';
    }
    
    // Contar eventos por tipo
    const tiposEvento = {};
    eventosBuffer.forEach(evento => {
      const tipo = evento.tipo_evento || 'desconhecido';
      tiposEvento[tipo] = (tiposEvento[tipo] || 0) + 1;
    });
    stats.eventos_por_tipo = tiposEvento;
    
    // Verificar eventos antigos
    const agora = new Date();
    let somaIdade = 0;
    let contadorComTimestamp = 0;
    
    eventosBuffer.forEach(evento => {
      if (evento.timestamp) {
        const timestamp = new Date(evento.timestamp);
        const idadeMs = agora - timestamp;
        const idadeMin = idadeMs / 60000; // em minutos
        
        somaIdade += idadeMin;
        contadorComTimestamp++;
        
        // Contar eventos com mais de 5 minutos
        if (idadeMin > 5) {
          stats.eventos_antigos++;
        }
      }
    });
    
    // Calcular tempo médio no buffer (em minutos)
    if (contadorComTimestamp > 0) {
      stats.tempo_medio_no_buffer = (somaIdade / contadorComTimestamp).toFixed(1);
    }
    
    // Exibir estatísticas no console
    console.group('%c[AdTracker] Diagnóstico', 'background: #2196F3; color: white; padding: 3px 5px; border-radius: 3px');
    
    console.log('📊 Estatísticas de logs:');
    console.table(stats.logs_por_tipo);
    
    console.log(`📤 Taxa de sucesso do sendBeacon: ${stats.beacon_taxa_sucesso} (${stats.beacon_success}/${stats.beacon_attempts})`);
    
    console.log(`🔄 Eventos pendentes: ${stats.eventos_pendentes} (${stats.eventos_antigos} antigos)`);
    if (stats.eventos_pendentes > 0) {
      console.log(`⏱️ Tempo médio no buffer: ${stats.tempo_medio_no_buffer} minutos`);
      console.table(stats.eventos_por_tipo);
    }
    
    if (Object.keys(stats.erros_frequentes).length > 0) {
      console.log('❌ Erros frequentes:');
      console.table(stats.erros_frequentes);
    }
    
    if (stats.otimizacao_payload.aplicada > 0) {
      console.log('📦 Otimização de payload:');
      console.log(`- Aplicada em ${stats.otimizacao_payload.aplicada} envios`);
      console.log(`- Redução média: ${stats.otimizacao_payload.reducao_media}`);
    }
    
    if (stats.divisao_lotes.ocorrencias > 0) {
      console.log('📚 Divisão em lotes:');
      console.log(`- Ocorrências: ${stats.divisao_lotes.ocorrencias}`);
      console.log(`- Média de lotes por divisão: ${stats.divisao_lotes.media_por_divisao}`);
    }
    
    if (stats.visibilidade.mudancas > 0) {
      console.log('👁️ Mudanças de visibilidade:');
      console.log(`- Total: ${stats.visibilidade.mudancas}`);
      console.log(`- Página oculta: ${stats.visibilidade.oculta}`);
      console.log(`- Página visível: ${stats.visibilidade.visivel}`);
    }
    
    console.groupEnd();
    
    return stats;
  } catch (error) {
    console.error('%c[AdTrackerLogs] Erro ao gerar diagnóstico:', 'color: red', error);
    return `Erro ao gerar diagnóstico: ${error.message}`;
  }
};

// Exportar funções principais
export default {
  initLogs,
  adicionarLog,
  saveLogs,
  limparLogs,
  verEventosPendentes,
  diagnosticarAdTracker,
  LOG_TYPES
}; 