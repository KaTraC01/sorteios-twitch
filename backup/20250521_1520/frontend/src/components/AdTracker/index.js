import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import './AdTracker.css'; // Importar o CSS caso não esteja já importado

/**
 * Componente para rastrear métricas de anúncios com IntersectionObserver
 * 
 * Props:
 * @param {string} adId - ID do anúncio a ser rastreado
 * @param {string} pageId - ID da página onde o anúncio está sendo exibido
 * @param {string} tipo - Tipo do anúncio (banner, lateral, fixo-inferior, etc)
 * @param {function} onLoad - Callback quando o anúncio carregar
 * @param {object} children - Conteúdo do anúncio
 */
const AdTracker = ({ adId, pageId, tipo, onLoad, children }) => {
  const adRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [timeVisible, setTimeVisible] = useState(0);
  const [impressionRegistered, setImpressionRegistered] = useState(false);
  const [visibleSince, setVisibleSince] = useState(null);
  const [events, setEvents] = useState([]);
  const timerRef = useRef(null);

  // Detectar informações do usuário
  const getUserInfo = () => {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      screenSize: {
        width: window.screen.width,
        height: window.screen.height
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      referrer: document.referrer || 'direto'
    };
  };

  // Detecta a origem do tráfego
  const detectTrafficSource = () => {
    const referrer = document.referrer;
    if (!referrer) return 'direto';
    
    if (referrer.includes('google') || referrer.includes('bing') || referrer.includes('yahoo')) {
      return 'organico';
    } else if (referrer.includes('facebook') || referrer.includes('twitter') || 
              referrer.includes('instagram') || referrer.includes('linkedin')) {
      return 'social';
    } else if (referrer.includes(window.location.hostname)) {
      return 'interno';
    }
    
    return 'referral';
  };

  // Configurar IntersectionObserver para detectar visibilidade
  useEffect(() => {
    const node = adRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const nowVisible = entry.isIntersecting;
        const visibility = entry.intersectionRatio;

        setIsVisible(nowVisible);

        // Se ficou visível agora
        if (!isVisible && nowVisible) {
          setVisibleSince(Date.now());
          
          // Registrar impressão se ainda não foi registrada
          if (!impressionRegistered) {
            addEvent('impressao');
            setImpressionRegistered(true);
          }
        }
        
        // Se estava visível e agora não está mais
        if (isVisible && !nowVisible && visibleSince) {
          const duration = Math.floor((Date.now() - visibleSince) / 1000); // segundos
          setTimeVisible(prev => prev + duration);
          setVisibleSince(null);
        }
      },
      {
        threshold: 0.1, // Considera visível quando pelo menos 10% do anúncio está visível
        rootMargin: '0px'
      }
    );
    
    // Verificar se o anúncio já está visível inicialmente
    // Isso é importante para anúncios que já estão na viewport quando a página carrega
    if (!impressionRegistered && !visibleSince) {
      // Verificamos com setTimeout para dar tempo do DOM renderizar completamente
      setTimeout(() => {
        // Verificar se o componente ainda existe
        if (node && document.body.contains(node)) {
          // Verificar se o elemento está visível na viewport
          const rect = node.getBoundingClientRect();
          const isInitiallyVisible = (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
          );
          
          if (isInitiallyVisible) {
            setIsVisible(true);
            setVisibleSince(Date.now());
            addEvent('impressao');
            setImpressionRegistered(true);
          }
        }
      }, 100);
    }
    
    // Iniciar rastreamento de visibilidade
    observer.observe(node);
    
    return () => {
      observer.unobserve(node);
      observer.disconnect();
    };
  }, [adRef, isVisible, impressionRegistered, visibleSince]);

  // Timer para atualizar tempo visível durante a visibilidade contínua
  useEffect(() => {
    if (isVisible && visibleSince) {
      timerRef.current = setInterval(() => {
        const duration = Math.floor((Date.now() - visibleSince) / 1000);
        setTimeVisible(duration);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    
    return () => clearInterval(timerRef.current);
  }, [isVisible, visibleSince]);

  // Enviar eventos em lote para o servidor a cada 10 segundos ou quando acumular mais de 5 eventos
  useEffect(() => {
    const interval = setInterval(async () => {
      if (events.length > 0) {
        await sendEventsToServer();
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [events]);

  // Adicionar um evento ao buffer
  const addEvent = (tipoEvento) => {
    const newEvent = {
      anuncio_id: adId,
      pagina_id: pageId,
      tipo_evento: tipoEvento,
      // O tempo de exposição deve ser 0 inicialmente para impressões
      // Eventos subsequentes de impressão terão o tempo acumulado
      tempo_exposto: timeVisible,
      // Eventos de impressão devem SEMPRE ser marcados como visíveis (true)
      // pois só registramos impressão quando o anúncio se torna visível
      visivel: tipoEvento === 'impressao' ? true : isVisible,
      origem_trafego: detectTrafficSource(),
      dispositivo_info: getUserInfo(),
      user_session_id: localStorage.getItem('userSessionId') || 
                      `session_${Math.random().toString(36).substring(2, 15)}`
    };
    
    // Guardar session ID se não existir
    if (!localStorage.getItem('userSessionId')) {
      localStorage.setItem('userSessionId', newEvent.user_session_id);
    }
    
    setEvents(prev => [...prev, newEvent]);
    
    // Enviar imediatamente se tiver muitos eventos
    if (events.length >= 4) {
      sendEventsToServer();
    }
  };

  // Enviar eventos para o servidor em lote
  const sendEventsToServer = async () => {
    if (events.length === 0) return;
    
    try {
      // Fazer cópia dos eventos atuais e limpar o buffer
      const eventsToSend = [...events];
      setEvents([]);
      
      // Enviar para o Supabase usando a função RPC
      const { data, error } = await supabase.rpc(
        'inserir_eventos_anuncios_lote',
        { eventos: eventsToSend }
      );
      
      if (error) {
        console.error('Erro ao registrar eventos de anúncio:', error);
        // Readicionar eventos que falharam ao buffer
        setEvents(prev => [...prev, ...eventsToSend]);
      }
    } catch (error) {
      console.error('Erro ao enviar eventos de anúncios:', error);
    }
  };

  // Manipular clique no anúncio
  const handleClick = () => {
    addEvent('clique');
  };

  // Limpar timers e enviar eventos restantes ao desmontar
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      
      // Calcular tempo final se ainda estiver visível
      if (isVisible && visibleSince) {
        const finalDuration = Math.floor((Date.now() - visibleSince) / 1000);
        setTimeVisible(prev => prev + finalDuration);
      }
      
      // Enviar eventos restantes
      if (events.length > 0) {
        sendEventsToServer();
      }
    };
  }, [isVisible, visibleSince, events]);

  // Estrutura recomendada para corrigir problemas de IntersectionObserver
  // Usando um contêiner externo com display:block para o ref e um contêiner interno para preservar o layout
  if (tipo === 'tela-inteira') {
    return (
      <div 
        ref={adRef}
        onClick={handleClick}
        className="adtracker adtracker-tela-inteira" 
        style={{ display: 'block', position: 'relative' }}
      >
        <div>
          {children}
        </div>
      </div>
    );
  }
  
  // Para todos os outros tipos de anúncios, usar a mesma estrutura recomendada
  return (
    <div 
      ref={adRef}
      onClick={handleClick}
      className="adtracker"
      style={{ display: 'block', position: 'relative' }}
    >
      <div style={{ display: 'contents' }}>
        {children}
      </div>
    </div>
  );
};

export default AdTracker; 