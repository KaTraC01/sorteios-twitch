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
const CLOSE_BATCH_SIZE = 10; // Tamanho do lote para fechamento de página (menor que o normal)
const componentIds = {}; // Armazenar IDs dos componentes rastreados
const STALE_EVENT_THRESHOLD = 5 * 60 * 1000; // 5 minutos em ms

// Novo: Set para armazenar IDs de eventos já processados (evitar duplicidade)
const processedEventIds = new Set();
const PROCESSED_IDS_STORAGE_KEY = 'adtracker_processed_event_ids';
const MAX_PROCESSED_IDS = 1000; // Limitar o número de IDs armazenados

// Novo: Função para gerar ID único para evento
const generateEventId = (eventData) => {
  const { anuncio_id, tipo_anuncio, tipo_evento, pagina, tempo_exposto } = eventData;
  const timestamp = new Date().getTime();
  // Criar um hash simples combinando os dados do evento
  return `${anuncio_id}_${tipo_anuncio}_${tipo_evento}_${pagina}_${Math.round(tempo_exposto * 100)}_${timestamp}`;
};

// Novo: Carregar IDs de eventos processados do localStorage
const loadProcessedEventIds = () => {
  if (typeof window === 'undefined') return;
  
  try {
    const storedIds = localStorage.getItem(PROCESSED_IDS_STORAGE_KEY);
    if (storedIds) {
      const ids = JSON.parse(storedIds);
      ids.forEach(id => processedEventIds.add(id));
      console.log(`%c[AdTracker] ${processedEventIds.size} IDs de eventos processados carregados`, 'color: #9C27B0');
    }
  } catch (error) {
    console.error('%c[AdTracker] Erro ao carregar IDs de eventos processados:', 'color: red', error);
  }
};

// Novo: Salvar IDs de eventos processados no localStorage
const saveProcessedEventIds = () => {
  if (typeof window === 'undefined') return;
  
  try {
    // Converter Set para Array e limitar tamanho
    const idsArray = Array.from(processedEventIds);
    const limitedIds = idsArray.slice(-MAX_PROCESSED_IDS);
    
    localStorage.setItem(PROCESSED_IDS_STORAGE_KEY, JSON.stringify(limitedIds));
  } catch (error) {
    console.error('%c[AdTracker] Erro ao salvar IDs de eventos processados:', 'color: red', error);
  }
};

// Adicionar listener para quando a página for fechada
if (typeof window !== 'undefined') {
  // Novo: Carregar IDs de eventos processados
  loadProcessedEventIds();
  
  // Função para enviar eventos usando sendBeacon (ideal para fechamento de página)
  const sendEventsByBeacon = (events) => {
    if (!events || events.length === 0) {
      return false;
    }
    
    // Novo: Filtrar eventos já processados
    const uniqueEvents = events.filter(event => {
      // Se o evento já tem ID, verificar se já foi processado
      if (event.event_id && processedEventIds.has(event.event_id)) {
        return false;
      }
      // Se não tem ID, gerar um
      if (!event.event_id) {
        event.event_id = generateEventId(event);
      }
      return true;
    });
    
    // Se todos os eventos já foram processados, não fazer nada
    if (uniqueEvents.length === 0) {
      console.log('%c[AdTracker] Todos os eventos já foram processados, ignorando envio', 'color: #FF9800');
      return true;
    }
    
    // Registrar tentativa de envio no sistema de logs centralizado
    adTrackerLogs.adicionarLog(LOG_TYPES.BEACON_ATTEMPT, {
      quantidade: uniqueEvents.length,
      timestamp_envio: new Date().toISOString()
    });
    
    try {
      if (typeof navigator.sendBeacon !== 'function') {
        console.error('%c[AdTracker] API sendBeacon não disponível neste navegador', 'color: red');
        
        // Registrar falha no sistema de logs centralizado
        adTrackerLogs.adicionarLog(LOG_TYPES.BEACON_FAILURE, {
          quantidade: uniqueEvents.length,
          motivo: 'api_indisponivel',
          erro: 'API sendBeacon não disponível neste navegador'
        });
        
        return false;
      }

      // Usar a API Next.js em vez da função RPC direta
      const url = `/api/inserir_eventos_anuncios_lote_otimizado`;
      
      // Para API Next.js não precisamos de parâmetros de consulta adicionais
      const fullUrl = url;
      
      // Registrar uso da API Next.js
      adTrackerLogs.adicionarLog(LOG_TYPES.API_CALL, {
        tipo: 'next_api',
        url: fullUrl,
        quantidade_eventos: uniqueEvents.length
      });
      
      // Processar valores numéricos antes de enviar
      const processedEvents = uniqueEvents.map(event => {
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
        
        return processedEvent;
      });
      
      // Otimizar o payload
      const payloadOtimizado = otimizarPayload(processedEvents);
      
      // Calcular tamanho do payload original e otimizado
      const originalBlob = new Blob([JSON.stringify(processedEvents)], { type: 'application/json' });
      const originalSize = originalBlob.size;
      
      // Criar um blob com os dados para enviar
      const blob = new Blob([JSON.stringify(payloadOtimizado)], { 
        type: 'application/json' 
      });
      
      // Calcular tamanho do payload em bytes
      const payloadSize = blob.size;
      
      // Registrar otimização de payload
      adTrackerLogs.adicionarLog(LOG_TYPES.PAYLOAD_OPTIMIZATION, {
        tamanho_original: originalSize,
        tamanho_otimizado: payloadSize,
        reducao_percentual: ((originalSize - payloadSize) / originalSize * 100).toFixed(1) + '%',
        quantidade_eventos: uniqueEvents.length
      });
      
      // Usar sendBeacon que foi projetado especificamente para este cenário
      const result = navigator.sendBeacon(fullUrl, blob);
      
      console.log(`%c[AdTracker] ${result ? 'SUCESSO' : 'FALHA'} ao enviar ${uniqueEvents.length} eventos via sendBeacon`, 
        result ? 'color: #4CAF50' : 'color: #F44336');
      
      // Registrar resultado no sistema de logs centralizado
      if (result) {
        // Novo: Marcar eventos como processados
        uniqueEvents.forEach(event => {
          if (event.event_id) {
            processedEventIds.add(event.event_id);
          }
        });
        
        // Novo: Salvar IDs processados
        saveProcessedEventIds();
        
        adTrackerLogs.adicionarLog(LOG_TYPES.BEACON_SUCCESS, {
          quantidade: uniqueEvents.length,
          tamanho_payload: payloadSize,
          tamanho_original: originalSize,
          tamanho_otimizado: true,
          timestamp_envio: new Date().toISOString()
        });
      } else {
        adTrackerLogs.adicionarLog(LOG_TYPES.BEACON_FAILURE, {
          quantidade: uniqueEvents.length,
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
        quantidade: uniqueEvents.length,
        motivo: 'excecao',
        erro: error.message,
        stack: error.stack
      });
      
      return false;
    }
  };

  // Expor a função sendEventsByBeacon no escopo global para uso no beforeunload
  window.sendEventsByBeacon = sendEventsByBeacon;
  
  // Inicializar o sistema de logs
  if (typeof adTrackerLogs.initLogs === 'function') {
    adTrackerLogs.initLogs();
  }
}

// Verificar eventos antigos no buffer
const verificarEventosAntigos = () => {
  if (eventsBuffer.length === 0) return;
  
  const agora = new Date();
  let eventosAntigos = 0;
  
  // Verificar se há eventos antigos no buffer
  eventsBuffer.forEach(evento => {
    if (evento.timestamp) {
      const timestamp = new Date(evento.timestamp);
      const idadeMs = agora - timestamp;
      
      // Se o evento estiver no buffer há mais de 5 minutos
      if (idadeMs > STALE_EVENT_THRESHOLD) {
        eventosAntigos++;
      }
    }
  });
  
  // Se houver eventos antigos, registrar e tentar enviar
  if (eventosAntigos > 0) {
    console.log(`%c[AdTracker] ${eventosAntigos} eventos antigos detectados no buffer`, 'background: #FF5722; color: white; padding: 2px 5px; border-radius: 3px');
    
    // Registrar eventos antigos
    adTrackerLogs.adicionarLog(LOG_TYPES.BUFFER_STALE, {
      quantidade: eventosAntigos,
      total_buffer: eventsBuffer.length
    });
    
    // Forçar envio do buffer para tentar resolver
    flushEventsBuffer();
  }
};

// Função para registrar um evento
const registerEvent = async (eventData) => {
  if (!eventData) return;
  
  try {
    // Novo: Gerar ID único para o evento
    const eventId = generateEventId(eventData);
    
    // Novo: Verificar se o evento já foi processado
    if (processedEventIds.has(eventId)) {
      console.log(`%c[AdTracker] Evento duplicado detectado e ignorado: ${eventId}`, 'color: #FF9800');
      
      // Registrar evento duplicado no sistema de logs
      adTrackerLogs.adicionarLog(LOG_TYPES.EVENT_DUPLICATE, {
        event_id: eventId,
        tipo_evento: eventData.tipo_evento,
        anuncio_id: eventData.anuncio_id,
        tipo_anuncio: eventData.tipo_anuncio
      });
      
      return false;
    }
    
    // Adicionar timestamp e ID ao evento
    const eventWithTimestamp = {
      ...eventData,
      event_id: eventId,
      timestamp: new Date().toISOString() // Adicionar timestamp para rastrear idade do evento
    };
    
    // Adicionar ao buffer
    eventsBuffer.push(eventWithTimestamp);
    
    // Registrar adição ao buffer
    adTrackerLogs.adicionarLog(LOG_TYPES.BUFFER_ADD, {
      tipo_evento: eventWithTimestamp.tipo_evento,
      anuncio_id: eventWithTimestamp.anuncio_id,
      tipo_anuncio: eventWithTimestamp.tipo_anuncio,
      buffer_size: eventsBuffer.length,
      event_id: eventId
    });
    
    // Se o buffer atingir o limite, enviar imediatamente
    if (eventsBuffer.length >= BUFFER_SIZE_LIMIT) {
      // Registrar overflow do buffer
      adTrackerLogs.adicionarLog(LOG_TYPES.BUFFER_OVERFLOW, {
        tamanho: eventsBuffer.length,
        limite: BUFFER_SIZE_LIMIT
      });
      
      // Limpar o timer existente
      if (bufferTimer) {
        clearTimeout(bufferTimer);
        bufferTimer = null;
      }
      
      // Enviar eventos
      flushEventsBuffer();
    } else if (!bufferTimer) {
      // Se não houver um timer ativo, criar um
      bufferTimer = setTimeout(() => {
        flushEventsBuffer();
        bufferTimer = null;
      }, BUFFER_TIMEOUT);
    }
    
    // Salvar buffer no localStorage como backup
    localStorage.setItem(BUFFER_STORAGE_KEY, JSON.stringify(eventsBuffer));
    
    return true;
  } catch (error) {
    console.error('%c[AdTracker] Erro ao registrar evento:', 'color: red', error);
    return false;
  }
};

// Função para enviar eventos armazenados no buffer
const flushEventsBuffer = async () => {
  // Se estiver navegando para fora da página, não usar esta função
  // (o beforeunload handler lidará com isso usando sendBeacon)
  if (isNavigatingAway) return;
  
  // Se não houver eventos para enviar, não fazer nada
  if (eventsBuffer.length === 0) return;
  
  // Registrar tentativa de flush
  adTrackerLogs.adicionarLog(LOG_TYPES.FLUSH_ATTEMPT, {
    quantidade: eventsBuffer.length,
    timestamp: new Date().toISOString()
  });
  
  try {
    // Novo: Filtrar eventos já processados
    const eventsToSend = eventsBuffer.filter(event => {
      return !event.event_id || !processedEventIds.has(event.event_id);
    });
    
    // Se todos os eventos já foram processados, limpar o buffer e retornar
    if (eventsToSend.length === 0) {
      console.log('%c[AdTracker] Todos os eventos já foram processados, limpando buffer', 'color: #FF9800');
      eventsBuffer = [];
      localStorage.setItem(BUFFER_STORAGE_KEY, JSON.stringify(eventsBuffer));
      return true;
    }
    
    // Fazer uma cópia dos IDs para marcar como processados em caso de sucesso
    const eventIds = eventsToSend.map(event => event.event_id).filter(Boolean);
    
    // Limpar o buffer antes de enviar para evitar duplicação
    // se o usuário interagir durante o envio
    eventsBuffer = [];
    
    // Salvar estado vazio no localStorage
    localStorage.setItem(BUFFER_STORAGE_KEY, JSON.stringify(eventsBuffer));
    
    // Otimizar o payload
    const payloadOtimizado = otimizarPayload(eventsToSend);
    
    // Calcular tamanho do payload original e otimizado
    const originalBlob = new Blob([JSON.stringify(eventsToSend)], { type: 'application/json' });
    const originalSize = originalBlob.size;
    
    const optimizedBlob = new Blob([JSON.stringify(payloadOtimizado)], { type: 'application/json' });
    const optimizedSize = optimizedBlob.size;
    
    // Registrar otimização de payload
    adTrackerLogs.adicionarLog(LOG_TYPES.PAYLOAD_OPTIMIZATION, {
      tamanho_original: originalSize,
      tamanho_otimizado: optimizedSize,
      reducao_percentual: ((originalSize - optimizedSize) / originalSize * 100).toFixed(1) + '%',
      quantidade_eventos: eventsToSend.length
    });
    
    console.log(`%c[AdTracker] Enviando ${eventsToSend.length} eventos`, 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px');
    
    // Usar a API Next.js em vez da função RPC direta
    const url = `/api/inserir_eventos_anuncios_lote_otimizado`;
    
    // Registrar uso da API Next.js
    adTrackerLogs.adicionarLog(LOG_TYPES.API_CALL, {
      tipo: 'next_api',
      url: url,
      quantidade_eventos: eventsToSend.length
    });
    
    // Enviar eventos para a API Next.js
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payloadOtimizado)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro na API: ${response.status} - ${errorData.error || 'Erro desconhecido'}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(`Falha ao processar eventos: ${result.message || 'Erro desconhecido'}`);
    }
    
    // Novo: Marcar eventos como processados
    eventIds.forEach(id => {
      if (id) processedEventIds.add(id);
    });
    
    // Novo: Salvar IDs processados
    saveProcessedEventIds();
    
    // Registrar sucesso
    adTrackerLogs.adicionarLog(LOG_TYPES.FLUSH_SUCCESS, {
      quantidade: eventsToSend.length,
      timestamp: new Date().toISOString()
    });
    
    console.log(`%c[AdTracker] ${eventsToSend.length} eventos enviados com sucesso`, 'color: #4CAF50');
    
    return true;
  } catch (error) {
    console.error('%c[AdTracker] Erro ao enviar eventos:', 'color: red', error);
    
    // Registrar falha
    adTrackerLogs.adicionarLog(LOG_TYPES.FLUSH_FAILURE, {
      quantidade: eventsBuffer.length,
      erro: error.message,
      timestamp: new Date().toISOString()
    });
    
    // Tentar recuperar eventos que não foram enviados
    // Adicionar de volta ao buffer
    try {
      // Recuperar eventos do localStorage
      const storedEvents = JSON.parse(localStorage.getItem(BUFFER_STORAGE_KEY) || '[]');
      
      // Se houver eventos armazenados, adicioná-los de volta ao buffer
      if (storedEvents.length > 0) {
        eventsBuffer = [...eventsBuffer, ...storedEvents];
        
        // Novo: Remover possíveis duplicatas por ID de evento
        const uniqueEvents = {};
        eventsBuffer.forEach(event => {
          if (event.event_id) {
            // Se o evento já tem ID, usar como chave
            uniqueEvents[event.event_id] = event;
          } else {
            // Se não tem ID, gerar um
            const id = generateEventId(event);
            event.event_id = id;
            uniqueEvents[id] = event;
          }
        });
        eventsBuffer = Object.values(uniqueEvents);
        
        // Salvar buffer atualizado
        localStorage.setItem(BUFFER_STORAGE_KEY, JSON.stringify(eventsBuffer));
      }
    } catch (recoveryError) {
      console.error('%c[AdTracker] Erro ao recuperar eventos:', 'color: red', recoveryError);
    }
    
    return false;
  }
};

// Função para recuperar eventos pendentes do localStorage
const recoverPendingEvents = () => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  
  try {
    // Registrar tentativa de recuperação
    adTrackerLogs.adicionarLog(LOG_TYPES.RECOVERY_ATTEMPT, {
      timestamp: new Date().toISOString()
    });
    
    // Recuperar eventos do localStorage
    const storedEvents = JSON.parse(localStorage.getItem(BUFFER_STORAGE_KEY) || '[]');
    
    if (storedEvents.length > 0) {
      console.log(`%c[AdTracker] Recuperando ${storedEvents.length} eventos pendentes do localStorage`, 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px');
      
      // Novo: Filtrar eventos já processados
      const uniqueEvents = storedEvents.filter(event => {
        // Se o evento já tem ID, verificar se já foi processado
        if (event.event_id && processedEventIds.has(event.event_id)) {
          return false;
        }
        // Se não tem ID, gerar um
        if (!event.event_id) {
          event.event_id = generateEventId(event);
        }
        return true;
      });
      
      // Adicionar eventos recuperados ao buffer
      eventsBuffer = [...eventsBuffer, ...uniqueEvents];
      
      // Novo: Remover possíveis duplicatas por ID de evento
      const uniqueEventsMap = {};
      eventsBuffer.forEach(event => {
        if (event.event_id) {
          uniqueEventsMap[event.event_id] = event;
        }
      });
      eventsBuffer = Object.values(uniqueEventsMap);
      
      // Registrar sucesso na recuperação
      adTrackerLogs.adicionarLog(LOG_TYPES.RECOVERY_SUCCESS, {
        quantidade_total: storedEvents.length,
        quantidade_unica: uniqueEvents.length,
        timestamp: new Date().toISOString()
      });
      
      // Limpar localStorage para evitar duplicação
      localStorage.removeItem(BUFFER_STORAGE_KEY);
      
      // Tentar enviar eventos recuperados após um pequeno delay
      // para garantir que a página esteja completamente carregada
      setTimeout(() => {
        if (eventsBuffer.length > 0) {
          flushEventsBuffer();
        }
      }, 3000);
      
      return uniqueEvents.length;
    }
    
    return 0;
  } catch (error) {
    console.error('%c[AdTracker] Erro ao recuperar eventos pendentes:', 'color: red', error);
    
    // Registrar falha na recuperação
    adTrackerLogs.adicionarLog(LOG_TYPES.RECOVERY_FAILURE, {
      erro: error.message,
      timestamp: new Date().toISOString()
    });
    
    return 0;
  }
};

// Tentar recuperar eventos pendentes quando o módulo for carregado
if (typeof window !== 'undefined') {
  // Executar após um pequeno delay para garantir que tudo esteja inicializado
  setTimeout(recoverPendingEvents, 1000);
  
  // Configurar verificação periódica de eventos antigos (a cada 2 minutos)
  setInterval(verificarEventosAntigos, 2 * 60 * 1000);
}

// Função para otimizar o payload reduzindo o tamanho dos dados
const otimizarPayload = (eventos) => {
  if (!eventos || eventos.length === 0) return { comuns: {}, eventos: [] };
  
  // Extrair dados comuns a todos os eventos
  const dadosComuns = {
    navegador: eventos[0].navegador,
    idioma: eventos[0].idioma,
    plataforma: eventos[0].plataforma
  };
  
  // Mapear eventos para formato otimizado (abreviado)
  const eventosOtimizados = eventos.map(evento => {
    return {
      a_id: evento.anuncio_id, // anuncio_id
      p_id: evento.pagina, // pagina
      t_e: evento.tipo_evento, // tipo_evento
      t_a: evento.tipo_anuncio, // tipo_anuncio
      t_exp: evento.tempo_exposto, // tempo_exposto
      ts: evento.timestamp, // timestamp
      s_id: evento.session_id, // session_id
      e_id: evento.event_id, // event_id (novo)
      disp: evento.dispositivo === 'mobile' ? 'm' : evento.dispositivo === 'desktop' ? 'd' : evento.dispositivo // dispositivo
      // Dados comuns são omitidos aqui
    };
  });
  
  return {
    comuns: dadosComuns,
    eventos: eventosOtimizados
  };
};

// Função para priorizar eventos (cliques primeiro, depois maior tempo de exposição, depois mais recentes)
const priorizarEventos = (eventos) => {
  if (!eventos || eventos.length === 0) return [];
  
  // Fazer uma cópia para não alterar o array original
  const eventosCopia = [...eventos];
  
  // Ordenar eventos por prioridade
  return eventosCopia.sort((a, b) => {
    // 1. Priorizar cliques sobre impressões
    if (a.tipo_evento === 'click' && b.tipo_evento !== 'click') return -1;
    if (a.tipo_evento !== 'click' && b.tipo_evento === 'click') return 1;
    
    // 2. Priorizar maior tempo de exposição
    if (a.tempo_exposto > b.tempo_exposto) return -1;
    if (a.tempo_exposto < b.tempo_exposto) return 1;
    
    // 3. Priorizar eventos mais recentes
    if (a.timestamp && b.timestamp) {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA; // Ordem decrescente (mais recentes primeiro)
    }
    
    return 0;
  });
};

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

// Componente principal AdTracker
const AdTracker = ({ children, anuncioId, tipoAnuncio, paginaId, preservarLayout = true }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [visibleStartTime, setVisibleStartTime] = useState(null);
  const [exposureTime, setExposureTime] = useState(0);
  const [hasRegisteredImpression, setHasRegisteredImpression] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const observerRef = useRef(null);
  const anuncioRef = useRef(null);
  const observerElementRef = useRef(null);
  const elementRef = useRef(null);
  const visibilityCheckTimerRef = useRef(null);
  const exposureTimerRef = useRef(null);
  const hasReportedRef = useRef(false);
  const componentIdRef = useRef(`ad_${anuncioId}_${Math.random().toString(36).substring(2, 9)}`);
  const actualMountTimeRef = useRef(Date.now());
  const mountTimeRef = useRef(Date.now());
  const isFirstRenderRef = useRef(true);
  const sessionId = useRef(getOrCreateSessionId());
  const [locationInfo, setLocationInfo] = useState({ pais: 'desconhecido', regiao: 'desconhecido' });
  
  // Flag para controlar qual método está controlando a visibilidade
  // Isso evitará que os dois métodos (IntersectionObserver e verificação manual) 
  // iniciem cronômetros independentes
  const visibilityControllerRef = useRef(null);
  
  // Variáveis para controle interno
  const isFixedAd = tipoAnuncio === 'fixo-inferior' || tipoAnuncio === 'fixo-superior';
  let hasReportedExposure = false;
  
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
                // Adicionar flag para evitar logs duplicados
                if (!window.adTrackerLogTimers) window.adTrackerLogTimers = {};
                const logKey = `${componentIdRef.current}_${newValue}`;
                
                if (!window.adTrackerLogTimers[logKey]) {
                  window.adTrackerLogTimers[logKey] = true;
                  console.log(`%c[AdTracker] [${componentIdRef.current}] Anúncio ${tipoAnuncio} (${anuncioId}): Tempo exposto: ${newValue}s`, 'color: #00BCD4');
                  
                  // Limpar a flag após um tempo para permitir logs futuros
                  setTimeout(() => {
                    if (window.adTrackerLogTimers[logKey]) {
                      delete window.adTrackerLogTimers[logKey];
                    }
                  }, 2000);
                }
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
      
      console.log(`%c[AdTracker] [${componentIdRef.current}] Anúncio ${tipoAnuncio} (${anuncioId}): Desmontando componente após ${componentLifetime}ms`, 'color: #F44336');
      
      // Verificar se estamos em uma navegação ou recarregamento de página
      if (isNavigatingAway) {
        console.log(`%c[AdTracker] [${componentIdRef.current}] Navegação ou recarregamento detectado, ignorando registro automático`, 'color: orange');
      }
      // Verificar se estamos em ambiente de desenvolvimento e se é uma desmontagem rápida
      // Ignorar registro de impressão em desmontagens muito rápidas (provavelmente causadas por StrictMode)
      else if (isDevelopment && componentLifetime < MIN_COMPONENT_LIFETIME) {
        console.log(`%c[AdTracker] [${componentIdRef.current}] Desmontagem rápida detectada (${componentLifetime}ms), ignorando registro automático`, 'color: orange');
      }
      // Verificar se o componente já registrou uma impressão ou se foi muito curto
      else if (!hasReportedRef.current && componentLifetime >= MIN_COMPONENT_LIFETIME) {
        // Verificar se o anúncio realmente teve alguma visibilidade verificada
        // Se nunca foi visível pelo IntersectionObserver ou verificação manual, não registrar
        if (!isVisible && !visibleStartTime && exposureTime === 0) {
          console.log(`%c[AdTracker] [${componentIdRef.current}] Anúncio ${tipoAnuncio} (${anuncioId}): Ignorando registro na desmontagem - anúncio nunca foi visível`, 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px');
        } else {
          console.log(`%c[AdTracker] [${componentIdRef.current}] Anúncio ${tipoAnuncio} (${anuncioId}): Forçando registro na desmontagem`, 'background: #E91E63; color: white; padding: 2px 5px; border-radius: 3px');
          
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
            console.log(`%c[AdTracker] [${componentIdRef.current}] Inversão na desmontagem: tela-inteira impressao -> clique`, 
              'background: #FF5722; color: white; padding: 3px 5px; border-radius: 3px');
          }
          
          registerEvent({
            anuncio_id: anuncioId,
            tipo_anuncio: tipoAnuncio,
            pagina: paginaId,
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
        console.log(`%c[AdTracker] [${componentIdRef.current}] Anúncio ${tipoAnuncio} (${anuncioId}): Componente desmontado, enviando ${eventsBuffer.length} eventos pendentes`, 'color: #9C27B0');
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
    if (!anuncioId || !tipoAnuncio) {
      console.warn(`%c[AdTracker] [${componentIdRef.current}] ERRO: Dados incompletos para configurar detecção de visibilidade`, 'color: red', {
        anuncioId, tipoAnuncio
      });
      return; // Não configurar o observer se faltar qualquer dado essencial
    }
    
    // Usar o paginaId fornecido ou cair para o pathname como fallback
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const pagina = paginaId || currentPath || '/';
    
    console.log(`%c[AdTracker] [${componentIdRef.current}] Anúncio ${tipoAnuncio} (${anuncioId}): Configurando observer em ${pagina}`, 'color: #3F51B5');
    
    // NOVA LÓGICA ESPECÍFICA PARA TELA-INTEIRA
    if (tipoAnuncio === 'tela-inteira') {
      console.log(`%c[AdTracker] [${componentIdRef.current}] Configurando detecção específica para tela-inteira via portal`, 'color: #FF9800; font-weight: bold');
      
      let telaInteiraElement = null;
      let visibilityStartTime = null;
      let impressionRegistered = false;
      let clickListener = null;
      
      const registerImpression = (timeVisible) => {
        if (impressionRegistered) return; // Evitar duplicatas
        
        console.log(`%c[AdTracker] [${componentIdRef.current}] Registrando IMPRESSÃO tela-inteira: ${timeVisible.toFixed(2)}s`, 'background: #4CAF50; color: white; padding: 3px 5px; border-radius: 3px');
        
        registerEvent({
          anuncio_id: anuncioId,
          tipo_anuncio: tipoAnuncio,
          pagina: paginaId,
          tipo_evento: 'impressao', // SEM INVERSÃO - impressão é impressão
          tempo_exposto: timeVisible,
          visivel: false,
          dispositivo: getDeviceInfo(),
          pais: locationInfo.pais,
          regiao: locationInfo.regiao,
          session_id: sessionId.current,
          timestamp: new Date().toISOString()
        });
        
        impressionRegistered = true;
      };
      
      const registerClick = () => {
        const timeToClick = visibilityStartTime ? (Date.now() - visibilityStartTime) / 1000 : 0.1;
        
        console.log(`%c[AdTracker] [${componentIdRef.current}] Registrando CLIQUE tela-inteira: ${timeToClick.toFixed(2)}s`, 'background: #E91E63; color: white; padding: 3px 5px; border-radius: 3px');
        
        registerEvent({
          anuncio_id: anuncioId,
          tipo_anuncio: tipoAnuncio,
          pagina: paginaId,
          tipo_evento: 'clique', // SEM INVERSÃO - clique é clique
          tempo_exposto: timeToClick,
          visivel: true,
          dispositivo: getDeviceInfo(),
          pais: locationInfo.pais,
          regiao: locationInfo.regiao,
          session_id: sessionId.current,
          timestamp: new Date().toISOString()
        });
      };
      
      const checkTelaInteiraVisibility = () => {
        const newElement = document.body.querySelector('.anuncio-tela-inteira');
        
        if (newElement && !telaInteiraElement) {
          // ANÚNCIO APARECEU - INICIAR IMPRESSÃO
          telaInteiraElement = newElement;
          visibilityStartTime = Date.now();
          setIsVisible(true);
          setVisibleStartTime(Date.now());
          
          console.log(`%c[AdTracker] [${componentIdRef.current}] Tela-inteira APARECEU - iniciando contagem de impressão`, 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px');
          
          // ADICIONAR LISTENER DE CLIQUE CORRETO
          clickListener = (e) => {
            // Verificar se NÃO foi clique no botão X
            if (!e.target.closest('.anuncio-tela-inteira-fechar')) {
              registerClick();
            }
          };
          
          telaInteiraElement.addEventListener('click', clickListener);
          
        } else if (!newElement && telaInteiraElement) {
          // ANÚNCIO DESAPARECEU - REGISTRAR IMPRESSÃO
          const timeVisible = visibilityStartTime ? (Date.now() - visibilityStartTime) / 1000 : 0;
          
          if (timeVisible >= 0.5) { // Mínimo de 0.5s para impressão
            registerImpression(timeVisible);
          }
          
          // Limpar listeners
          if (clickListener && telaInteiraElement) {
            telaInteiraElement.removeEventListener('click', clickListener);
            clickListener = null;
          }
          
          telaInteiraElement = null;
          visibilityStartTime = null;
          setIsVisible(false);
          setVisibleStartTime(null);
          
          console.log(`%c[AdTracker] [${componentIdRef.current}] Tela-inteira DESAPARECEU - impressão registrada`, 'background: #FF5722; color: white; padding: 2px 5px; border-radius: 3px');
        }
      };
      
      // Verificação inicial e periódica
      checkTelaInteiraVisibility();
      const timer = setInterval(checkTelaInteiraVisibility, 250);
      
      // MutationObserver para detectar mudanças no DOM
      const observer = new MutationObserver(checkTelaInteiraVisibility);
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
      
      // Cleanup
      return () => {
        clearInterval(timer);
        observer.disconnect();
        
        // Se ainda estiver visível ao desmontar, registrar impressão
        if (telaInteiraElement && visibilityStartTime) {
          const timeVisible = (Date.now() - visibilityStartTime) / 1000;
          if (timeVisible >= 0.5) {
            registerImpression(timeVisible);
          }
        }
        
        // Limpar listener se ainda existir
        if (clickListener && telaInteiraElement) {
          telaInteiraElement.removeEventListener('click', clickListener);
        }
      };
    }
    
    // LÓGICA EXISTENTE PARA TODOS OS OUTROS TIPOS
    // Verificar refs necessários apenas para outros tipos
    if (!anuncioRef.current || !observerElementRef.current) {
      console.warn(`%c[AdTracker] [${componentIdRef.current}] ERRO: Refs incompletos para configurar IntersectionObserver`, 'color: red', {
        anuncioId, tipoAnuncio, refExiste: !!anuncioRef.current, observerElementExiste: !!observerElementRef.current
      });
      return;
    }
    
    // Limpar observer anterior se existir
    if (observerRef.current && observerElementRef.current) {
      observerRef.current.unobserve(observerElementRef.current);
      observerRef.current = null;
    }
    
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
      console.log(`%c[AdTracker] [${componentIdRef.current}] Usando limiares especiais para anúncio fixo ${tipoAnuncio}`, 'color: #9C27B0');
      
      // Para anúncios fixo-inferior, considerar visível por padrão
      if (tipoAnuncio === 'fixo-inferior') {
        console.log(`%c[AdTracker] [${componentIdRef.current}] Anúncio fixo-inferior - considerando visível por padrão`, 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px');
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
                  // Adicionar flag para evitar logs duplicados
                  if (!window.adTrackerLogTimers) window.adTrackerLogTimers = {};
                  const logKey = `${componentIdRef.current}_${newValue}`;
                  
                  if (!window.adTrackerLogTimers[logKey]) {
                    window.adTrackerLogTimers[logKey] = true;
                    console.log(`%c[AdTracker] [${componentIdRef.current}] Anúncio ${tipoAnuncio} (${anuncioId}): Tempo exposto: ${newValue}s`, 'color: #00BCD4');
                    
                    // Limpar a flag após um tempo para permitir logs futuros
                    setTimeout(() => {
                      if (window.adTrackerLogTimers[logKey]) {
                        delete window.adTrackerLogTimers[logKey];
                      }
                    }, 2000);
                  }
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
      // Verificar se o componente ainda está montado
      if (!anuncioRef.current || !anuncioId || !tipoAnuncio) return;
      
      try {
        // Verificar se o elemento está visível na tela
        const element = anuncioRef.current;
        const rect = element.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        const windowWidth = window.innerWidth || document.documentElement.clientWidth;
        
        // Verificar se pelo menos 30% do elemento está visível
        const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
        const visibleWidth = Math.min(rect.right, windowWidth) - Math.max(rect.left, 0);
        const visibleArea = visibleHeight * visibleWidth;
        const totalArea = rect.height * rect.width;
        const visibilityRatio = totalArea > 0 ? visibleArea / totalArea : 0;
        
        // Considerar visível se pelo menos 30% estiver na tela
        const isElementVisible = visibilityRatio >= 0.3;
        
        // Log menos frequente para não sobrecarregar o console
        if (Math.random() < 0.1) { // Apenas 10% das verificações geram log
          console.log(`%c[AdTracker] [${componentIdRef.current}] Verificação manual: Anúncio ${tipoAnuncio} (${anuncioId}) está ${isElementVisible ? 'visível' : 'invisível'}`, 
            'color: #888');
        }
        
        // Se o IntersectionObserver já está controlando a visibilidade, não interferir
        if (visibilityControllerRef.current === 'observer') {
          return;
        }
        
        // Atualizar o controlador de visibilidade
        if (isElementVisible && !isVisible) {
          visibilityControllerRef.current = 'manual';
        }
        
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
                  // Adicionar flag para evitar logs duplicados
                  if (!window.adTrackerLogTimers) window.adTrackerLogTimers = {};
                  const logKey = `${componentIdRef.current}_${newValue}`;
                  
                  if (!window.adTrackerLogTimers[logKey]) {
                    window.adTrackerLogTimers[logKey] = true;
                    console.log(`%c[AdTracker] [${componentIdRef.current}] Anúncio ${tipoAnuncio} (${anuncioId}): Tempo exposto: ${newValue}s`, 'color: #00BCD4');
                    
                    // Limpar a flag após um tempo para permitir logs futuros
                    setTimeout(() => {
                      if (window.adTrackerLogTimers[logKey]) {
                        delete window.adTrackerLogTimers[logKey];
                      }
                    }, 2000);
                  }
                }
                
                // Verificar se atingiu o tempo mínimo para registrar
                const timeThreshold = isFixedAd ? 0.5 : MIN_VISIBLE_TIME;
                
                if (newValue >= timeThreshold && !hasReportedExposure && !hasReportedRef.current) {
                  console.log(`%c[AdTracker] [${componentIdRef.current}] Anúncio ${tipoAnuncio} (${anuncioId}): Tempo mínimo atingido (${newValue}s)`, 'background: #673AB7; color: white; padding: 2px 5px; border-radius: 3px');
                  
                  // Apenas marcar que o tempo mínimo foi atingido, mas NÃO registrar o evento agora
                  // O registro será feito apenas quando o anúncio sair da área visível ou o componente for desmontado
                  hasReportedExposure = true;
                  hasReportedRef.current = true;
                }
                
                return newValue;
              });
            }, 1000);
          }
        } else if (!isElementVisible && isVisible && visibilityControllerRef.current === 'manual') {
          setIsVisible(false);
          
          // Parar o cronômetro
          if (exposureTimerRef.current) {
            clearInterval(exposureTimerRef.current);
            exposureTimerRef.current = null;
          }
          
          // Limpar o controlador de visibilidade
          visibilityControllerRef.current = null;
          
          // Registrar o tempo visível se for suficiente
          if (visibleStartTime) {
            const timeVisible = (Date.now() - visibleStartTime) / 1000;
            const roundedTime = Math.round(timeVisible * 100) / 100;
            const minTimeThreshold = isFixedAd ? 0.3 : 0.5;
            
            if (timeVisible >= minTimeThreshold && !hasReportedExposure && !hasReportedRef.current) {
              console.log(`%c[AdTracker] [${componentIdRef.current}] Anúncio ${tipoAnuncio} (${anuncioId}): Registrando impressão manual com tempo=${roundedTime}`, 'background: #673AB7; color: white; padding: 2px 5px; border-radius: 3px');
              hasReportedExposure = true;
              hasReportedRef.current = true;
              
              // Determinar o tipo de evento com inversão para tela-inteira
              let tipoEvento = 'impressao';
              if (tipoAnuncio === 'tela-inteira') {
                tipoEvento = 'clique'; // Inverter para tela-inteira
                console.log(`%c[AdTracker] [${componentIdRef.current}] Inversão no checkVisibilityManually: tela-inteira impressao -> clique`, 
                  'background: #FF5722; color: white; padding: 3px 5px; border-radius: 3px');
              }
              
              // Usar o tempo real medido sem valores mínimos fixos
              registerEvent({
                anuncio_id: anuncioId,
                tipo_anuncio: tipoAnuncio,
                pagina: paginaId,
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
      } catch (error) {
        console.error(`%c[AdTracker] Erro na verificação manual de visibilidade:`, 'color: red', error);
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
        console.log(`%c[AdTracker] [${componentIdRef.current}] Observer: ${tipoAnuncio} (${anuncioId}) - isIntersecting: ${isNowVisible}, ratio: ${entry.intersectionRatio.toFixed(3)}`, 
          'color: #888');
        
        // Evitar atualizações redundantes ou se for uma renderização muito rápida em desenvolvimento
        if (isNowVisible === isVisible || (isDevelopment && componentLifetime < MIN_COMPONENT_LIFETIME)) {
          return;
        }
        
        // Se a verificação manual já está controlando a visibilidade, não interferir
        if (visibilityControllerRef.current === 'manual' && isNowVisible === isVisible) {
          return;
        }
        
        // Atualizar o controlador de visibilidade
        if (isNowVisible) {
          visibilityControllerRef.current = 'observer';
        }
        
        setIsVisible(isNowVisible);
        
        if (isNowVisible) {
          // Anúncio acabou de ficar visível
          const currentTime = Date.now();
          setVisibleStartTime(currentTime);
          
          // Log específico para anúncios fixos vs. outros tipos
          if (isFixedAd) {
            console.log(`%c[AdTracker] [${componentIdRef.current}] Anúncio fixo ${tipoAnuncio} (${anuncioId}): Visível (${visibilityPercentage}%)`, 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px');
          } else {
            console.log(`%c[AdTracker] [${componentIdRef.current}] Anúncio ${tipoAnuncio} (${anuncioId}): Visível (${visibilityPercentage}%)`, 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px');
          }
          
          // Iniciar o cronômetro para rastrear tempo exposto
          if (!exposureTimerRef.current) {
            exposureTimerRef.current = setInterval(() => {
              setExposureTime(prev => {
                const newValue = prev + 1;
                // Reduzir frequência de logs (apenas a cada 10 segundos)
                if (newValue % 10 === 0) {
                  // Adicionar flag para evitar logs duplicados
                  if (!window.adTrackerLogTimers) window.adTrackerLogTimers = {};
                  const logKey = `${componentIdRef.current}_${newValue}`;
                  
                  if (!window.adTrackerLogTimers[logKey]) {
                    window.adTrackerLogTimers[logKey] = true;
                    console.log(`%c[AdTracker] [${componentIdRef.current}] Anúncio ${tipoAnuncio} (${anuncioId}): Tempo exposto: ${newValue}s`, 'color: #00BCD4');
                    
                    // Limpar a flag após um tempo para permitir logs futuros
                    setTimeout(() => {
                      if (window.adTrackerLogTimers[logKey]) {
                        delete window.adTrackerLogTimers[logKey];
                      }
                    }, 2000);
                  }
                }
                
                // Verificar se atingiu o tempo mínimo para registrar
                const timeThreshold = isFixedAd ? 0.5 : MIN_VISIBLE_TIME;
                
                if (newValue >= timeThreshold && !hasReportedExposure && !hasReportedRef.current) {
                  console.log(`%c[AdTracker] [${componentIdRef.current}] Anúncio ${tipoAnuncio} (${anuncioId}): Tempo mínimo atingido (${newValue}s)`, 'background: #673AB7; color: white; padding: 2px 5px; border-radius: 3px');
                  
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
            console.log(`%c[AdTracker] [${componentIdRef.current}] Anúncio ${tipoAnuncio} (${anuncioId}): Iniciando visualização`, 'color: #8BC34A');
            setHasRegisteredImpression(true);
          }
        } else if (visibleStartTime) {
          // Anúncio acabou de ficar invisível
          const currentTime = Date.now();
          const timeVisible = (currentTime - visibleStartTime) / 1000; // em segundos
          const roundedTime = Math.round(timeVisible * 100) / 100; // Arredondar para 2 casas decimais
          
          console.log(`%c[AdTracker] [${componentIdRef.current}] Anúncio ${tipoAnuncio} (${anuncioId}): Não mais visível. Tempo exposto: ${roundedTime.toFixed(2)}s`, 'background: #FF5722; color: white; padding: 2px 5px; border-radius: 3px');
          
          // Parar o cronômetro
          if (exposureTimerRef.current) {
            clearInterval(exposureTimerRef.current);
            exposureTimerRef.current = null;
          }
          
          // Limpar o controlador de visibilidade se este método estava controlando
          if (visibilityControllerRef.current === 'observer') {
            visibilityControllerRef.current = null;
          }
          
          // Atualizar o tempo de exposição - SEMPRE ENVIAR o evento quando o anúncio sai de tela
          // independente se já enviamos um evento antes, para capturar o tempo total
          const minTimeThreshold = isFixedAd ? 0.3 : 0.5;
          
          if (timeVisible >= minTimeThreshold) {
            // Determinar o tipo de evento com inversão para tela-inteira
            let tipoEvento = 'impressao';
            if (tipoAnuncio === 'tela-inteira') {
              tipoEvento = 'clique'; // Inverter para tela-inteira
              console.log(`%c[AdTracker] [${componentIdRef.current}] Inversão no IntersectionObserver: tela-inteira impressao -> clique`, 
                'background: #FF5722; color: white; padding: 3px 5px; border-radius: 3px');
            }
            
            // Usar o tempo real medido, sem valores mínimos fixos
            console.log(`%c[AdTracker] [${componentIdRef.current}] Anúncio ${tipoAnuncio} (${anuncioId}): Registrando ${tipoEvento} com tempo real=${roundedTime.toFixed(2)}s`, 'background: #673AB7; color: white; padding: 2px 5px; border-radius: 3px');
            
            // Marcar que já enviamos pelo menos um evento
            hasReportedExposure = true;
            hasReportedRef.current = true;
            
            registerEvent({
              anuncio_id: anuncioId,
              tipo_anuncio: tipoAnuncio,
              pagina: paginaId,
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
            console.log(`%c[AdTracker] [${componentIdRef.current}] Anúncio ${tipoAnuncio} (${anuncioId}): Tempo insuficiente (${roundedTime}s < ${minTimeThreshold}s) para registrar impressão`, 'background: #FFC107; color: black; padding: 2px 5px; border-radius: 3px');
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
    
    // Para tela-inteira, o clique já é tratado na lógica específica acima
    if (tipoAnuncio === 'tela-inteira') {
      console.log(`%c[AdTracker] [${componentIdRef.current}] Clique em tela-inteira ignorado - tratado pela lógica específica`, 'color: #FF9800');
      return;
    }
    
    // Verificar se temos todos os dados necessários
    if (!anuncioId || !tipoAnuncio) {
      console.warn(`%c[AdTracker] [${componentIdRef.current}] ERRO: Tentativa de registrar clique sem dados essenciais`, 'color: red');
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
    
    // Para outros tipos de anúncios (não tela-inteira), registrar clique normalmente
    let tipoEvento = 'clique';
    
    console.log(`%c[AdTracker] [${componentIdRef.current}] Anúncio ${tipoAnuncio} (${anuncioId}): CLIQUE detectado! Registrando como ${tipoEvento}. Tempo de reação: ${tempoArredondado.toFixed(2)}s`, 'background: #E91E63; color: white; font-size: 14px; padding: 5px; border-radius: 3px');
    
    registerEvent({
      anuncio_id: anuncioId,
      tipo_anuncio: tipoAnuncio,
      pagina: paginaId,
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
  // Expor a função de diagnóstico no escopo global
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
  
  // Função para visualizar eventos pendentes no buffer
  window.verEventosAdTracker = () => {
    try {
      // Recuperar eventos do buffer atual
      const eventosAtuais = eventsBuffer.length > 0 ? eventsBuffer : [];
      
      // Recuperar eventos do localStorage
      const eventosArmazenados = JSON.parse(localStorage.getItem(BUFFER_STORAGE_KEY) || '[]');
      
      console.log('%c[AdTracker] Eventos pendentes no buffer atual:', 'background: #FF9800; color: white; padding: 3px 5px; border-radius: 3px');
      console.table(eventosAtuais);
      
      console.log('%c[AdTracker] Eventos armazenados no localStorage:', 'background: #FF9800; color: white; padding: 3px 5px; border-radius: 3px');
      console.table(eventosArmazenados);
      
      // Estatísticas básicas
      const stats = {
        eventos_buffer: eventosAtuais.length,
        eventos_localStorage: eventosArmazenados.length,
        total_eventos: eventosAtuais.length + eventosArmazenados.length,
        tipos_eventos: {}
      };
      
      // Contar tipos de eventos
      [...eventosAtuais, ...eventosArmazenados].forEach(evento => {
        const tipo = evento.tipo_evento || 'desconhecido';
        stats.tipos_eventos[tipo] = (stats.tipos_eventos[tipo] || 0) + 1;
      });
      
      console.log('%c[AdTracker] Estatísticas de eventos pendentes:', 'background: #FF9800; color: white; padding: 3px 5px; border-radius: 3px');
      console.table(stats);
      
      return {
        buffer: eventosAtuais,
        localStorage: eventosArmazenados,
        estatisticas: stats
      };
    } catch (error) {
      console.error('%c[AdTracker] Erro ao visualizar eventos pendentes:', 'color: red', error);
      return { erro: error.message };
    }
  };
  
  console.log('%c[AdTracker] Função de diagnóstico disponível: window.adTrackerDiagnostico()', 'background: #4CAF50; color: white; padding: 3px 5px; border-radius: 3px');
  console.log('%c[AdTracker] Função para visualizar eventos pendentes: window.verEventosAdTracker()', 'background: #4CAF50; color: white; padding: 3px 5px; border-radius: 3px');
}