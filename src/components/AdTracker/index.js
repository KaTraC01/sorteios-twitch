import React, { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import './AdTracker.css';

// Buffer para armazenar eventos antes de enviar para o servidor
let eventsBuffer = [];
let bufferTimer = null;
const BUFFER_TIMEOUT = 10000; // 10 segundos
const BUFFER_SIZE_LIMIT = 5; // Enviar após 5 eventos

// Obter o cliente Supabase
const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(supabaseUrl, supabaseAnonKey);
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

// Função para obter a localização do usuário
const getLocation = async () => {
  try {
    const response = await fetch('https://ip-api.com/json/?fields=country,regionName');
    const data = await response.json();
    return {
      pais: data.country || 'desconhecido',
      regiao: data.regionName || 'desconhecido'
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
  // Adicionar o evento ao buffer
  eventsBuffer.push(eventData);
  
  // Se atingimos o limite de tamanho do buffer, enviar imediatamente
  if (eventsBuffer.length >= BUFFER_SIZE_LIMIT) {
    await flushEventsBuffer();
  }
  
  // Se não houver um timer em execução, iniciar um novo
  if (!bufferTimer) {
    bufferTimer = setTimeout(flushEventsBuffer, BUFFER_TIMEOUT);
  }
};

// Função para enviar eventos em lote para o servidor
const flushEventsBuffer = async () => {
  if (eventsBuffer.length === 0) return;
  
  const events = [...eventsBuffer];
  eventsBuffer = [];
  
  // Limpar o timer
  if (bufferTimer) {
    clearTimeout(bufferTimer);
    bufferTimer = null;
  }

  try {
    const supabase = getSupabaseClient();
    
    await supabase
      .rpc('inserir_eventos_anuncios_lote', {
        eventos: JSON.stringify(events)
      });
      
    // console.log(`Enviados ${events.length} eventos de anúncios`);
  } catch (error) {
    console.error('Erro ao enviar eventos:', error);
    // Adicionar de volta ao buffer em caso de falha
    eventsBuffer = [...eventsBuffer, ...events];
    
    // Tentar novamente em 30 segundos
    if (!bufferTimer) {
      bufferTimer = setTimeout(flushEventsBuffer, 30000);
    }
  }
};

// Componente principal AdTracker
const AdTracker = ({ children, anuncioId, tipoAnuncio, preservarLayout = true }) => {
  const anuncioRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [visibleStartTime, setVisibleStartTime] = useState(null);
  const [locationInfo, setLocationInfo] = useState({ pais: 'desconhecido', regiao: 'desconhecido' });
  const [hasRegisteredImpression, setHasRegisteredImpression] = useState(false);
  const [exposureTime, setExposureTime] = useState(0);
  const exposureTimerRef = useRef(null);
  const sessionId = useRef(getOrCreateSessionId());
  
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
    if (!anuncioRef.current) return;
    
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const pagina = currentPath || '/';
    
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsVisible(entry.isIntersecting);
        
        if (entry.isIntersecting) {
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
        flushEventsBuffer();
      }
    };
  }, [anuncioId, tipoAnuncio, hasRegisteredImpression, locationInfo, visibleStartTime]);
  
  // Registrar clique quando o usuário clicar no anúncio
  const handleClick = () => {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const pagina = currentPath || '/';
    
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
    >
      {children}
    </div>
  );
};

export default AdTracker; 