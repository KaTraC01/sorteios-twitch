import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import './AdTracker.css';

// Buffer para armazenar eventos antes de enviar para o servidor
let eventsBuffer = [];
let bufferTimer = null;
const BUFFER_TIMEOUT = 10000; // 10 segundos
const BUFFER_SIZE_LIMIT = 5; // Enviar após 5 eventos
const BUFFER_STORAGE_KEY = 'pending_ad_events'; // Chave para localStorage

// Adicionar listener para quando a página for fechada
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (eventsBuffer.length > 0) {
      try {
        // Salvar eventos pendentes no localStorage
        console.log(`Salvando ${eventsBuffer.length} eventos pendentes antes de fechar a página`);
        localStorage.setItem(BUFFER_STORAGE_KEY, JSON.stringify(eventsBuffer));
        
        // Tentar enviar com sendBeacon se disponível (mais confiável)
        if (navigator.sendBeacon) {
          // Formato correto: enviar o objeto como ele é esperado pela função RPC
          const blob = new Blob([JSON.stringify({
            eventos: eventsBuffer // Enviar array diretamente, sem stringify adicional
          })], {
            type: 'application/json'
          });
          
          // Obter a URL correta para a API do Supabase
          const url = `${supabase.supabaseUrl}/rest/v1/rpc/inserir_eventos_anuncios_lote`;
          
          // Criar um objeto URLSearchParams para os parâmetros de consulta
          const params = new URLSearchParams();
          
          // Adicionar a chave de API anônima como parâmetro de consulta
          params.append('apikey', supabase.supabaseKey);
          
          // URL completa com parâmetros de consulta
          const fullUrl = `${url}?${params.toString()}`;
          
          // Como sendBeacon não permite definir cabeçalhos, não podemos adicionar 
          // o cabeçalho Authorization. No entanto, o apikey como parâmetro 
          // de consulta deve ser suficiente para autenticação anônima.
          const enviado = navigator.sendBeacon(fullUrl, blob);
          console.log('Eventos enviados via sendBeacon:', enviado);
        }
      } catch (e) {
        console.error('Erro ao salvar eventos pendentes:', e);
      }
    }
  });
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
    console.warn('Tentativa de registrar evento sem dados essenciais:', 
      !eventData.anuncio_id ? 'anuncio_id ausente' : 
      !eventData.tipo_anuncio ? 'tipo_anuncio ausente' : 
      'pagina ausente');
    return; // Não registrar o evento se algum dado essencial estiver faltando
  }

  console.log('Registrando evento de anúncio:', eventData.tipo_evento, eventData.anuncio_id);
  
  // Mapear os dados para corresponder exatamente ao formato esperado pela tabela
  const mappedEvent = {
    anuncio_id: eventData.anuncio_id,
    pagina_id: eventData.pagina,  // usar o valor da pagina como pagina_id
    tipo_evento: eventData.tipo_evento,
    tempo_exposto: eventData.tempo_exposto || 0,
    visivel: eventData.visivel !== undefined ? eventData.visivel : true,
    origem_trafego: eventData.origem_trafego || null,
    geolocalizacao: eventData.pais || 'Brasil',  // Usar país como geolocalização
    dispositivo_info: {
      tipo: eventData.dispositivo || 'desconhecido',
      regiao: eventData.regiao || 'Desconhecido'
    },
    user_session_id: eventData.session_id || 'desconhecido'
  };
  
  // Adicionar o evento ao buffer
  eventsBuffer.push(mappedEvent);
  
  // Se atingimos o limite de tamanho do buffer, enviar imediatamente
  if (eventsBuffer.length >= BUFFER_SIZE_LIMIT) {
    console.log(`Buffer atingiu limite de ${BUFFER_SIZE_LIMIT} eventos. Enviando...`);
    await flushEventsBuffer();
  }
  
  // Se não houver um timer em execução, iniciar um novo
  if (!bufferTimer) {
    bufferTimer = setTimeout(flushEventsBuffer, BUFFER_TIMEOUT);
    console.log(`Timer de envio configurado para ${BUFFER_TIMEOUT}ms`);
  }
};

// Função para enviar eventos em lote para o servidor
const flushEventsBuffer = async () => {
  if (eventsBuffer.length === 0) {
    console.log('Buffer vazio, nada para enviar.');
    return false;
  }
  
  console.log(`Preparando para enviar ${eventsBuffer.length} eventos do buffer...`);
  
  const events = [...eventsBuffer];
  eventsBuffer = [];
  
  // Limpar o timer
  if (bufferTimer) {
    clearTimeout(bufferTimer);
    bufferTimer = null;
  }

  try {
    console.log('Enviando eventos para o Supabase:', events);
    
    // IMPORTANTE: A função RPC espera receber um array JSON, não uma string JSON
    const { data, error } = await supabase
      .rpc('inserir_eventos_anuncios_lote', {
        eventos: events // Enviar o array diretamente, não uma string JSON
      });
      
    if (error) {
      throw error;
    }
    
    console.log(`Sucesso! ${events.length} eventos enviados.`, data);
    
    // Remover eventos do localStorage se eles existirem lá
    try {
      const pendingEvents = JSON.parse(localStorage.getItem(BUFFER_STORAGE_KEY) || '[]');
      if (pendingEvents.length > 0) {
        localStorage.setItem(BUFFER_STORAGE_KEY, JSON.stringify([]));
      }
    } catch (e) {
      console.error('Erro ao limpar eventos pendentes:', e);
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao enviar eventos para o Supabase:', error);
    
    // Adicionar de volta ao buffer em caso de falha
    eventsBuffer = [...eventsBuffer, ...events];
    
    // Salvar no localStorage como backup
    try {
      localStorage.setItem(BUFFER_STORAGE_KEY, JSON.stringify(eventsBuffer));
      console.log(`${eventsBuffer.length} eventos salvos no localStorage para recuperação posterior`);
    } catch (storageError) {
      console.error('Erro ao salvar eventos no localStorage:', storageError);
    }
    
    // Tentar novamente em 30 segundos
    if (!bufferTimer) {
      console.log('Agendando nova tentativa em 30 segundos...');
      bufferTimer = setTimeout(flushEventsBuffer, 30000);
    }
    
    return false;
  }
};

// Função para recuperar eventos pendentes do localStorage
const recoverPendingEvents = () => {
  if (typeof window === 'undefined') return;
  
  try {
    const pendingEventsString = localStorage.getItem(BUFFER_STORAGE_KEY);
    if (!pendingEventsString) return;
    
    const pendingEvents = JSON.parse(pendingEventsString);
    if (Array.isArray(pendingEvents) && pendingEvents.length > 0) {
      console.log(`Recuperados ${pendingEvents.length} eventos pendentes do localStorage`);
      eventsBuffer = [...eventsBuffer, ...pendingEvents];
      
      // Tentar enviar imediatamente
      flushEventsBuffer();
    }
  } catch (error) {
    console.error('Erro ao recuperar eventos pendentes do localStorage:', error);
    // Limpar o item para evitar erros futuros
    localStorage.removeItem(BUFFER_STORAGE_KEY);
  }
};

// Componente principal AdTracker
const AdTracker = ({ children, anuncioId, tipoAnuncio, paginaId, preservarLayout = true }) => {
  const anuncioRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [visibleStartTime, setVisibleStartTime] = useState(null);
  const [locationInfo, setLocationInfo] = useState({ pais: 'desconhecido', regiao: 'desconhecido' });
  const [hasRegisteredImpression, setHasRegisteredImpression] = useState(false);
  const [exposureTime, setExposureTime] = useState(0);
  const exposureTimerRef = useRef(null);
  const sessionId = useRef(getOrCreateSessionId());
  const [initialized, setInitialized] = useState(false);
  
  // Efeito para recuperar eventos pendentes
  useEffect(() => {
    if (!initialized) {
      console.log('Inicializando AdTracker e verificando eventos pendentes...');
      recoverPendingEvents();
      setInitialized(true);
    }
  }, [initialized]);
  
  // Efeito para obter localização
  useEffect(() => {
    const fetchLocation = async () => {
      const location = await getLocation();
      setLocationInfo(location);
    };
    
    fetchLocation();
  }, []);
  
  // Configurar a detecção de visibilidade com IntersectionObserver
  useEffect(() => {
    // Verificar se temos todos os dados necessários
    if (!anuncioId || !tipoAnuncio || !anuncioRef.current) {
      console.warn('AdTracker: Não foi possível configurar a detecção de visibilidade - dados incompletos', {
        anuncioId, tipoAnuncio, refExiste: !!anuncioRef.current
      });
      return; // Não configurar o observer se faltar qualquer dado essencial
    }
    
    // Usar o paginaId fornecido ou cair para o pathname como fallback
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const pagina = paginaId || currentPath || '/';
    
    // Verificar se a página é válida
    if (pagina === '/' && !paginaId) {
      console.warn('AdTracker: usando página padrão "/"');
    }
    
    console.log(`AdTracker: Configurando IntersectionObserver para anúncio ${anuncioId} do tipo ${tipoAnuncio} na página ${pagina}`);
    
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const isNowVisible = entry.isIntersecting;
        
        console.log(`AdTracker: Anúncio ${anuncioId} ${isNowVisible ? 'visível' : 'invisível'} (${Math.round(entry.intersectionRatio * 100)}%)`);
        setIsVisible(isNowVisible);
        
        if (isNowVisible) {
          // Anúncio acabou de ficar visível
          setVisibleStartTime(Date.now());
          
          // Iniciar o cronômetro para rastrear tempo exposto
          if (!exposureTimerRef.current) {
            exposureTimerRef.current = setInterval(() => {
              setExposureTime(prev => prev + 1);
            }, 1000);
          }
          
          // Registrar impressão apenas uma vez
          if (!hasRegisteredImpression) {
            registerEvent({
              anuncio_id: anuncioId,
              tipo_anuncio: tipoAnuncio,
              pagina,
              tipo_evento: 'impressao',
              tempo_exposto: 0,
              visivel: true,
              dispositivo: getDeviceInfo(),
              pais: locationInfo.pais,
              regiao: locationInfo.regiao,
              session_id: sessionId.current,
              timestamp: new Date().toISOString()
            });
            
            setHasRegisteredImpression(true);
          }
        } else if (visibleStartTime) {
          // Anúncio acabou de ficar invisível
          const timeVisible = (Date.now() - visibleStartTime) / 1000; // em segundos
          
          // Parar o cronômetro
          if (exposureTimerRef.current) {
            clearInterval(exposureTimerRef.current);
            exposureTimerRef.current = null;
          }
          
          // Atualizar o tempo de exposição
          if (timeVisible > 1) { // Apenas registrar se ficou visível por mais de 1 segundo
            console.log(`AdTracker: Anúncio ${anuncioId} ficou visível por ${timeVisible.toFixed(1)} segundos`);
            
            registerEvent({
              anuncio_id: anuncioId,
              tipo_anuncio: tipoAnuncio,
              pagina,
              tipo_evento: 'impressao',
              tempo_exposto: Math.round(timeVisible),
              visivel: false,
              dispositivo: getDeviceInfo(),
              pais: locationInfo.pais,
              regiao: locationInfo.regiao,
              session_id: sessionId.current,
              timestamp: new Date().toISOString()
            });
          }
          
          setVisibleStartTime(null);
        }
      },
      {
        threshold: 0.5, // Consideramos visível quando 50% do anúncio está na tela
        rootMargin: '0px'
      }
    );
    
    observer.observe(anuncioRef.current);
    
    return () => {
      if (exposureTimerRef.current) {
        clearInterval(exposureTimerRef.current);
      }
      
      if (anuncioRef.current) {
        observer.unobserve(anuncioRef.current);
      }
      
      // Força o envio de eventos restantes quando o componente é desmontado
      if (eventsBuffer.length > 0) {
        console.log(`AdTracker: Componente desmontado, enviando ${eventsBuffer.length} eventos pendentes`);
        flushEventsBuffer();
      }
    };
  }, [anuncioId, tipoAnuncio, paginaId, hasRegisteredImpression, locationInfo, visibleStartTime]);
  
  // Registrar clique quando o usuário clicar no anúncio
  const handleClick = () => {
    // Verificar se temos todos os dados necessários
    if (!anuncioId || !tipoAnuncio) {
      console.warn('AdTracker: tentativa de registrar clique sem dados essenciais');
      return; // Não registrar o clique se faltar qualquer dado essencial
    }
    
    // Usar o paginaId fornecido ou cair para o pathname como fallback
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const pagina = paginaId || currentPath || '/';
    
    console.log(`AdTracker: Clique detectado no anúncio ${anuncioId}`);
    
    registerEvent({
      anuncio_id: anuncioId,
      tipo_anuncio: tipoAnuncio,
      pagina,
      tipo_evento: 'clique',
      tempo_exposto: exposureTime,
      visivel: isVisible,
      dispositivo: getDeviceInfo(),
      pais: locationInfo.pais,
      regiao: locationInfo.regiao,
      session_id: sessionId.current,
      timestamp: new Date().toISOString()
    });
  };
  
  // Estilo para não afetar o layout quando preservarLayout=true
  const trackerStyle = preservarLayout ? {
    display: 'contents',
    width: 'auto',
    height: 'auto'
  } : {};
  
  // Renderizar o componente com o envoltório para rastreamento
  return (
    <div 
      className="ad-tracker-container" 
      ref={anuncioRef} 
      onClick={handleClick}
      style={trackerStyle}
      data-ad-id={anuncioId}
      data-ad-type={tipoAnuncio}
      data-page-id={paginaId}
    >
      {children}
    </div>
  );
};

export default AdTracker; 