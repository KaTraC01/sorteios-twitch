import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../config/supabaseClient';
import './AdTracker.css';
import adTrackerLogs, { LOG_TYPES } from './adTrackerLogs';

// Detecção de ambiente de desenvolvimento
const isDevelopment = process.env.NODE_ENV === 'development';
const MIN_COMPONENT_LIFETIME = 200; // Mínimo de tempo (ms) para considerar componente montado (evitar StrictMode)
// Flag global para rastrear se estamos em uma navegação/atualização de página
let isNavigatingAway = false;

// Buffer para armazenar eventos antes de enviar para o servidor
let eventsBuffer = [];
let bufferTimer = null;
const BUFFER_TIMEOUT = 10000; // 10 segundos
const BUFFER_SIZE_LIMIT = 5; // Enviar após 5 eventos
const BUFFER_STORAGE_KEY = 'adtracker_events_buffer'; // Chave para localStorage
const componentIds = {}; // Armazenar IDs dos componentes rastreados

// Adicionar listener para quando a página for fechada
if (typeof window !== 'undefined') {
  // Função para enviar eventos usando o navigator.sendBeacon (funciona durante o fechamento da página)
  const sendEventsByBeacon = (events) => {
    if (!events || events.length === 0) {
      return false;
    }
    
    // Registrar tentativa de envio no sistema de logs centralizado
    adTrackerLogs.adicionarLog(LOG_TYPES.BEACON_ATTEMPT, {
      quantidade: events.length,
      navegador: navigator.userAgent,
      timestamp_envio: new Date().toISOString()
    });
    
    try {
      if (typeof navigator.sendBeacon !== 'function') {
        console.error('%c[AdTracker] API sendBeacon não disponível neste navegador', 'color: red');
        
        // Registrar falha no sistema de logs centralizado
        adTrackerLogs.adicionarLog(LOG_TYPES.BEACON_FAILURE, {
          quantidade: events.length,
          motivo: 'api_indisponivel',
          erro: 'API sendBeacon não disponível neste navegador'
        });
        
        return false;
      }

      // Obter a URL correta para a API do Supabase
      const url = `${supabase.supabaseUrl}/rest/v1/rpc/inserir_eventos_anuncios_lote`;
      
      // Criar um objeto URLSearchParams para os parâmetros de consulta
      const params = new URLSearchParams();
      
      // Adicionar a chave de API anônima como parâmetro de consulta
      params.append('apikey', supabase.supabaseKey);
      
      // URL completa com parâmetros de consulta
      const fullUrl = `${url}?${params.toString()}`;
      
      // Processar valores numéricos antes de enviar
      const processedEvents = events.map(event => {
        // Criar uma cópia para não alterar o original
        const processedEvent = { ...event };
        
        // Garantir que tempo_exposto seja um número válido
        if (processedEvent.tempo_exposto !== undefined) {
          try {
            // Forçar conversão para número
            const tempNumber = Number(processedEvent.tempo_exposto);
            if (isNaN(tempNumber)) {
              processedEvent.tempo_exposto = 0;
            } else {
              // Arredondar para duas casas decimais
              processedEvent.tempo_exposto = Math.round(tempNumber * 100) / 100;
            }
          } catch (e) {
            processedEvent.tempo_exposto = 0;
          }
        } else {
          processedEvent.tempo_exposto = 0;
        }
        
        // Adicionar timestamp se não existir
        if (!processedEvent.timestamp) {
          processedEvent.timestamp = new Date().toISOString();
        }
        
        return processedEvent;
      });
      
      // Criar um blob com os dados para enviar
      const blob = new Blob([JSON.stringify({ eventos: processedEvents })], { 
        type: 'application/json' 
      });
      
      // Calcular tamanho do payload em bytes
      const payloadSize = blob.size;
      
      // Usar sendBeacon que foi projetado especificamente para este cenário
      const result = navigator.sendBeacon(fullUrl, blob);
      
      console.log(`%c[AdTracker] ${result ? 'SUCESSO' : 'FALHA'} ao enviar ${events.length} eventos via sendBeacon`, 
        result ? 'color: #4CAF50' : 'color: #F44336');
      
      // Registrar resultado no sistema de logs centralizado
      if (result) {
        adTrackerLogs.adicionarLog(LOG_TYPES.BEACON_SUCCESS, {
          quantidade: events.length,
          tamanho_payload: payloadSize,
          timestamp_envio: new Date().toISOString()
        });
      } else {
        adTrackerLogs.adicionarLog(LOG_TYPES.BEACON_FAILURE, {
          quantidade: events.length,
          tamanho_payload: payloadSize,
          motivo: 'beacon_retornou_falso',
          timestamp_envio: new Date().toISOString()
        });
      }
      
      return result;
    } catch (error) {
      console.error('%c[AdTracker] Erro ao enviar eventos via sendBeacon:', 'color: red', error);
      
      // Registrar erro no sistema de logs centralizado
      adTrackerLogs.adicionarLog(LOG_TYPES.BEACON_FAILURE, {
        quantidade: events.length,
        motivo: 'excecao',
        erro: error.message,
        stack: error.stack
      });
      
      return false;
    }
  };

  // Detectar quando o usuário está saindo da página ou recarregando
  const globalBeforeUnloadHandler = () => {
    isNavigatingAway = true;
    
    // Registrar evento de fechamento da página
    adTrackerLogs.adicionarLog(LOG_TYPES.PAGE_UNLOAD, {
      eventos_pendentes: eventsBuffer.length,
      timestamp: new Date().toISOString()
    });
    
    if (eventsBuffer.length > 0) {
      try {
        console.log(`%c[AdTracker] Fechamento de página detectado, enviando ${eventsBuffer.length} eventos pendentes`, 
          'background: #FF5722; color: white; padding: 2px 5px; border-radius: 3px');
        
        // Salvar eventos pendentes no localStorage como backup
        localStorage.setItem(BUFFER_STORAGE_KEY, JSON.stringify(eventsBuffer));
        
        // Forçar salvamento dos logs antes do fechamento
        if (typeof adTrackerLogs.saveLogs === 'function') {
          adTrackerLogs.saveLogs();
        }
        
        // Tentar enviar imediatamente usando sendBeacon
        if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
          // Usar o escopo global
          window.sendEventsByBeacon ? window.sendEventsByBeacon(eventsBuffer) : 
            console.error('%c[AdTracker] Função sendEventsByBeacon não disponível no escopo global', 'color: red');
        }
      } catch (e) {
        console.error('Erro ao processar eventos no fechamento da página:', e);
        
        // Registrar erro no sistema de logs centralizado
        adTrackerLogs.adicionarLog(LOG_TYPES.BEACON_FAILURE, {
          quantidade: eventsBuffer.length,
          motivo: 'erro_beforeunload',
          erro: e.message
        });
        
        // Tentar salvar logs mesmo com erro
        if (typeof adTrackerLogs.saveLogs === 'function') {
          try {
            adTrackerLogs.saveLogs();
          } catch (logError) {
            // Último recurso, não podemos fazer mais nada
          }
        }
      }
    } else {
      // Mesmo sem eventos, forçar salvamento dos logs
      if (typeof adTrackerLogs.saveLogs === 'function') {
        adTrackerLogs.saveLogs();
      }
    }
  };
  
  window.addEventListener('beforeunload', globalBeforeUnloadHandler);
  
  // Detectar quando o usuário está navegando para outra página (usando history API)
  window.addEventListener('popstate', () => {
    isNavigatingAway = true;
    console.log('%c[AdTracker] Navegação detectada, desativando registros automáticos', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px');
  });
  
  // Para frameworks como React Router, Next.js, etc.
  // Tentar interceptar navegações dentro da SPA
  try {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function() {
      isNavigatingAway = true;
      console.log('%c[AdTracker] Navegação SPA detectada (pushState), desativando registros automáticos', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px');
      setTimeout(() => {
        isNavigatingAway = false;
      }, 100); // Restaurar após navegação
      return originalPushState.apply(this, arguments);
    };
    
    history.replaceState = function() {
      isNavigatingAway = true;
      console.log('%c[AdTracker] Navegação SPA detectada (replaceState), desativando registros automáticos', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px');
      setTimeout(() => {
        isNavigatingAway = false;
      }, 100); // Restaurar após navegação
      return originalReplaceState.apply(this, arguments);
    };
  } catch (e) {
    console.error('%c[AdTracker] Erro ao configurar detecção de navegação SPA:', 'color: red', e);
  }

  // Expor a função no escopo global para que possa ser acessada por todos os componentes
  if (typeof window !== 'undefined') {
    // Definir a função no escopo global, garantindo que estará disponível para todos
    window.sendEventsByBeacon = function(events) {
      if (!events || events.length === 0) {
        return false;
      }
      
      // Registrar tentativa de envio no sistema de logs centralizado
      adTrackerLogs.adicionarLog(LOG_TYPES.BEACON_ATTEMPT, {
        quantidade: events.length,
        navegador: navigator.userAgent,
        timestamp_envio: new Date().toISOString()
      });
      
      try {
        if (typeof navigator.sendBeacon !== 'function') {
          console.error('%c[AdTracker] API sendBeacon não disponível neste navegador', 'color: red');
          
          // Registrar falha no sistema de logs centralizado
          adTrackerLogs.adicionarLog(LOG_TYPES.BEACON_FAILURE, {
            quantidade: events.length,
            motivo: 'api_indisponivel',
            erro: 'API sendBeacon não disponível neste navegador'
          });
          
          return false;
        }

        // Obter a URL correta para a API do Supabase
        const url = `${supabase.supabaseUrl}/rest/v1/rpc/inserir_eventos_anuncios_lote`;
        
        // Criar um objeto URLSearchParams para os parâmetros de consulta
        const params = new URLSearchParams();
        
        // Adicionar a chave de API anônima como parâmetro de consulta
        params.append('apikey', supabase.supabaseKey);
        
        // URL completa com parâmetros de consulta
        const fullUrl = `${url}?${params.toString()}`;
        
        // Processar valores numéricos antes de enviar
        const processedEvents = events.map(event => {
          // Criar uma cópia para não alterar o original
          const processedEvent = { ...event };
          
          // Garantir que tempo_exposto seja um número válido
          if (processedEvent.tempo_exposto !== undefined) {
            try {
              // Forçar conversão para número
              const tempNumber = Number(processedEvent.tempo_exposto);
              if (isNaN(tempNumber)) {
                processedEvent.tempo_exposto = 0;
              } else {
                // Arredondar para duas casas decimais
                processedEvent.tempo_exposto = Math.round(tempNumber * 100) / 100;
              }
            } catch (e) {
              processedEvent.tempo_exposto = 0;
            }
          } else {
            processedEvent.tempo_exposto = 0;
          }
          
          // Adicionar timestamp se não existir
          if (!processedEvent.timestamp) {
            processedEvent.timestamp = new Date().toISOString();
          }
          
          return processedEvent;
        });
        
        // Criar um blob com os dados para enviar
        const blob = new Blob([JSON.stringify({ eventos: processedEvents })], { 
          type: 'application/json' 
        });
        
        // Calcular tamanho do payload em bytes
        const payloadSize = blob.size;
        
        // Usar sendBeacon que foi projetado especificamente para este cenário
        const result = navigator.sendBeacon(fullUrl, blob);
        
        console.log(`%c[AdTracker] ${result ? 'SUCESSO' : 'FALHA'} ao enviar ${events.length} eventos via sendBeacon`, 
          result ? 'color: #4CAF50' : 'color: #F44336');
        
        // Registrar resultado no sistema de logs centralizado
        if (result) {
          adTrackerLogs.adicionarLog(LOG_TYPES.BEACON_SUCCESS, {
            quantidade: events.length,
            tamanho_payload: payloadSize,
            timestamp_envio: new Date().toISOString()
          });
        } else {
          adTrackerLogs.adicionarLog(LOG_TYPES.BEACON_FAILURE, {
            quantidade: events.length,
            tamanho_payload: payloadSize,
            motivo: 'beacon_retornou_falso',
            timestamp_envio: new Date().toISOString()
          });
        }
        
        return result;
      } catch (error) {
        console.error('%c[AdTracker] Erro ao enviar eventos via sendBeacon:', 'color: red', error);
        
        // Registrar erro no sistema de logs centralizado
        adTrackerLogs.adicionarLog(LOG_TYPES.BEACON_FAILURE, {
          quantidade: events.length,
          motivo: 'excecao',
          erro: error.message,
          stack: error.stack
        });
        
        return false;
      }
    };
  }
}

// Função para gerar ou recuperar o session_id do usuário
const getOrCreateSessionId = () => {
  if (typeof window === 'undefined') return null;
  
  let sessionId = localStorage.getItem('ad_session_id');
  if (!sessionId) {
    sessionId = 'ads_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('ad_session_id', sessionId);
  }
  return sessionId;
};

// Função para obter informações sobre o dispositivo
const getDeviceInfo = () => {
  if (typeof window === 'undefined') return 'desconhecido';
  
  const userAgent = navigator.userAgent;
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
    return 'mobile';
  }
  return 'desktop';
};

// Disponibilizar a função getDeviceInfo globalmente
if (typeof window !== 'undefined') {
  window.getDeviceInfo = getDeviceInfo;
}

// Função para obter a localização do usuário
const getLocation = async () => {
  try {
    // Removida a chamada à API ip-api.com que estava causando erros 403
    // Usando valores padrão para evitar chamadas bloqueadas
    return {
      pais: 'Brasil',
      regiao: 'Desconhecido'
    };
  } catch (error) {
    console.error('Erro ao obter localização:', error);
    return {
      pais: 'desconhecido',
      regiao: 'desconhecido'
    };
  }
};

// Função para registrar um evento
const registerEvent = async (eventData) => {
  // Verificar se todos os dados essenciais estão presentes
  if (!eventData.anuncio_id || !eventData.tipo_anuncio || !eventData.pagina) {
    console.warn('%c[AdTracker] ERRO: Tentativa de registrar evento sem dados essenciais:', 'color: red; font-weight: bold', 
      !eventData.anuncio_id ? 'anuncio_id ausente' : 
      !eventData.tipo_anuncio ? 'tipo_anuncio ausente' : 
      'pagina ausente');
    
    // Registrar erro no sistema de logs
    adTrackerLogs.adicionarLog(LOG_TYPES.BUFFER_ADD, {
      status: 'erro',
      motivo: 'dados_incompletos',
      detalhes: {
        anuncio_id_presente: !!eventData.anuncio_id,
        tipo_anuncio_presente: !!eventData.tipo_anuncio,
        pagina_presente: !!eventData.pagina
      }
    });
    
    return; // Não registrar o evento se algum dado essencial estiver faltando
  }

  // Tratar tempo exposto para garantir que seja um número decimal válido
  let tempoExposto = 0;
  if (eventData.tempo_exposto !== undefined && eventData.tempo_exposto !== null) {
    // Converter para número e garantir que seja um valor válido
    tempoExposto = Number(eventData.tempo_exposto);
    if (isNaN(tempoExposto)) {
      console.warn('%c[AdTracker] AVISO: Valor inválido para tempo_exposto, definindo como 0', 'color: orange');
      tempoExposto = 0;
    }
  }

  // CORREÇÃO: Inverter tipo_evento para anúncios tela-inteira
  let tipoEvento = eventData.tipo_evento;
  if (eventData.tipo_anuncio === 'tela-inteira') {
    if (tipoEvento === 'clique') {
      tipoEvento = 'impressao';
      console.log(`%c[AdTracker] Invertendo tipo_evento para tela-inteira: clique -> impressao`, 
        'background: #FF5722; color: white; padding: 3px 5px; border-radius: 3px');
    } else if (tipoEvento === 'impressao') {
      tipoEvento = 'clique';
      console.log(`%c[AdTracker] Invertendo tipo_evento para tela-inteira: impressao -> clique`, 
        'background: #FF5722; color: white; padding: 3px 5px; border-radius: 3px');
    }
  }

  console.log(`%c[AdTracker] Registrando evento: ${tipoEvento} para ${eventData.tipo_anuncio} (${eventData.anuncio_id})`, 
    'background: #2196F3; color: white; padding: 3px 5px; border-radius: 3px');
  console.log(`%c[AdTracker] tempo_exposto: ${tempoExposto}s, tipo: ${typeof tempoExposto}`, 'color: #03A9F4');
  
  // Mapear os dados para corresponder exatamente ao formato esperado pela tabela
  const mappedEvent = {
    anuncio_id: eventData.anuncio_id,
    tipo_anuncio: eventData.tipo_anuncio,
    pagina: eventData.pagina,
    tipo_evento: tipoEvento, // Usar o valor possivelmente invertido
    tempo_exposto: tempoExposto, // Usar a variável tratada
    visivel: eventData.visivel !== undefined ? eventData.visivel : true, // Padrão é true agora
    dispositivo: eventData.dispositivo || getDeviceInfo(),
    pais: eventData.pais || 'Brasil',
    regiao: eventData.regiao || 'Desconhecido',
    session_id: eventData.session_id || sessionId.current,
    timestamp: new Date().toISOString(),
    added_to_buffer_at: new Date().toISOString() // Adicionar timestamp de quando foi adicionado ao buffer
    // processado será definido como FALSE por padrão no servidor
  };
  
  // Adicionar o evento ao buffer
  eventsBuffer.push(mappedEvent);
  console.log(`%c[AdTracker] Evento adicionado ao buffer. Total de eventos pendentes: ${eventsBuffer.length}`, 'color: #8BC34A');
  
  // Registrar adição ao buffer no sistema de logs
  adTrackerLogs.adicionarLog(LOG_TYPES.BUFFER_ADD, {
    anuncio_id: mappedEvent.anuncio_id,
    tipo_anuncio: mappedEvent.tipo_anuncio,
    tipo_evento: mappedEvent.tipo_evento,
    tempo_exposto: mappedEvent.tempo_exposto
  });
  
  // Limpar o timer existente se houver
  if (bufferTimer) {
    clearTimeout(bufferTimer);
    bufferTimer = null;
  }
  
  // Se atingimos o limite de tamanho do buffer, enviar imediatamente
  if (eventsBuffer.length >= BUFFER_SIZE_LIMIT) {
    console.log(`%c[AdTracker] Buffer atingiu limite de ${BUFFER_SIZE_LIMIT} eventos. Enviando...`, 'background: #FF9800; color: black; padding: 2px 5px; border-radius: 3px');
    
    // Registrar overflow do buffer no sistema de logs
    adTrackerLogs.adicionarLog(LOG_TYPES.BUFFER_OVERFLOW, {
      quantidade: eventsBuffer.length,
      limite: BUFFER_SIZE_LIMIT
    });
    
    await flushEventsBuffer();
  } else {
    // Configurar um novo timer para garantir que os eventos sejam enviados mesmo se não atingir o limite
    bufferTimer = setTimeout(() => {
      console.log(`%c[AdTracker] Timer de ${BUFFER_TIMEOUT/1000}s expirou. Enviando eventos pendentes...`, 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px');
      flushEventsBuffer();
    }, BUFFER_TIMEOUT);
    
    console.log(`%c[AdTracker] Timer de envio configurado para ${BUFFER_TIMEOUT/1000}s`, 'color: #9C27B0');
  }
};

// Exportar a função registerEvent globalmente para uso por outros componentes
if (typeof window !== 'undefined') {
  // Criar uma versão segura da função que verifica se há todas as dependências necessárias
  window.registerEvent = (eventData) => {
    // Verificar se todos os dados essenciais estão presentes
    if (!eventData.anuncio_id || !eventData.tipo_anuncio || !eventData.pagina) {
      console.warn('%c[AdTracker] ERRO: Tentativa de registrar evento sem dados essenciais:', 'color: red; font-weight: bold', 
        !eventData.anuncio_id ? 'anuncio_id ausente' : 
        !eventData.tipo_anuncio ? 'tipo_anuncio ausente' : 
        'pagina ausente');
      return; // Não registrar o evento se algum dado essencial estiver faltando
    }

    // Garantir que sessionId existe
    if (!eventData.session_id) {
      // Gerar session_id se não foi fornecido
      let sessionId = localStorage.getItem('ad_session_id');
      if (!sessionId) {
        sessionId = 'ads_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('ad_session_id', sessionId);
      }
      eventData.session_id = sessionId;
    }
    
    // Garantir que tempo_exposto seja um número válido
    if (eventData.tempo_exposto !== undefined && eventData.tempo_exposto !== null) {
      // Converter para número e garantir que seja um valor válido
      let tempoExposto = Number(eventData.tempo_exposto);
      if (isNaN(tempoExposto)) {
        console.warn('%c[AdTracker] AVISO: Valor inválido para tempo_exposto, definindo como 0', 'color: orange');
        tempoExposto = 0;
      }
      eventData.tempo_exposto = tempoExposto;
    } else {
      eventData.tempo_exposto = 0;
    }
    
    // Garantir outros campos obrigatórios
    if (!eventData.dispositivo) eventData.dispositivo = getDeviceInfo();
    if (!eventData.pais) eventData.pais = 'Brasil';
    if (!eventData.regiao) eventData.regiao = 'Desconhecido';
    if (!eventData.timestamp) eventData.timestamp = new Date().toISOString();
    
    // Garantir que tipo_evento seja válido
    if (eventData.tipo_evento !== 'impressao' && eventData.tipo_evento !== 'clique') {
      console.warn(`%c[AdTracker] AVISO: Valor inválido para tipo_evento (${eventData.tipo_evento}), alterando para 'impressao'`, 'color: orange');
      eventData.tipo_evento = 'impressao';
    }

    // Agora que garantimos que todos os dados estão presentes, chamar a função original
    registerEvent(eventData);
  };
}

// Função para enviar eventos em lote para o servidor
const flushEventsBuffer = async () => {
  // Limpar o timer se existir
  if (bufferTimer) {
    clearTimeout(bufferTimer);
    bufferTimer = null;
  }
  
  if (eventsBuffer.length === 0) {
    console.log('%c[AdTracker] Buffer vazio, nada para enviar.', 'color: #9E9E9E');
    return false;
  }
  
  console.log(`%c[AdTracker] Preparando para enviar ${eventsBuffer.length} eventos do buffer...`, 'background: #673AB7; color: white; padding: 2px 5px; border-radius: 3px');
  
  // Registrar tentativa de flush no sistema de logs
  adTrackerLogs.adicionarLog(LOG_TYPES.FLUSH_ATTEMPT, {
    quantidade: eventsBuffer.length,
    metodo: 'api_supabase',
    timestamp_inicio: new Date().toISOString()
  });
  
  // Criar uma cópia dos eventos e limpar o buffer original
  const events = [...eventsBuffer];
  eventsBuffer = [];
  
  // Verificar e corrigir valores numéricos antes de enviar
  const processedEvents = events.map(event => {
    // Criar uma cópia do evento para não modificar o original
    const processedEvent = { ...event };
    
    // Adicionar timestamp de entrada no buffer se não existir
    if (!processedEvent.added_to_buffer_at) {
      processedEvent.added_to_buffer_at = new Date().toISOString();
    }
    
    // Garantir que tempo_exposto seja um número válido
    if (processedEvent.tempo_exposto !== undefined) {
      try {
        // Forçar conversão para número
        const tempNumber = Number(processedEvent.tempo_exposto);
        if (isNaN(tempNumber)) {
          console.warn(`%c[AdTracker] AVISO: Valor inválido para tempo_exposto (${processedEvent.tempo_exposto}), definindo como 0`, 'color: orange');
          processedEvent.tempo_exposto = 0;
        } else {
          // Arredondar para duas casas decimais e garantir que seja number
          processedEvent.tempo_exposto = Math.round(tempNumber * 100) / 100;
        }
      } catch (e) {
        console.error('%c[AdTracker] ERRO ao processar tempo_exposto:', 'color: red', e);
        processedEvent.tempo_exposto = 0;
      }
    } else {
      processedEvent.tempo_exposto = 0;
    }
    
    // Garantir que tipo_evento seja válido (apenas 'impressao' ou 'clique')
    if (processedEvent.tipo_evento !== 'impressao' && processedEvent.tipo_evento !== 'clique') {
      console.warn(`%c[AdTracker] AVISO: Valor inválido para tipo_evento (${processedEvent.tipo_evento}), alterando para 'impressao'`, 'color: orange');
      processedEvent.tipo_evento = 'impressao';
    }

    // CORREÇÃO: Inverter tipo_evento para anúncios tela-inteira
    if (processedEvent.tipo_anuncio === 'tela-inteira') {
      if (processedEvent.tipo_evento === 'clique') {
        processedEvent.tipo_evento = 'impressao';
        console.log(`%c[AdTracker] Inversão no flushEventsBuffer: tela-inteira clique -> impressao`, 
          'background: #FF5722; color: white; padding: 3px 5px; border-radius: 3px');
      } else if (processedEvent.tipo_evento === 'impressao') {
        processedEvent.tipo_evento = 'clique';
        console.log(`%c[AdTracker] Inversão no flushEventsBuffer: tela-inteira impressao -> clique`, 
          'background: #FF5722; color: white; padding: 3px 5px; border-radius: 3px');
      }
    }
    
    console.log(`%c[AdTracker] Evento processado: ${processedEvent.tipo_anuncio} (${processedEvent.anuncio_id}) - ${processedEvent.tipo_evento}`, 'color: #4CAF50', {
      tempo_exposto: processedEvent.tempo_exposto,
      tipo_tempo_exposto: typeof processedEvent.tempo_exposto,
      pagina: processedEvent.pagina
    });
    
    return processedEvent;
  });

  try {
    console.log('%c[AdTracker] Enviando eventos para o Supabase...', 'background: #0288D1; color: white; padding: 3px 5px; border-radius: 3px');
    
    // Dividir em lotes menores para evitar timeout
    const BATCH_SIZE = 50; // Enviar no máximo 50 eventos por vez
    const batches = [];
    for (let i = 0; i < processedEvents.length; i += BATCH_SIZE) {
      batches.push(processedEvents.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`%c[AdTracker] Dividindo ${processedEvents.length} eventos em ${batches.length} lotes de até ${BATCH_SIZE} eventos`, 'color: #FF9800');
    
    let successCount = 0;
    let failedCount = 0;
    
    // Processar cada lote sequencialmente
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`%c[AdTracker] Processando lote ${batchIndex + 1}/${batches.length} (${batch.length} eventos)`, 'color: #2196F3');
      
      // Tentar inserir diretamente na tabela
      let batchSuccess = false;
      try {
        console.log('%c[AdTracker] Tentando inserção direta na tabela eventos_anuncios...', 'color: #00BCD4');
        const { data, error } = await supabase
          .from('eventos_anuncios')
          .insert(batch);
        
        if (!error) {
          console.log(`%c[AdTracker] SUCESSO! Lote ${batchIndex + 1} inserido diretamente na tabela`, 'background: #4CAF50; color: white; padding: 3px 5px; border-radius: 3px');
          batchSuccess = true;
          successCount += batch.length;
          
          // Registrar sucesso no sistema de logs
          adTrackerLogs.adicionarLog(LOG_TYPES.FLUSH_SUCCESS, {
            quantidade: batch.length,
            metodo: 'insert_direto',
            lote: batchIndex + 1,
            total_lotes: batches.length
          });
        } else if (error.code !== '404') {
          console.warn('%c[AdTracker] AVISO: Erro ao inserir diretamente na tabela:', 'color: orange', error);
          
          // Registrar erro no sistema de logs
          adTrackerLogs.adicionarLog(LOG_TYPES.FLUSH_FAILURE, {
            quantidade: batch.length,
            metodo: 'insert_direto',
            lote: batchIndex + 1,
            erro: error.message,
            codigo_erro: error.code
          });
          
          // Continuar e tentar a função RPC como fallback
        } else {
          console.warn('%c[AdTracker] AVISO: Tabela não encontrada, tentando função RPC...', 'color: orange');
          
          // Registrar erro no sistema de logs
          adTrackerLogs.adicionarLog(LOG_TYPES.FLUSH_FAILURE, {
            quantidade: batch.length,
            metodo: 'insert_direto',
            lote: batchIndex + 1,
            erro: 'Tabela não encontrada',
            codigo_erro: '404'
          });
        }
      } catch (directInsertError) {
        console.warn('%c[AdTracker] AVISO: Erro ao tentar inserção direta:', 'color: orange', directInsertError);
        
        // Registrar erro no sistema de logs
        adTrackerLogs.adicionarLog(LOG_TYPES.FLUSH_FAILURE, {
          quantidade: batch.length,
          metodo: 'insert_direto',
          lote: batchIndex + 1,
          erro: directInsertError.message,
          stack: directInsertError.stack
        });
      }
      
      // Se a inserção direta falhou, tentar a função RPC
      if (!batchSuccess) {
        try {
          console.log('%c[AdTracker] Tentando inserção via RPC (inserir_eventos_anuncios_lote)...', 'color: #00BCD4');
          const { data, error } = await supabase
            .rpc('inserir_eventos_anuncios_lote', {
              eventos: batch
            });
            
          if (error) {
            console.error('%c[AdTracker] ERRO ao enviar eventos via RPC:', 'color: red', error);
            
            // Registrar erro no sistema de logs
            adTrackerLogs.adicionarLog(LOG_TYPES.FLUSH_FAILURE, {
              quantidade: batch.length,
              metodo: 'rpc',
              lote: batchIndex + 1,
              erro: error.message,
              codigo_erro: error.code
            });
            
            // Verificar se é um erro 404 (função não encontrada)
            if (error.code === '404' || error.message.includes('Not Found')) {
              console.warn('%c[AdTracker] AVISO: Função RPC não encontrada. Tentando inserção individual como último recurso...', 'color: orange');
              
              // Tentar inserir cada evento individualmente
              let individualSuccessCount = 0;
              for (const event of batch) {
                try {
                  const { error: individualError } = await supabase
                    .from('eventos_anuncios')
                    .insert([event]);
                  
                  if (!individualError) {
                    individualSuccessCount++;
                  }
                } catch (e) {
                  console.error('Erro ao inserir evento individual:', e);
                }
              }
              
              console.log(`%c[AdTracker] Inserção individual: ${individualSuccessCount}/${batch.length} eventos inseridos com sucesso.`, 
                individualSuccessCount > 0 ? 'background: #4CAF50; color: white;' : 'background: #F44336; color: white;', 
                'padding: 3px 5px; border-radius: 3px');
              
              // Registrar resultado no sistema de logs
              if (individualSuccessCount > 0) {
                adTrackerLogs.adicionarLog(LOG_TYPES.FLUSH_SUCCESS, {
                  quantidade: individualSuccessCount,
                  metodo: 'insert_individual',
                  lote: batchIndex + 1,
                  total_eventos: batch.length
                });
                
                if (individualSuccessCount < batch.length) {
                  adTrackerLogs.adicionarLog(LOG_TYPES.FLUSH_FAILURE, {
                    quantidade: batch.length - individualSuccessCount,
                    metodo: 'insert_individual',
                    lote: batchIndex + 1,
                    erro: 'Falha parcial em inserção individual'
                  });
                }
                
                successCount += individualSuccessCount;
                failedCount += (batch.length - individualSuccessCount);
                batchSuccess = individualSuccessCount === batch.length;
              } else {
                failedCount += batch.length;
                
                // Registrar falha total no sistema de logs
                adTrackerLogs.adicionarLog(LOG_TYPES.FLUSH_FAILURE, {
                  quantidade: batch.length,
                  metodo: 'insert_individual',
                  lote: batchIndex + 1,
                  erro: 'Falha total em inserção individual'
                });
              }
            } else {
              // Outro tipo de erro, propagar
              failedCount += batch.length;
            }
          } else {
            console.log(`%c[AdTracker] SUCESSO! Lote ${batchIndex + 1} inserido via RPC`, 'background: #4CAF50; color: white; padding: 3px 5px; border-radius: 3px');
            batchSuccess = true;
            successCount += batch.length;
            
            // Registrar sucesso no sistema de logs
            adTrackerLogs.adicionarLog(LOG_TYPES.FLUSH_SUCCESS, {
              quantidade: batch.length,
              metodo: 'rpc',
              lote: batchIndex + 1,
              total_lotes: batches.length
            });
          }
        } catch (rpcError) {
          console.error('%c[AdTracker] Erro ao processar lote via RPC:', 'color: red', rpcError);
          failedCount += batch.length;
          
          // Registrar erro no sistema de logs
          adTrackerLogs.adicionarLog(LOG_TYPES.FLUSH_FAILURE, {
            quantidade: batch.length,
            metodo: 'rpc',
            lote: batchIndex + 1,
            erro: rpcError.message,
            stack: rpcError.stack
          });
        }
      }
      
      // Pausa entre lotes para não sobrecarregar o servidor
      if (batchIndex < batches.length - 1) {
        console.log('%c[AdTracker] Aguardando 500ms antes do próximo lote...', 'color: #9E9E9E');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`%c[AdTracker] ✅ Resumo do processamento: ${successCount} eventos enviados com sucesso, ${failedCount} falhas.`, 
      'background: #388E3C; color: white; font-weight: bold; padding: 5px; border-radius: 3px; font-size: 14px');
    
    // Registrar resumo final no sistema de logs
    adTrackerLogs.adicionarLog(failedCount > 0 ? LOG_TYPES.FLUSH_FAILURE : LOG_TYPES.FLUSH_SUCCESS, {
      quantidade_total: processedEvents.length,
      sucessos: successCount,
      falhas: failedCount,
      lotes: batches.length,
      timestamp_fim: new Date().toISOString()
    });
    
    // Se tivermos falhas, adicionar de volta ao buffer
    if (failedCount > 0) {
      // Armazenar eventos que falharam para tentar novamente depois
      const failedEvents = processedEvents.slice(successCount);
      if (failedEvents.length > 0) {
        eventsBuffer = [...eventsBuffer, ...failedEvents];
        console.log(`%c[AdTracker] ${failedEvents.length} eventos que falharam foram adicionados de volta ao buffer para tentar novamente.`, 'background: #FF9800; color: white; padding: 3px 5px; border-radius: 3px');
        
        // Registrar eventos que voltaram ao buffer no sistema de logs
        adTrackerLogs.adicionarLog(LOG_TYPES.BUFFER_ADD, {
          quantidade: failedEvents.length,
          motivo: 'retry_apos_falha',
          timestamp: new Date().toISOString()
        });
        
        // Salvar no localStorage como backup
        try {
          localStorage.setItem(BUFFER_STORAGE_KEY, JSON.stringify(eventsBuffer));
        } catch (storageError) {
          console.error('%c[AdTracker] ERRO ao salvar eventos no localStorage:', 'color: red', storageError);
          
          // Registrar erro no sistema de logs
          adTrackerLogs.adicionarLog(LOG_TYPES.FLUSH_FAILURE, {
            tipo: 'erro_localstorage',
            erro: storageError.message,
            stack: storageError.stack
          });
        }
        
        // Tentar novamente em 30 segundos
        if (!bufferTimer) {
          console.log('%c[AdTracker] Agendando nova tentativa em 30 segundos...', 'color: #9C27B0');
          bufferTimer = setTimeout(flushEventsBuffer, 30000);
        }
      }
      
      return successCount > 0; // Retorna true se pelo menos alguns eventos foram enviados com sucesso
    }
    
    // Remover eventos do localStorage se foram todos enviados
    try {
      const pendingEvents = JSON.parse(localStorage.getItem(BUFFER_STORAGE_KEY) || '[]');
      if (pendingEvents.length > 0) {
        localStorage.setItem(BUFFER_STORAGE_KEY, JSON.stringify([]));
        console.log('%c[AdTracker] Eventos pendentes removidos do localStorage', 'color: #8BC34A');
      }
    } catch (e) {
      console.error('%c[AdTracker] ERRO ao limpar eventos pendentes:', 'color: red', e);
      
      // Registrar erro no sistema de logs
      adTrackerLogs.adicionarLog(LOG_TYPES.FLUSH_FAILURE, {
        tipo: 'erro_limpar_localstorage',
        erro: e.message,
        stack: e.stack
      });
    }
    
    return true;
    
  } catch (error) {
    console.error('%c[AdTracker] ERRO CRÍTICO ao enviar eventos para o Supabase:', 'background: #F44336; color: white; padding: 3px 5px; border-radius: 3px', error);
    
    // Registrar erro crítico no sistema de logs
    adTrackerLogs.adicionarLog(LOG_TYPES.FLUSH_FAILURE, {
      quantidade: processedEvents.length,
      tipo: 'erro_critico',
      erro: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Adicionar de volta ao buffer em caso de falha
    eventsBuffer = [...eventsBuffer, ...processedEvents];
    
    // Salvar no localStorage como backup
    try {
      localStorage.setItem(BUFFER_STORAGE_KEY, JSON.stringify(eventsBuffer));
      console.log(`%c[AdTracker] ${eventsBuffer.length} eventos salvos no localStorage para recuperação posterior`, 'color: #FF9800');
      
      // Registrar backup no sistema de logs
      adTrackerLogs.adicionarLog(LOG_TYPES.BUFFER_ADD, {
        quantidade: processedEvents.length,
        motivo: 'backup_apos_erro',
        timestamp: new Date().toISOString()
      });
    } catch (storageError) {
      console.error('%c[AdTracker] ERRO ao salvar eventos no localStorage:', 'color: red', storageError);
      
      // Registrar erro no sistema de logs
      adTrackerLogs.adicionarLog(LOG_TYPES.FLUSH_FAILURE, {
        tipo: 'erro_salvar_localstorage',
        erro: storageError.message,
        stack: storageError.stack
      });
    }
    
    // Tentar novamente em 30 segundos
    if (!bufferTimer) {
      console.log('%c[AdTracker] Agendando nova tentativa em 30 segundos...', 'color: #9C27B0');
      bufferTimer = setTimeout(flushEventsBuffer, 30000);
    }
    
    return false;
  }
};

// Função para recuperar eventos pendentes do localStorage
const recoverPendingEvents = () => {
  if (typeof window === 'undefined') return;
  
  // Registrar tentativa de recuperação no sistema de logs
  adTrackerLogs.adicionarLog(LOG_TYPES.RECOVERY_ATTEMPT, {
    timestamp: new Date().toISOString()
  });
  
  try {
    const pendingEventsString = localStorage.getItem(BUFFER_STORAGE_KEY);
    if (!pendingEventsString) {
      console.log('%c[AdTracker] Nenhum evento pendente encontrado no localStorage', 'color: #9E9E9E');
      
      // Registrar resultado no sistema de logs
      adTrackerLogs.adicionarLog(LOG_TYPES.RECOVERY_SUCCESS, {
        quantidade: 0,
        mensagem: 'Nenhum evento pendente encontrado'
      });
      
      return;
    }
    
    let pendingEvents = JSON.parse(pendingEventsString);
    if (Array.isArray(pendingEvents) && pendingEvents.length > 0) {
      console.log(`%c[AdTracker] ♻️ Recuperados ${pendingEvents.length} eventos pendentes do localStorage`, 'background: #009688; color: white; padding: 3px 5px; border-radius: 3px');
      
      // Verificar idade dos eventos
      const agora = Date.now();
      let eventosAntigos = 0;
      
      pendingEvents.forEach(evento => {
        if (evento.timestamp) {
          const idade = agora - new Date(evento.timestamp).getTime();
          if (idade > 24 * 60 * 60 * 1000) { // mais de 24h
            eventosAntigos++;
          }
        }
      });
      
      // Filtrar eventos com tipo_evento inválido (permitidos: 'impressao' e 'clique')
      const validEvents = pendingEvents.filter(evento => {
        const tipoValido = evento.tipo_evento === 'impressao' || evento.tipo_evento === 'clique';
        if (!tipoValido) {
          console.log(`%c[AdTracker] Removendo evento com tipo_evento inválido: ${evento.tipo_evento}`, 'color: #FF9800');
          // Corrigir eventos com tipo_evento inválido
          evento.tipo_evento = 'impressao';
        }
        return true;
      });
      
      if (validEvents.length < pendingEvents.length) {
        console.log(`%c[AdTracker] Removidos ${pendingEvents.length - validEvents.length} eventos com tipo_evento inválido`, 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px');
      }
      
      // Mostrar resumo dos tipos de anúncios recuperados
      const tiposAnuncios = {};
      validEvents.forEach(evento => {
        const tipo = evento.tipo_anuncio || 'desconhecido';
        tiposAnuncios[tipo] = (tiposAnuncios[tipo] || 0) + 1;
      });
      
      console.log('%c[AdTracker] Resumo dos tipos de anúncios recuperados:', 'color: #009688');
      console.table(tiposAnuncios);
      
      eventsBuffer = [...eventsBuffer, ...validEvents];
      
      // Registrar sucesso no sistema de logs
      adTrackerLogs.adicionarLog(LOG_TYPES.RECOVERY_SUCCESS, {
        quantidade: validEvents.length,
        eventos_antigos: eventosAntigos,
        tipos_anuncios: tiposAnuncios,
        eventos_corrigidos: pendingEvents.length - validEvents.length
      });
      
      // Salvar a versão filtrada de volta ao localStorage
      localStorage.setItem(BUFFER_STORAGE_KEY, JSON.stringify(validEvents));
      
      // Tentar enviar imediatamente
      console.log('%c[AdTracker] Tentando enviar eventos recuperados imediatamente...', 'color: #00BCD4');
      flushEventsBuffer();
    } else {
      console.log('%c[AdTracker] Nenhum evento pendente válido encontrado no localStorage', 'color: #9E9E9E');
      
      // Registrar resultado no sistema de logs
      adTrackerLogs.adicionarLog(LOG_TYPES.RECOVERY_SUCCESS, {
        quantidade: 0,
        mensagem: 'Nenhum evento pendente válido encontrado'
      });
    }
  } catch (error) {
    console.error('%c[AdTracker] ERRO ao recuperar eventos pendentes do localStorage:', 'background: #F44336; color: white; padding: 3px 5px; border-radius: 3px', error);
    
    // Registrar erro no sistema de logs
    adTrackerLogs.adicionarLog(LOG_TYPES.RECOVERY_FAILURE, {
      erro: error.message,
      stack: error.stack
    });
    
    // Limpar o item para evitar erros futuros
    localStorage.removeItem(BUFFER_STORAGE_KEY);
    console.log('%c[AdTracker] Item de armazenamento de eventos pendentes foi removido para evitar futuros erros', 'color: #FF9800');
  }
};

// Adicionar função para limpar eventos pendentes (para debugging)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Função para corrigir eventos no localStorage
  window.corrigirEventosAdTracker = () => {
    try {
      const eventos = JSON.parse(localStorage.getItem(BUFFER_STORAGE_KEY) || '[]');
      if (eventos.length === 0) {
        console.log('%c[AdTracker] Nenhum evento pendente para corrigir', 'color: #9E9E9E');
        return 'Nenhum evento pendente encontrado.';
      }
      
      console.log(`%c[AdTracker] Corrigindo ${eventos.length} eventos pendentes...`, 'background: #FF9800; color: white; padding: 3px 5px; border-radius: 3px');
      
      // Corrigir eventos
      let corrigidos = 0;
      const eventosCorrected = eventos.map(evento => {
        let modificado = false;
        
        // Corrigir tipo_evento
        if (evento.tipo_evento !== 'impressao' && evento.tipo_evento !== 'clique') {
          evento.tipo_evento = 'impressao';
          modificado = true;
        }
        
        // Corrigir tempo_exposto
        if (typeof evento.tempo_exposto !== 'number' || isNaN(evento.tempo_exposto)) {
          evento.tempo_exposto = 0.1; // Usar um valor inicial pequeno em vez de fixo
          modificado = true;
        }
        
        // Garantir que valores obrigatórios existam
        if (!evento.anuncio_id || !evento.tipo_anuncio || !evento.pagina) {
          console.warn('Evento inválido encontrado e será removido:', evento);
          return null; // Remover eventos inválidos
        }
        
        if (modificado) corrigidos++;
        return evento;
      }).filter(e => e !== null); // Remover eventos nulos
      
      // Salvar eventos corrigidos
      localStorage.setItem(BUFFER_STORAGE_KEY, JSON.stringify(eventosCorrected));
      
      const removidos = eventos.length - eventosCorrected.length;
      console.log(`%c[AdTracker] Correção concluída: ${corrigidos} eventos corrigidos, ${removidos} eventos inválidos removidos`, 
        'background: #4CAF50; color: white; padding: 3px 5px; border-radius: 3px');
      
      return `Correção concluída: ${corrigidos} eventos corrigidos, ${removidos} eventos inválidos removidos. Total atual: ${eventosCorrected.length} eventos.`;
    } catch (e) {
      console.error('Erro ao corrigir eventos:', e);
      return 'Erro ao corrigir eventos.';
    }
  };
  
  window.limparEventosAdTracker = () => {
    localStorage.removeItem(BUFFER_STORAGE_KEY);
    eventsBuffer = [];
    console.log('%c[AdTracker] TODOS OS EVENTOS PENDENTES FORAM LIMPOS!', 'background: #F44336; color: white; font-size: 14px; padding: 5px; border-radius: 3px');
    return 'Eventos pendentes do AdTracker foram limpos com sucesso!';
  };
  
  // Adicionar método para ver eventos pendentes
  window.verEventosAdTracker = () => {
    try {
      const eventos = JSON.parse(localStorage.getItem(BUFFER_STORAGE_KEY) || '[]');
      console.log('%c[AdTracker] Eventos pendentes:', 'background: #2196F3; color: white; padding: 3px 5px; border-radius: 3px');
      console.table(eventos);
      return `Total de ${eventos.length} eventos pendentes.`;
    } catch (e) {
      console.error('Erro ao ler eventos:', e);
      return 'Erro ao ler eventos.';
    }
  };
  
  console.log('%c[AdTracker] Funções de debug disponíveis no console: window.limparEventosAdTracker(), window.verEventosAdTracker() e window.corrigirEventosAdTracker()', 'background: #4CAF50; color: white; padding: 3px 5px; border-radius: 3px');
}

// Função para verificar eventos antigos no buffer
const verificarEventosAntigos = () => {
  if (typeof window === 'undefined' || !eventsBuffer.length) return;
  
  const agora = Date.now();
  const LIMITE_TEMPO_BUFFER = 5 * 60 * 1000; // 5 minutos em milissegundos
  let eventosAntigos = 0;
  
  eventsBuffer.forEach(evento => {
    if (evento.added_to_buffer_at) {
      const tempoNoBuffer = agora - new Date(evento.added_to_buffer_at).getTime();
      
      // Se o evento está no buffer há mais tempo que o limite
      if (tempoNoBuffer > LIMITE_TEMPO_BUFFER) {
        eventosAntigos++;
        
        // Registrar evento antigo no sistema de logs
        adTrackerLogs.adicionarLog(LOG_TYPES.BUFFER_STALE, {
          anuncio_id: evento.anuncio_id,
          tipo_anuncio: evento.tipo_anuncio,
          tipo_evento: evento.tipo_evento,
          tempo_no_buffer: Math.round(tempoNoBuffer / 1000) + 's',
          timestamp: evento.timestamp
        });
      }
    }
  });
  
  // Se encontrou eventos antigos, tentar enviar imediatamente
  if (eventosAntigos > 0) {
    console.log(`%c[AdTracker] Detectados ${eventosAntigos} eventos antigos no buffer. Forçando envio...`, 
      'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px');
    
    // Tentar enviar imediatamente
    flushEventsBuffer();
  }
  
  return eventosAntigos;
};

// Configurar verificação periódica de eventos antigos (a cada 2 minutos)
if (typeof window !== 'undefined') {
  setInterval(verificarEventosAntigos, 2 * 60 * 1000);
}

// Componente principal AdTracker
const AdTracker = ({ children, anuncioId, tipoAnuncio, paginaId, preservarLayout = true }) => {
  const anuncioRef = useRef(null);
  const observerElementRef = useRef(null); // Referência para o elemento invisível que será observado
  const [isVisible, setIsVisible] = useState(false);
  const [visibleStartTime, setVisibleStartTime] = useState(null);
  const [locationInfo, setLocationInfo] = useState({ pais: 'desconhecido', regiao: 'desconhecido' });
  const [hasRegisteredImpression, setHasRegisteredImpression] = useState(false);
  const [exposureTime, setExposureTime] = useState(0);
  const exposureTimerRef = useRef(null);
  const sessionId = useRef(getOrCreateSessionId());
  const [initialized, setInitialized] = useState(false);
  const observerRef = useRef(null); // Ref para guardar o observer
  const componentIdRef = useRef(`ad_${anuncioId}_${Math.random().toString(36).substring(2, 9)}`); // ID único para identificar instâncias
  const hasReportedRef = useRef(false); // Ref para controlar se já reportamos (persistente entre re-renders)
  const mountTimeRef = useRef(Date.now()); // Ref para armazenar o momento em que o componente foi montado
  const isFirstRenderRef = useRef(true); // Ref para controlar se é a primeira renderização
  const actualMountTimeRef = useRef(Date.now()); // Ref para armazenar o momento real da montagem
  const visibilityCheckTimerRef = useRef(null); // Timer para verificação periódica de visibilidade
  
  // Log inicial com informações completas sobre o anúncio
  useEffect(() => {
    // Registrar tempo real de montagem
    actualMountTimeRef.current = Date.now();
    
    console.log(`%c[AdTracker] Inicializando [${componentIdRef.current}]`, 'background: #222; color: #bada55');
    console.log(`%c[AdTracker] Detalhes do anúncio:`, 'color: #2196F3');
    console.table({
      anuncio_id: anuncioId,
      tipo_anuncio: tipoAnuncio,
      pagina: paginaId,
      preservar_layout: preservarLayout,
      component_id: componentIdRef.current,
      session_id: sessionId.current,
      ambiente: isDevelopment ? 'desenvolvimento' : 'produção'
    });
  }, [anuncioId, tipoAnuncio, paginaId, preservarLayout]);
  
  // Efeito para tratar primeira renderização em ambiente de desenvolvimento
  useEffect(() => {
    if (isDevelopment && isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      
      return () => {
        // Ignorar a primeira desmontagem em ambiente de desenvolvimento (provavelmente StrictMode)
        console.log(`%c[AdTracker] [${componentIdRef.current}] Ignorando primeira desmontagem (provavelmente StrictMode)`, 'color: gray');
      };
    }
  }, []);
  
  // Efeito para tratar as mudanças de rota e recarregamentos
  useEffect(() => {
    // Detectar mudanças de rota dentro do React
    const handleRouteChange = () => {
      isNavigatingAway = true;
      console.log(`%c[AdTracker] [${componentIdRef.current}] Mudança de rota detectada para ${anuncioId}`, 'color: #FF9800');
    };

    // Reset do estado ao montar
    isNavigatingAway = false;
    
    // Tentar detectar mudanças de rota em frameworks comuns
    if (typeof window !== 'undefined') {
      // Para React Router e frameworks similares
      window.addEventListener('popstate', handleRouteChange);
      
      // Para Next.js
      if (typeof window.__NEXT_DATA__ !== 'undefined') {
        const routeChangeStart = () => {
          isNavigatingAway = true;
          console.log(`%c[AdTracker] [${componentIdRef.current}] Mudança de rota Next.js detectada`, 'color: #FF9800');
        };
        
        // Verificar se existe o evento do Next.js
        if (window.next && window.next.router && typeof window.next.router.events?.on === 'function') {
          window.next.router.events.on('routeChangeStart', routeChangeStart);
        }
      }
      
      // Adicionar tratamento para o fechamento da página
      const handleBeforeUnload = () => {
        console.log(`%c[AdTracker] Fechamento de página detectado, enviando dados pendentes`, 'background: #FF5722; color: white; padding: 2px 5px; border-radius: 3px');
        
        // Registrar evento de fechamento da página no sistema de logs
        adTrackerLogs.adicionarLog(LOG_TYPES.PAGE_UNLOAD, {
          anuncio_id: anuncioId,
          tipo_anuncio: tipoAnuncio,
          pagina: paginaId || window.location.pathname,
          componente_id: componentIdRef.current,
          tempo_visivel: isVisible && visibleStartTime ? Math.round((Date.now() - visibleStartTime) / 1000) : 0
        });
        
        // Se o anúncio estiver visível, calcular o tempo atual de exposição
        if (isVisible && visibleStartTime) {
          const timeVisible = (Date.now() - visibleStartTime) / 1000;
          const roundedTime = Math.round(timeVisible * 100) / 100;
          
          // Apenas registrar se o tempo for suficiente
          if (roundedTime >= 0.5) {
            // Determinar o tipo de evento com inversão para tela-inteira
            let tipoEvento = 'impressao';
            if (tipoAnuncio === 'tela-inteira') {
              tipoEvento = 'clique'; // Inverter para tela-inteira
              console.log(`%c[AdTracker] Inversão no handleBeforeUnload: tela-inteira impressao -> clique`, 
                'background: #FF5722; color: white; padding: 3px 5px; border-radius: 3px');
            }
            
            const eventData = {
              anuncio_id: anuncioId,
              tipo_anuncio: tipoAnuncio,
              pagina: paginaId || window.location.pathname || '/',
              tipo_evento: tipoEvento,
              tempo_exposto: roundedTime,
              visivel: true,
              dispositivo: getDeviceInfo(),
              pais: locationInfo.pais || 'Desconhecido',
              regiao: locationInfo.regiao || 'Desconhecido',
              session_id: sessionId.current,
              timestamp: new Date().toISOString()
            };
            
            // Adicionar ao buffer
            eventsBuffer.push(eventData);
            
            // Registrar adição ao buffer no sistema de logs
            adTrackerLogs.adicionarLog(LOG_TYPES.BUFFER_ADD, {
              anuncio_id: eventData.anuncio_id,
              tipo_anuncio: eventData.tipo_anuncio,
              tipo_evento: eventData.tipo_evento,
              tempo_exposto: eventData.tempo_exposto,
              motivo: 'fechamento_pagina'
            });
          }
        }
        
        // Forçar salvamento dos logs antes do fechamento
        if (typeof adTrackerLogs.saveLogs === 'function') {
          adTrackerLogs.saveLogs();
        }
        
        // Enviar todos os eventos pendentes usando a função centralizada
        if (eventsBuffer.length > 0 && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
          // Usar o escopo global
          window.sendEventsByBeacon ? window.sendEventsByBeacon(eventsBuffer) : 
            console.error('%c[AdTracker] Função sendEventsByBeacon não disponível no escopo global', 'color: red');
        }
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
    
      // Limpeza ao desmontar completamente
      return () => {
        // Limpar listeners na desmontagem
        if (typeof window !== 'undefined') {
          window.removeEventListener('popstate', handleRouteChange);
          window.removeEventListener('beforeunload', handleBeforeUnload);
          
          // Limpar evento do Next.js se existir
          if (window.next && window.next.router && typeof window.next.router.events?.off === 'function') {
            window.next.router.events.off('routeChangeStart', routeChangeStart);
          }
        }
      };
    }
    
    // Se window não estiver definido, retornar uma função de limpeza vazia
    return () => {};
  }, [anuncioId, tipoAnuncio, paginaId, componentIdRef, isVisible, visibleStartTime, locationInfo, eventsBuffer]);
  
  // Remover o bloqueio global de isNavigatingAway após um curto período
  // Isso permite que navegações subsequentes sejam rastreadas corretamente
  useEffect(() => {
    const resetNavigationTimer = setTimeout(() => {
      if (isNavigatingAway) {
        console.log('%c[AdTracker] Resetando flag de navegação', 'color: #888');
        isNavigatingAway = false;
      }
    }, 1000);
    
    return () => clearTimeout(resetNavigationTimer);
  }, []);
  
  // Efeito para recuperar eventos pendentes - executa apenas uma vez
  useEffect(() => {
    if (!initialized) {
      console.log(`%c[AdTracker] [${componentIdRef.current}] Anúncio ${tipoAnuncio} (${anuncioId}): Inicializando e verificando eventos pendentes...`, 'color: #4CAF50');
      recoverPendingEvents();
      setInitialized(true);
      
      // Inicializar o tempo de montagem
      mountTimeRef.current = Date.now();
      
      // Para anúncios de tela inteira, iniciar o cronômetro imediatamente
      if (tipoAnuncio === 'tela-inteira') {
        console.log(`%c[AdTracker] [${componentIdRef.current}] Anúncio de tela inteira - iniciando cronômetro imediatamente`, 'color: #FFC107; font-weight: bold');
        setVisibleStartTime(Date.now());
        setIsVisible(true);
        
        // Iniciar o cronômetro para rastrear tempo exposto
        if (!exposureTimerRef.current) {
          exposureTimerRef.current = setInterval(() => {
            setExposureTime(prev => {
              const newValue = prev + 1;
              if (newValue % 10 === 0) {
                console.log(`%c[AdTracker] [${componentIdRef.current}] Anúncio ${tipoAnuncio}: Tempo exposto (tela inteira): ${newValue}s`, 'color: #FF9800');
              }
              return newValue;
            });
          }, 1000);
        }
      }
      
      // Remover registro automático no início da montagem
      // Os forceTrackingTypes serão registrados apenas após o IntersectionObserver detectar visibilidade real
      
      // Configurar um backup para anúncios que podem não ser detectados pelo IntersectionObserver
      setTimeout(() => {
        // Se ainda não registramos uma impressão após 5s, verificar manualmente a visibilidade
        if (!hasReportedRef.current && !isNavigatingAway) {
          console.log(`%c[AdTracker] [${componentIdRef.current}] Anúncio ${tipoAnuncio} (${anuncioId}): Backup - Verificando após 5s`, 'color: #888');
          
          // Realizar uma verificação manual de visibilidade
          const rect = observerElementRef.current?.getBoundingClientRect();
          if (rect) {
            const windowHeight = window.innerHeight || document.documentElement.clientHeight;
            const windowWidth = window.innerWidth || document.documentElement.clientWidth;
            
            // Usar critérios mais estritos para determinar visibilidade
            const isElementVisible = (
              rect.top < windowHeight && 
              rect.bottom > 0 && 
              rect.left < windowWidth && 
              rect.right > 0
            );
            
            if (isElementVisible) {
              console.log(`%c[AdTracker] [${componentIdRef.current}] Anúncio ${tipoAnuncio} (${anuncioId}): Elemento realmente visível em tela`, 'background: #795548; color: white; padding: 2px 5px; border-radius: 3px');
              
              // Não registramos imediatamente, mas iniciamos o cronômetro
              if (!visibleStartTime) {
                setVisibleStartTime(Date.now());
                setIsVisible(true);
                
                // Iniciar o cronômetro para contabilizar corretamente o tempo
                if (!exposureTimerRef.current) {
                  exposureTimerRef.current = setInterval(() => {
                    setExposureTime(prev => {
                      const newValue = prev + 1;
                      // Removido o registro automático após 1 segundo
                      // Agora apenas incrementa o contador, sem registrar evento
                      return newValue;
                    });
                  }, 1000);
                }
              }
            }
          }
        }
      }, 5000);
    }
    
    // Limpeza ao desmontar completamente
    return () => {
      const id = componentIdRef.current;
      const componentLifetime = Date.now() - actualMountTimeRef.current;
      
      console.log(`%c[AdTracker] [${id}] Anúncio ${tipoAnuncio} (${anuncioId}): Desmontando componente após ${componentLifetime}ms`, 'color: #F44336');
      
      // Verificar se estamos em uma navegação ou recarregamento de página
      if (isNavigatingAway) {
        console.log(`%c[AdTracker] [${id}] Navegação ou recarregamento detectado, ignorando registro automático`, 'color: orange');
      }
      // Verificar se estamos em ambiente de desenvolvimento e se é uma desmontagem rápida
      // Ignorar registro de impressão em desmontagens muito rápidas (provavelmente causadas por StrictMode)
      else if (isDevelopment && componentLifetime < MIN_COMPONENT_LIFETIME) {
        console.log(`%c[AdTracker] [${id}] Desmontagem rápida detectada (${componentLifetime}ms), ignorando registro automático`, 'color: orange');
      }
      // Verificar se o componente já registrou uma impressão ou se foi muito curto
      else if (!hasReportedRef.current && componentLifetime >= MIN_COMPONENT_LIFETIME) {
        // Verificar se o anúncio realmente teve alguma visibilidade verificada
        // Se nunca foi visível pelo IntersectionObserver ou verificação manual, não registrar
        if (!isVisible && !visibleStartTime && exposureTime === 0) {
          console.log(`%c[AdTracker] [${id}] Anúncio ${tipoAnuncio} (${anuncioId}): Ignorando registro na desmontagem - anúncio nunca foi visível`, 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px');
        } else {
          console.log(`%c[AdTracker] [${id}] Anúncio ${tipoAnuncio} (${anuncioId}): Forçando registro na desmontagem`, 'background: #E91E63; color: white; padding: 2px 5px; border-radius: 3px');
          
          let finalVisibleTime = 1.0; // Valor padrão para garantir o registro
          
          // Se temos um tempo real, usá-lo
          if (visibleStartTime) {
            finalVisibleTime = (Date.now() - visibleStartTime) / 1000;
          } else if (tipoAnuncio === 'tela-inteira') {
            // Para anúncios de tela inteira, usar o tempo desde a montagem
            finalVisibleTime = (Date.now() - mountTimeRef.current) / 1000;
          } else if (exposureTime > 0) {
            finalVisibleTime = exposureTime;
          }
          
          // Usar apenas o tempo real sem valor mínimo forçado
          finalVisibleTime = Math.round(finalVisibleTime * 100) / 100;
          
          // Marcar que já reportamos para este anúncio
          hasReportedRef.current = true;
          
          // Registrar o evento final
          const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
          const pagina = paginaId || currentPath || '/';
          
          // Determinar o tipo de evento com inversão para tela-inteira
          let tipoEvento = 'impressao';
          if (tipoAnuncio === 'tela-inteira') {
            tipoEvento = 'clique'; // Inverter para tela-inteira
            console.log(`%c[AdTracker] [${id}] Inversão na desmontagem: tela-inteira impressao -> clique`, 
              'background: #FF5722; color: white; padding: 3px 5px; border-radius: 3px');
          }
          
          registerEvent({
            anuncio_id: anuncioId,
            tipo_anuncio: tipoAnuncio,
            pagina: pagina,
            tipo_evento: tipoEvento,
            tempo_exposto: finalVisibleTime,
            visivel: true,
            dispositivo: getDeviceInfo(),
            pais: locationInfo.pais,
            regiao: locationInfo.regiao,
            session_id: sessionId.current,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // Limpar o observer na desmontagem
      if (observerRef.current && observerElementRef.current) {
        observerRef.current.unobserve(observerElementRef.current);
        observerRef.current = null;
      }
      
      // Limpar temporizador
      if (exposureTimerRef.current) {
        clearInterval(exposureTimerRef.current);
        exposureTimerRef.current = null;
      }
      
      // Verificar se há eventos para enviar
      if (eventsBuffer.length > 0) {
        console.log(`%c[AdTracker] [${id}] Anúncio ${tipoAnuncio} (${anuncioId}): Componente desmontado, enviando ${eventsBuffer.length} eventos pendentes`, 'color: #9C27B0');
        flushEventsBuffer();
      }
    };
  }, [anuncioId, tipoAnuncio, paginaId]);
  
  // Efeito para obter localização - executa apenas uma vez
  useEffect(() => {
    const fetchLocation = async () => {
      const location = await getLocation();
      setLocationInfo(location);
      console.log(`%c[AdTracker] [${componentIdRef.current}] Anúncio ${tipoAnuncio} (${anuncioId}): Localização definida como ${location.pais}, ${location.regiao}`, 'color: #607D8B');
    };
    
    fetchLocation();
  }, []);
  
  // Configurar a detecção de visibilidade com IntersectionObserver
  useEffect(() => {
    const componentId = componentIdRef.current;
    
    // Verificar se temos todos os dados necessários
    if (!anuncioId || !tipoAnuncio || !anuncioRef.current || !observerElementRef.current) {
      console.warn(`%c[AdTracker] [${componentId}] ERRO: Dados incompletos para configurar detecção de visibilidade`, 'color: red', {
        anuncioId, tipoAnuncio, refExiste: !!anuncioRef.current, observerElementExiste: !!observerElementRef.current
      });
      return; // Não configurar o observer se faltar qualquer dado essencial
    }
    
    // Limpar observer anterior se existir
    if (observerRef.current && observerElementRef.current) {
      observerRef.current.unobserve(observerElementRef.current);
      observerRef.current = null;
    }
    
    // Usar o paginaId fornecido ou cair para o pathname como fallback
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const pagina = paginaId || currentPath || '/';
    
    console.log(`%c[AdTracker] [${componentId}] Anúncio ${tipoAnuncio} (${anuncioId}): Configurando observer em ${pagina}`, 'color: #3F51B5');
    
    // Flag para controlar se já enviamos evento neste ciclo de vida do componente
    let hasReportedExposure = false;
    // Tempo mínimo (em segundos) que um anúncio deve estar visível para ser registrado
    const MIN_VISIBLE_TIME = 1.0;
    
    // Definir limiares com base no tipo de anúncio
    // Anúncios fixos e laterais precisam de menos visibilidade para serem considerados visíveis
    let thresholds = [0, 0.05, 0.1, 0.25, 0.5, 0.75, 1.0];
    const isFixedAd = ['lateral', 'fixo-superior', 'fixo-inferior'].includes(tipoAnuncio);
    
    // Para anúncios fixos, usamos limiares menores para detectar mais facilmente
    if (isFixedAd) {
      thresholds = [0, 0.01, 0.03, 0.05, 0.1, 0.25, 0.5];
      console.log(`%c[AdTracker] [${componentId}] Usando limiares especiais para anúncio fixo ${tipoAnuncio}`, 'color: #9C27B0');
      
      // Para anúncios fixo-inferior, considerar visível por padrão
      if (tipoAnuncio === 'fixo-inferior') {
        console.log(`%c[AdTracker] [${componentId}] Anúncio fixo-inferior - considerando visível por padrão`, 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px');
        // Iniciar a visibilidade imediatamente
        if (!isVisible) {
          setIsVisible(true);
          setVisibleStartTime(Date.now());
          
          // Iniciar o cronômetro para rastrear tempo exposto
          if (!exposureTimerRef.current) {
            exposureTimerRef.current = setInterval(() => {
              setExposureTime(prev => {
                const newValue = prev + 1;
                if (newValue % 10 === 0) {
                  console.log(`%c[AdTracker] [${componentId}] Anúncio ${tipoAnuncio}: Tempo exposto: ${newValue}s`, 'color: #00BCD4');
                }
                return newValue;
              });
            }, 1000);
          }
        }
      }
    }
    
    // Configurar verificação manual de visibilidade para garantir que anúncios no final da página sejam detectados
    // Esta é uma abordagem de backup para anúncios que não são detectados pelo IntersectionObserver
    const checkVisibilityManually = () => {
      if (hasReportedRef.current && exposureTime > 0) return; // Não verificar se já reportamos com tempo exposto
      
      // Verificar se o elemento existe e se está no DOM
      if (!observerElementRef.current || !document.body.contains(observerElementRef.current)) {
        return;
      }
      
      const rect = observerElementRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const windowWidth = window.innerWidth || document.documentElement.clientWidth;
      
      // Verificar se o elemento está pelo menos parcialmente visível na janela
      const isElementVisible = (
        rect.top < windowHeight && 
        rect.bottom > 0 && 
        rect.left < windowWidth && 
        rect.right > 0
      );
      
      // Se já está visível, não fazer nada
      if (isElementVisible === isVisible) {
        return;
      }
      
      console.log(`%c[AdTracker] [${componentId}] Verificação manual: Anúncio ${tipoAnuncio} (${anuncioId}) está ${isElementVisible ? 'visível' : 'invisível'}`, 
        isElementVisible ? 'background: #4CAF50; color: white;' : 'background: #F44336; color: white;', 
        'padding: 2px 5px; border-radius: 3px');
      
      // Simular o comportamento do IntersectionObserver
      if (isElementVisible && !isVisible) {
        setIsVisible(true);
        setVisibleStartTime(Date.now());
        
        // Iniciar o cronômetro para rastrear tempo exposto
        if (!exposureTimerRef.current) {
          exposureTimerRef.current = setInterval(() => {
            setExposureTime(prev => {
              const newValue = prev + 1;
              // Reduzir frequência de logs (apenas a cada 10 segundos)
              if (newValue % 10 === 0) {
                console.log(`%c[AdTracker] [${componentId}] Anúncio ${tipoAnuncio} (${anuncioId}): Tempo exposto: ${newValue}s`, 'color: #00BCD4');
              }
              
              // Verificar se atingiu o tempo mínimo para registrar
              const timeThreshold = isFixedAd ? 0.5 : MIN_VISIBLE_TIME;
              
              if (newValue >= timeThreshold && !hasReportedExposure && !hasReportedRef.current) {
                console.log(`%c[AdTracker] [${componentId}] Anúncio ${tipoAnuncio} (${anuncioId}): Tempo mínimo atingido (${newValue}s)`, 'background: #673AB7; color: white; padding: 2px 5px; border-radius: 3px');
                
                // Apenas marcar que o tempo mínimo foi atingido, mas NÃO registrar o evento agora
                // O registro será feito apenas quando o anúncio sair da área visível ou o componente for desmontado
                hasReportedExposure = true;
                hasReportedRef.current = true;
              }
              
              return newValue;
            });
          }, 1000);
        }
      } else if (!isElementVisible && isVisible) {
        setIsVisible(false);
        
        // Parar o cronômetro
        if (exposureTimerRef.current) {
          clearInterval(exposureTimerRef.current);
          exposureTimerRef.current = null;
        }
        
        // Registrar o tempo visível se for suficiente
        if (visibleStartTime) {
          const timeVisible = (Date.now() - visibleStartTime) / 1000;
          const roundedTime = Math.round(timeVisible * 100) / 100;
          const minTimeThreshold = isFixedAd ? 0.3 : 0.5;
          
          if (timeVisible >= minTimeThreshold && !hasReportedExposure && !hasReportedRef.current) {
            console.log(`%c[AdTracker] [${componentId}] Anúncio ${tipoAnuncio} (${anuncioId}): Registrando impressão manual com tempo=${roundedTime}`, 'background: #673AB7; color: white; padding: 2px 5px; border-radius: 3px');
            hasReportedExposure = true;
            hasReportedRef.current = true;
            
            // Determinar o tipo de evento com inversão para tela-inteira
            let tipoEvento = 'impressao';
            if (tipoAnuncio === 'tela-inteira') {
              tipoEvento = 'clique'; // Inverter para tela-inteira
              console.log(`%c[AdTracker] [${componentId}] Inversão no checkVisibilityManually: tela-inteira impressao -> clique`, 
                'background: #FF5722; color: white; padding: 3px 5px; border-radius: 3px');
            }
            
            // Usar o tempo real medido sem valores mínimos fixos
            registerEvent({
              anuncio_id: anuncioId,
              tipo_anuncio: tipoAnuncio,
              pagina: pagina,
              tipo_evento: tipoEvento,
              tempo_exposto: roundedTime,
              visivel: true,
              dispositivo: getDeviceInfo(),
              pais: locationInfo.pais,
              regiao: locationInfo.regiao,
              session_id: sessionId.current,
              timestamp: new Date().toISOString()
            });
          }
          
          setVisibleStartTime(null);
          setExposureTime(0);
        }
      }
    };
    
    // Configurar timer para verificação periódica de visibilidade a cada 500ms (mais frequente)
    // Especialmente útil para elementos que podem não ser detectados corretamente pelo IntersectionObserver
    visibilityCheckTimerRef.current = setInterval(checkVisibilityManually, 500);
    
    // Adicionar eventos de scroll e resize para verificação adicional de visibilidade
    const handleViewportChange = () => {
      // Executar verificação manual após um pequeno delay para permitir que o DOM se estabilize
      setTimeout(checkVisibilityManually, 100);
    };
    
    window.addEventListener('scroll', handleViewportChange, { passive: true });
    window.addEventListener('resize', handleViewportChange, { passive: true });
    
    // Verificação inicial mais agressiva - repetir algumas vezes nos primeiros segundos
    setTimeout(checkVisibilityManually, 100); // Verificação quase imediata
    setTimeout(checkVisibilityManually, 500); // Verificação após meio segundo
    setTimeout(checkVisibilityManually, 1000); // Verificação após 1 segundo
    setTimeout(checkVisibilityManually, 2000); // Verificação após 2 segundos
    
    // Criar um novo observer com configurações mais sensíveis
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const isNowVisible = entry.isIntersecting;
        const visibilityPercentage = Math.round(entry.intersectionRatio * 100);
        
        // Verificar tempo de vida do componente
        const componentLifetime = Date.now() - actualMountTimeRef.current;
        
        // Log mais detalhado
        console.log(`%c[AdTracker] [${componentId}] Observer: ${tipoAnuncio} (${anuncioId}) - isIntersecting: ${isNowVisible}, ratio: ${entry.intersectionRatio.toFixed(3)}`, 
          'color: #888');
        
        // Evitar atualizações redundantes ou se for uma renderização muito rápida em desenvolvimento
        if (isNowVisible === isVisible || (isDevelopment && componentLifetime < MIN_COMPONENT_LIFETIME)) {
          return;
        }
        
        setIsVisible(isNowVisible);
        
        if (isNowVisible) {
          // Anúncio acabou de ficar visível
          const currentTime = Date.now();
          setVisibleStartTime(currentTime);
          
          // Log específico para anúncios fixos vs. outros tipos
          if (isFixedAd) {
            console.log(`%c[AdTracker] [${componentId}] Anúncio fixo ${tipoAnuncio} (${anuncioId}): Visível (${visibilityPercentage}%)`, 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px');
          } else {
            console.log(`%c[AdTracker] [${componentId}] Anúncio ${tipoAnuncio} (${anuncioId}): Visível (${visibilityPercentage}%)`, 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px');
          }
          
          // Iniciar o cronômetro para rastrear tempo exposto
          if (!exposureTimerRef.current) {
            exposureTimerRef.current = setInterval(() => {
              setExposureTime(prev => {
                const newValue = prev + 1;
                // Reduzir frequência de logs (apenas a cada 10 segundos)
                if (newValue % 10 === 0) {
                  console.log(`%c[AdTracker] [${componentId}] Anúncio ${tipoAnuncio} (${anuncioId}): Tempo exposto: ${newValue}s`, 'color: #00BCD4');
                }
                
                // Verificar se atingiu o tempo mínimo para registrar
                const timeThreshold = isFixedAd ? 0.5 : MIN_VISIBLE_TIME;
                
                if (newValue >= timeThreshold && !hasReportedExposure && !hasReportedRef.current) {
                  console.log(`%c[AdTracker] [${componentId}] Anúncio ${tipoAnuncio} (${anuncioId}): Tempo mínimo atingido (${newValue}s)`, 'background: #673AB7; color: white; padding: 2px 5px; border-radius: 3px');
                  
                  // Apenas marcar que o tempo mínimo foi atingido, mas NÃO registrar o evento agora
                  // O registro será feito apenas quando o anúncio sair da área visível ou o componente for desmontado
                  hasReportedExposure = true;
                  hasReportedRef.current = true;
                }
                
                return newValue;
              });
            }, 1000);
          }
          
          // Apenas marcamos que estamos visualizando
          if (!hasRegisteredImpression) {
            console.log(`%c[AdTracker] [${componentId}] Anúncio ${tipoAnuncio} (${anuncioId}): Iniciando visualização`, 'color: #8BC34A');
            setHasRegisteredImpression(true);
          }
        } else if (visibleStartTime) {
          // Anúncio acabou de ficar invisível
          const currentTime = Date.now();
          const timeVisible = (currentTime - visibleStartTime) / 1000; // em segundos
          const roundedTime = Math.round(timeVisible * 100) / 100; // Arredondar para 2 casas decimais
          
          console.log(`%c[AdTracker] [${componentId}] Anúncio ${tipoAnuncio} (${anuncioId}): Não mais visível. Tempo exposto: ${roundedTime.toFixed(2)}s`, 'background: #FF5722; color: white; padding: 2px 5px; border-radius: 3px');
          
          // Parar o cronômetro
          if (exposureTimerRef.current) {
            clearInterval(exposureTimerRef.current);
            exposureTimerRef.current = null;
          }
          
          // Atualizar o tempo de exposição - SEMPRE ENVIAR o evento quando o anúncio sai de tela
          // independente se já enviamos um evento antes, para capturar o tempo total
          const minTimeThreshold = isFixedAd ? 0.3 : 0.5;
          
          if (timeVisible >= minTimeThreshold) {
            // Determinar o tipo de evento com inversão para tela-inteira
            let tipoEvento = 'impressao';
            if (tipoAnuncio === 'tela-inteira') {
              tipoEvento = 'clique'; // Inverter para tela-inteira
              console.log(`%c[AdTracker] [${componentId}] Inversão no IntersectionObserver: tela-inteira impressao -> clique`, 
                'background: #FF5722; color: white; padding: 3px 5px; border-radius: 3px');
            }
            
            // Usar o tempo real medido, sem valores mínimos fixos
            console.log(`%c[AdTracker] [${componentId}] Anúncio ${tipoAnuncio} (${anuncioId}): Registrando ${tipoEvento} com tempo real=${roundedTime.toFixed(2)}s`, 'background: #673AB7; color: white; padding: 2px 5px; border-radius: 3px');
            
            // Marcar que já enviamos pelo menos um evento
            hasReportedExposure = true;
            hasReportedRef.current = true;
            
            registerEvent({
              anuncio_id: anuncioId,
              tipo_anuncio: tipoAnuncio,
              pagina: pagina,
              tipo_evento: tipoEvento,
              tempo_exposto: roundedTime,
              visivel: false, // Agora está invisível
              dispositivo: getDeviceInfo(),
              pais: locationInfo.pais,
              regiao: locationInfo.regiao,
              session_id: sessionId.current,
              timestamp: new Date().toISOString()
            });
          } else if (timeVisible < minTimeThreshold) {
            console.log(`%c[AdTracker] [${componentId}] Anúncio ${tipoAnuncio} (${anuncioId}): Tempo insuficiente (${roundedTime}s < ${minTimeThreshold}s) para registrar impressão`, 'background: #FFC107; color: black; padding: 2px 5px; border-radius: 3px');
          }
          
          setVisibleStartTime(null);
          setExposureTime(0); // Resetar contador
        }
      },
      {
        threshold: thresholds, // Usar os limiares definidos com base no tipo de anúncio
        rootMargin: isFixedAd ? '50px' : '20px' // Margem extra aumentada para melhor detecção
      }
    );
    
    // Observar o elemento invisível ao invés do container
    observerRef.current.observe(observerElementRef.current);
    
    // Função de limpeza
    return () => {
      // Este cleanup só ocorre quando as dependências mudam, não no desmonte final
      if (exposureTimerRef.current) {
        clearInterval(exposureTimerRef.current);
        exposureTimerRef.current = null;
      }
      
      if (observerRef.current && observerElementRef.current) {
        observerRef.current.unobserve(observerElementRef.current);
        observerRef.current = null;
      }
      
      // Limpar o timer de verificação de visibilidade
      if (visibilityCheckTimerRef.current) {
        clearInterval(visibilityCheckTimerRef.current);
        visibilityCheckTimerRef.current = null;
      }
      
      // Remover event listeners
      window.removeEventListener('scroll', handleViewportChange);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [anuncioId, tipoAnuncio, paginaId, hasRegisteredImpression, locationInfo, isVisible]);
  
  // Registrar clique quando o usuário clicar no anúncio
  const handleClick = () => {
    const componentId = componentIdRef.current;
    
    // Verificar se temos todos os dados necessários
    if (!anuncioId || !tipoAnuncio) {
      console.warn(`%c[AdTracker] [${componentId}] ERRO: Tentativa de registrar clique sem dados essenciais`, 'color: red');
      return; // Não registrar o clique se faltar qualquer dado essencial
    }
    
    // Usar o paginaId fornecido ou cair para o pathname como fallback
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const pagina = paginaId || currentPath || '/';
    
    // Calcular o tempo decorrido desde a montagem até o clique (normalmente menor)
    // Para cliques, queremos registrar o tempo de reação, não o tempo total de exposição
    const tempoReacao = (Date.now() - mountTimeRef.current) / 1000;
    
    // Garantir que o tempo seja um número válido e arredondado (mas não acumular tempo total)
    const tempoArredondado = Math.max(0.1, Math.round(tempoReacao * 100) / 100);
    
    // Determinar o tipo de evento a ser registrado, invertendo para tela-inteira
    let tipoEvento = 'clique';
    if (tipoAnuncio === 'tela-inteira') {
      tipoEvento = 'impressao'; // Inverter para tela-inteira
      console.log(`%c[AdTracker] [${componentId}] Invertendo tipo_evento para tela-inteira: clique -> impressao`, 
        'background: #FF5722; color: white; padding: 3px 5px; border-radius: 3px');
    }
    
    console.log(`%c[AdTracker] [${componentId}] Anúncio ${tipoAnuncio} (${anuncioId}): CLIQUE detectado! Registrando como ${tipoEvento}. Tempo de reação: ${tempoArredondado.toFixed(2)}s`, 'background: #E91E63; color: white; font-size: 14px; padding: 5px; border-radius: 3px');
    
    registerEvent({
      anuncio_id: anuncioId,
      tipo_anuncio: tipoAnuncio,
      pagina: pagina,
      tipo_evento: tipoEvento,
      tempo_exposto: tempoArredondado, // Usar o tempo de reação para cliques
      visivel: true,
      dispositivo: getDeviceInfo(),
      pais: locationInfo.pais,
      regiao: locationInfo.regiao,
      session_id: sessionId.current,
      timestamp: new Date().toISOString()
    });
  };
  
  // Obtém estilo para o elemento de observação invisível com base no tipo de anúncio
  const getObserverElementStyle = () => {
    // Estilo base comum para todos os tipos
    const baseStyle = {
      position: 'absolute',
      top: '-20px',  // Aumentar a área de detecção para cima
      left: '-20px', // Aumentar a área de detecção para a esquerda
      width: 'calc(100% + 40px)',  // Aumentar a largura total
      height: 'calc(100% + 40px)', // Aumentar a altura total
      pointerEvents: 'none',
      zIndex: -1,
      opacity: 0,
      // Adicionar overflow: visible para melhor detecção
      overflow: 'visible'
    };

    // Ajustes específicos por tipo de anúncio
    switch (tipoAnuncio) {
      case 'fixo-superior':
        return {
          ...baseStyle,
          position: 'absolute',
          width: '100vw',  // Usar toda a largura da viewport
          height: 'calc(100% + 50px)', // Aumentar significativamente a altura
          top: '-10px',
          left: '0'
        };
      case 'fixo-inferior':
        return {
          ...baseStyle,
          position: 'absolute',
          width: '100vw',  // Usar toda a largura da viewport
          height: 'calc(100% + 100px)', // Aumentar ainda mais a altura para garantir detecção
          top: '-50px',
          left: '0',
          zIndex: -1,  // Garantir que está abaixo do conteúdo visível
          opacity: 0.001, // Muito pequeno, mas detectável
          pointerEvents: 'none' // Não interferir em cliques
        };
      case 'lateral':
        return {
          ...baseStyle,
          position: 'absolute',
          width: 'calc(100% + 100px)', // Aumentar significativamente a largura
          height: '100vh', // Usar toda a altura da viewport
          top: '0',
          left: '-50px'
        };
      case 'tela-inteira':
        return {
          ...baseStyle,
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100vw',
          height: '100vh'
        };
      case 'video':
        return {
          ...baseStyle,
          // Aumentar a área de detecção para anúncios de vídeo
          top: '-30px',
          left: '-30px',
          width: 'calc(100% + 60px)',
          height: 'calc(100% + 60px)',
        };
      case 'quadrado':
        return {
          ...baseStyle,
          // Aumentar a área de detecção para anúncios quadrados
          top: '-25px',
          left: '-25px',
          width: 'calc(100% + 50px)',
          height: 'calc(100% + 50px)',
        };
      case 'banner':
        return {
          ...baseStyle,
          // Aumentar a área de detecção para banners
          top: '-20px',
          left: '-20px',
          width: 'calc(100% + 40px)',
          height: 'calc(100% + 60px)',
        };
      // Tratar anúncios de cursos e qualquer tipo que contenha "curso" no nome
      case 'curso1':
      case 'curso2':
      case 'curso3':
      case 'curso':
        return {
          ...baseStyle,
          // Área de detecção ainda maior para cursos
          top: '-40px',
          left: '-40px',
          width: 'calc(100% + 80px)',
          height: 'calc(100% + 80px)',
        };
      // Para outros tipos: cursos, logos
      default:
        // Se o tipo contiver "curso", tratar como curso
        if (tipoAnuncio.includes('curso')) {
          return {
            ...baseStyle,
            // Área de detecção ainda maior para cursos
            top: '-40px',
            left: '-40px',
            width: 'calc(100% + 80px)',
            height: 'calc(100% + 80px)',
          };
        }
        
        // Se o tipo contiver "logo", tratar como logo
        if (tipoAnuncio.includes('logo')) {
          return {
            ...baseStyle,
            // Área de detecção para logos
            top: '-20px',
            left: '-20px',
            width: 'calc(100% + 40px)',
            height: 'calc(100% + 40px)',
          };
        }
        
        return baseStyle;
    }
  };
  
  // Estilo para não afetar o layout quando preservarLayout=true
  let trackerStyle = preservarLayout ? {
    display: 'contents',
    width: 'auto',
    height: 'auto'
  } : {};
  
  // Estilos especiais para anúncios fixo-inferior
  if (tipoAnuncio === 'fixo-inferior') {
    trackerStyle = {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      width: '100%',
      zIndex: 9999,
      display: 'block'
    };
  }
  
  // Estilo para o container do elemento observável
  let observerContainerStyle = {
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'contents'
  };
  
  // Ajustes específicos para fixo-inferior
  if (tipoAnuncio === 'fixo-inferior') {
    observerContainerStyle = {
      ...observerContainerStyle,
      display: 'block',
      position: 'relative'
    };
  }
  
  // Determinar a classe correta com base no tipo de anúncio
  const getTrackerClassName = () => {
    let className = 'ad-tracker-container';
    
    // Adicionar classes específicas para tipos especiais
    if (['video', 'quadrado', 'banner', 'fixo-inferior', 'fixo-superior', 'lateral'].includes(tipoAnuncio)) {
      className += ` ad-tracker-${tipoAnuncio}`;
    }
    
    // Adicionar classe especial para fixo-inferior para garantir posicionamento correto
    if (tipoAnuncio === 'fixo-inferior') {
      className += ' fixed-bottom-ad';
    }
    
    return className;
  };
  
  // Renderizar o componente com o envoltório para rastreamento
  return (
    <div 
      className={getTrackerClassName()}
      ref={anuncioRef} 
      onClick={handleClick}
      style={trackerStyle}
      data-ad-id={anuncioId}
      data-ad-type={tipoAnuncio}
      data-page-id={paginaId}
    >
      <div className="ad-tracker-observer-container" style={observerContainerStyle}>
        {/* Elemento invisível que será alvo do IntersectionObserver */}
        <div 
          ref={observerElementRef}
          className="ad-tracker-observer-element"
          style={getObserverElementStyle()}
          data-ad-tracking-element={`${tipoAnuncio}-${anuncioId}`}
        />
        {children}
      </div>
    </div>
  );
};

export default AdTracker;

// Adicionar função para diagnóstico no escopo global
if (typeof window !== 'undefined') {
  window.adTrackerDiagnostico = function() {
    // Chamar a função de diagnóstico do sistema de logs
    const stats = adTrackerLogs.diagnosticarAdTracker();
    
    // Informações adicionais específicas do AdTracker
    console.log('%c[AdTracker] Diagnóstico do AdTracker', 'background: #4CAF50; color: white; font-size: 14px; padding: 5px; border-radius: 3px');
    
    // Verificar eventos antigos
    const eventosAntigos = verificarEventosAntigos();
    
    // Informações sobre o buffer atual
    console.log('%c[AdTracker] Buffer atual:', 'color: #2196F3; font-weight: bold');
    console.table({
      tamanho_atual: eventsBuffer.length,
      limite_tamanho: BUFFER_SIZE_LIMIT,
      timeout: BUFFER_TIMEOUT / 1000 + 's',
      eventos_antigos: eventosAntigos || 0,
      timer_ativo: !!bufferTimer
    });
    
    // Mostrar os eventos no buffer
    if (eventsBuffer.length > 0) {
      console.log('%c[AdTracker] Eventos no buffer:', 'color: #2196F3; font-weight: bold');
      console.table(eventsBuffer.map(e => ({
        anuncio_id: e.anuncio_id,
        tipo_anuncio: e.tipo_anuncio,
        tipo_evento: e.tipo_evento,
        tempo_exposto: e.tempo_exposto,
        timestamp: e.timestamp
      })));
    }
    
    // Retornar estatísticas combinadas
    return {
      ...stats,
      buffer: {
        tamanho_atual: eventsBuffer.length,
        limite_tamanho: BUFFER_SIZE_LIMIT,
        timeout: BUFFER_TIMEOUT / 1000 + 's',
        eventos_antigos: eventosAntigos || 0,
        timer_ativo: !!bufferTimer
      }
    };
  };
  
  console.log('%c[AdTracker] Função de diagnóstico disponível: window.adTrackerDiagnostico()', 'background: #4CAF50; color: white; padding: 3px 5px; border-radius: 3px');
}