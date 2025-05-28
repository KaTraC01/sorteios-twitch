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
        // Processar valores numéricos antes de salvar
        const processedEvents = eventsBuffer.map(event => {
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
        
        // Salvar eventos pendentes no localStorage
        console.log(`Salvando ${processedEvents.length} eventos pendentes antes de fechar a página`);
        localStorage.setItem(BUFFER_STORAGE_KEY, JSON.stringify(processedEvents));
        
        // Tentar enviar com sendBeacon se disponível (mais confiável)
        if (navigator.sendBeacon) {
          // Formato correto: enviar o objeto como ele é esperado pela função RPC
          const blob = new Blob([JSON.stringify({
            eventos: processedEvents // Enviar array processado
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
          
          // Enviar a requisição via sendBeacon
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

  // Tratar tempo exposto para garantir que seja um número decimal válido
  let tempoExposto = 0;
  if (eventData.tempo_exposto !== undefined && eventData.tempo_exposto !== null) {
    // Converter para número e garantir que seja um valor válido
    tempoExposto = Number(eventData.tempo_exposto);
    if (isNaN(tempoExposto)) {
      console.warn('Valor inválido para tempo_exposto, definindo como 0');
      tempoExposto = 0;
    }
  }

  console.log('Registrando evento de anúncio:', eventData.tipo_evento, eventData.anuncio_id, 
    'tempo_exposto:', tempoExposto, typeof tempoExposto);
  
  // Mapear os dados para corresponder exatamente ao formato esperado pela tabela
  const mappedEvent = {
    anuncio_id: eventData.anuncio_id,
    tipo_anuncio: eventData.tipo_anuncio,
    pagina: eventData.pagina,
    tipo_evento: eventData.tipo_evento,
    tempo_exposto: tempoExposto, // Usar a variável tratada
    visivel: eventData.visivel !== undefined ? eventData.visivel : true, // Padrão é true agora
    dispositivo: eventData.dispositivo || getDeviceInfo(),
    pais: eventData.pais || 'Brasil',
    regiao: eventData.regiao || 'Desconhecido',
    session_id: eventData.session_id || sessionId.current,
    timestamp: new Date().toISOString()
    // processado será definido como FALSE por padrão no servidor
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
  
  // Verificar e corrigir valores numéricos antes de enviar
  const events = eventsBuffer.map(event => {
    // Criar uma cópia do evento para não modificar o original
    const processedEvent = { ...event };
    
    // Garantir que tempo_exposto seja um número válido
    if (processedEvent.tempo_exposto !== undefined) {
      try {
        // Forçar conversão para número
        const tempNumber = Number(processedEvent.tempo_exposto);
        if (isNaN(tempNumber)) {
          console.warn(`Valor inválido para tempo_exposto (${processedEvent.tempo_exposto}), definindo como 0`);
          processedEvent.tempo_exposto = 0;
        } else {
          // Arredondar para duas casas decimais e garantir que seja number
          processedEvent.tempo_exposto = Math.round(tempNumber * 100) / 100;
        }
      } catch (e) {
        console.error('Erro ao processar tempo_exposto:', e);
        processedEvent.tempo_exposto = 0;
      }
    } else {
      processedEvent.tempo_exposto = 0;
    }
    
    console.log(`Evento processado para envio:`, {
      tipo_evento: processedEvent.tipo_evento,
      anuncio_id: processedEvent.anuncio_id,
      tempo_exposto: processedEvent.tempo_exposto,
      tipo_tempo_exposto: typeof processedEvent.tempo_exposto
    });
    
    return processedEvent;
  });
  
  eventsBuffer = [];
  
  // Limpar o timer
  if (bufferTimer) {
    clearTimeout(bufferTimer);
    bufferTimer = null;
  }

  try {
    console.log('Enviando eventos para o Supabase com payload:', 
      JSON.stringify({ eventos: events }, null, 2));
    
    // IMPORTANTE: Remover qualquer chamada a metricas_anuncios que esteja causando o erro 404
    // Usar diretamente a tabela ou a função RPC
    
    // Tentar primeiro inserir diretamente na tabela eventos_anuncios
    let success = false;
    try {
      // Tentar inserção em lote direta
      const { data, error } = await supabase
        .from('eventos_anuncios')
        .insert(events);
      
      if (!error) {
        console.log('Eventos inseridos com sucesso diretamente na tabela');
        success = true;
      } else if (error.code !== '404') {
        console.warn('Erro ao inserir diretamente na tabela:', error);
        // Continuar e tentar a função RPC como fallback
      } else {
        // Erro 404 (tabela não existe), tentar função RPC
        console.warn('Tabela não encontrada, tentando função RPC');
      }
    } catch (directInsertError) {
      console.warn('Erro ao tentar inserção direta:', directInsertError);
      // Continuar e tentar a função RPC
    }
    
    // Se a inserção direta falhou, tentar a função RPC
    if (!success) {
      const { data, error } = await supabase
        .rpc('inserir_eventos_anuncios_lote', {
          eventos: events // Enviar o array diretamente, não uma string JSON
        });
        
      if (error) {
        console.error('Erro ao enviar eventos para o Supabase via RPC:', error);
        
        // Verificar se é um erro 404 (função não encontrada)
        if (error.code === '404' || error.message.includes('Not Found')) {
          console.warn('Função RPC não encontrada. Tentando inserção individual como último recurso.');
          
          // Tentar inserir diretamente na tabela como fallback (inserção individual)
          const insertPromises = events.map(event => 
            supabase.from('eventos_anuncios').insert([event])
          );
          
          // Executar todas as inserções
          const results = await Promise.allSettled(insertPromises);
          
          // Verificar resultados
          const successful = results.filter(r => r.status === 'fulfilled').length;
          console.log(`Inserção individual: ${successful}/${results.length} eventos inseridos com sucesso.`);
          
          if (successful > 0) {
            // Pelo menos alguns eventos foram inseridos com sucesso
            success = true;
          } else {
            throw new Error('Falha ao inserir eventos usando todos os métodos disponíveis');
          }
        } else {
          // Outro tipo de erro, propagar
          throw error;
        }
      } else {
        success = true;
      }
    }
    
    if (success) {
      console.log(`Sucesso! ${events.length} eventos enviados.`);
      
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
    }
    
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
  const observerRef = useRef(null); // Ref para guardar o observer
  const componentIdRef = useRef(`ad_${anuncioId}_${Math.random().toString(36).substring(2, 9)}`); // ID único para identificar instâncias
  const hasReportedRef = useRef(false); // Ref para controlar se já reportamos (persistente entre re-renders)
  
  // Efeito para recuperar eventos pendentes - executa apenas uma vez
  useEffect(() => {
    if (!initialized) {
      console.log(`AdTracker [${componentIdRef.current}]: Inicializando e verificando eventos pendentes...`);
      recoverPendingEvents();
      setInitialized(true);
    }
    
    // Limpeza ao desmontar completamente
    return () => {
      const id = componentIdRef.current;
      console.log(`AdTracker [${id}]: Desmontando componente`);
      
      // Se o componente estiver visível, registrar o tempo antes de desmontar
      // mas APENAS se ainda não enviamos um evento
      if (visibleStartTime && !hasReportedRef.current && hasRegisteredImpression) {
        const finalVisibleTime = (Date.now() - visibleStartTime) / 1000;
        
        if (finalVisibleTime > 0.5) {
          console.log(`AdTracker [${id}]: Registrando impressão final na desmontagem. Tempo: ${finalVisibleTime.toFixed(2)}s`);
          
          // Marcar que já reportamos para este anúncio
          hasReportedRef.current = true;
          
          // Registrar o evento final
          const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
          const pagina = paginaId || currentPath || '/';
          
          registerEvent({
            anuncio_id: anuncioId,
            tipo_anuncio: tipoAnuncio,
            pagina: pagina,
            tipo_evento: 'impressao',
            tempo_exposto: Math.round(finalVisibleTime * 100) / 100,
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
      if (observerRef.current && anuncioRef.current) {
        observerRef.current.unobserve(anuncioRef.current);
        observerRef.current = null;
      }
      
      // Limpar temporizador
      if (exposureTimerRef.current) {
        clearInterval(exposureTimerRef.current);
        exposureTimerRef.current = null;
      }
      
      // Verificar se há eventos para enviar
      if (eventsBuffer.length > 0) {
        console.log(`AdTracker [${id}]: Componente desmontado, enviando ${eventsBuffer.length} eventos pendentes`);
        flushEventsBuffer();
      }
    };
  }, []);
  
  // Efeito para obter localização - executa apenas uma vez
  useEffect(() => {
    const fetchLocation = async () => {
      const location = await getLocation();
      setLocationInfo(location);
    };
    
    fetchLocation();
  }, []);
  
  // Remover qualquer chamada incorreta a metricas_anuncios que possa estar causando o erro 404
  useEffect(() => {
    // Flag para identificar este componente específico
    const componentId = componentIdRef.current;
    
    // Definir flag no objeto window para evitar chamadas duplicadas
    if (typeof window !== 'undefined') {
      // Se for um anúncio de tela-inteira, verificar se temos uma propriedade de rastreamento
      if (tipoAnuncio === 'tela-inteira') {
        // Criar ou usar identificador único para este anúncio
        const anuncioKey = `ad_tracking_${anuncioId}`;
        
        // Verificar se este anúncio já foi rastreado nesta sessão
        if (!window[anuncioKey]) {
          // Marcar como rastreado
          window[anuncioKey] = true;
          console.log(`AdTracker [${componentId}]: Primeira visualização do anúncio ${anuncioId} nesta sessão`);
        } else {
          console.log(`AdTracker [${componentId}]: Anúncio ${anuncioId} já visualizado anteriormente nesta sessão`);
        }
      }
    }
  }, [anuncioId, tipoAnuncio]);
  
  // Configurar a detecção de visibilidade com IntersectionObserver
  useEffect(() => {
    const componentId = componentIdRef.current;
    
    // Verificar se temos todos os dados necessários
    if (!anuncioId || !tipoAnuncio || !anuncioRef.current) {
      console.warn(`AdTracker [${componentId}]: Dados incompletos para configurar detecção de visibilidade`, {
        anuncioId, tipoAnuncio, refExiste: !!anuncioRef.current
      });
      return; // Não configurar o observer se faltar qualquer dado essencial
    }
    
    // Limpar observer anterior se existir
    if (observerRef.current && anuncioRef.current) {
      observerRef.current.unobserve(anuncioRef.current);
      observerRef.current = null;
    }
    
    // Usar o paginaId fornecido ou cair para o pathname como fallback
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const pagina = paginaId || currentPath || '/';
    
    console.log(`AdTracker [${componentId}]: Configurando observer para anúncio ${anuncioId} (${tipoAnuncio}) em ${pagina}`);
    
    // Flag para controlar se já enviamos evento neste ciclo de vida do componente
    let hasReportedExposure = false;
    
    // Criar um novo observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const isNowVisible = entry.isIntersecting;
        const visibilityPercentage = Math.round(entry.intersectionRatio * 100);
        
        // Evitar atualizações redundantes
        if (isNowVisible === isVisible) {
          return;
        }
        
        setIsVisible(isNowVisible);
        
        if (isNowVisible) {
          // Anúncio acabou de ficar visível
          const currentTime = Date.now();
          setVisibleStartTime(currentTime);
          console.log(`AdTracker [${componentId}]: Anúncio visível (${visibilityPercentage}%)`);
          
          // Iniciar o cronômetro para rastrear tempo exposto
          if (!exposureTimerRef.current) {
            exposureTimerRef.current = setInterval(() => {
              setExposureTime(prev => {
                const newValue = prev + 1;
                // Reduzir frequência de logs (apenas a cada 10 segundos)
                if (newValue % 10 === 0) {
                  console.log(`AdTracker [${componentId}]: Tempo exposto: ${newValue}s`);
                }
                return newValue;
              });
            }, 1000);
          }
          
          // Apenas marcamos que estamos visualizando
          if (!hasRegisteredImpression) {
            console.log(`AdTracker [${componentId}]: Iniciando visualização`);
            setHasRegisteredImpression(true);
          }
        } else if (visibleStartTime) {
          // Anúncio acabou de ficar invisível
          const currentTime = Date.now();
          const timeVisible = (currentTime - visibleStartTime) / 1000; // em segundos
          const roundedTime = Math.round(timeVisible * 100) / 100; // Arredondar para 2 casas decimais
          
          console.log(`AdTracker [${componentId}]: Anúncio não visível. Tempo exposto: ${roundedTime.toFixed(2)}s`);
          
          // Parar o cronômetro
          if (exposureTimerRef.current) {
            clearInterval(exposureTimerRef.current);
            exposureTimerRef.current = null;
          }
          
          // Atualizar o tempo de exposição - APENAS se não enviamos ainda neste ciclo
          if (timeVisible > 0.5 && !hasReportedExposure) {
            console.log(`AdTracker [${componentId}]: Registrando impressão com tempo=${roundedTime}`);
            hasReportedExposure = true; // Marcar que já enviamos
            
            registerEvent({
              anuncio_id: anuncioId,
              tipo_anuncio: tipoAnuncio,
              pagina: pagina,
              tipo_evento: 'impressao',
              tempo_exposto: roundedTime, // Enviar o valor com precisão decimal
              visivel: true, // Modificado: TRUE indica que o anúncio foi visualizado
              dispositivo: getDeviceInfo(),
              pais: locationInfo.pais,
              regiao: locationInfo.regiao,
              session_id: sessionId.current,
              timestamp: new Date().toISOString()
            });
          }
          
          setVisibleStartTime(null);
          setExposureTime(0); // Resetar contador
        }
      },
      {
        threshold: 0.5, // Consideramos visível quando 50% do anúncio está na tela
        rootMargin: '0px'
      }
    );
    
    // Observar o elemento
    observerRef.current.observe(anuncioRef.current);
    
    // Função de limpeza
    return () => {
      // Este cleanup só ocorre quando as dependências mudam, não no desmonte final
      if (exposureTimerRef.current) {
        clearInterval(exposureTimerRef.current);
        exposureTimerRef.current = null;
      }
      
      if (observerRef.current && anuncioRef.current) {
        observerRef.current.unobserve(anuncioRef.current);
        observerRef.current = null;
        
        // Se o componente for reinicializado enquanto estiver visível, registrar o tempo de exposição
        // mas APENAS se não registramos já
        if (visibleStartTime && !hasReportedExposure) {
          const finalTimeVisible = (Date.now() - visibleStartTime) / 1000;
          const roundedFinalTime = Math.round(finalTimeVisible * 100) / 100;
          
          // Evitar duplicações: Registrar apenas se o tempo for significativo
          if (finalTimeVisible > 0.5 && hasRegisteredImpression) {
            console.log(`AdTracker [${componentId}]: Finalizando componente enquanto visível. Tempo: ${roundedFinalTime.toFixed(2)}s`);
            
            // Marcar que já enviamos para evitar envios duplicados
            hasReportedExposure = true;
            
            registerEvent({
              anuncio_id: anuncioId,
              tipo_anuncio: tipoAnuncio,
              pagina: pagina,
              tipo_evento: 'impressao',
              tempo_exposto: roundedFinalTime,
              visivel: true, // Modificado: TRUE indica que o anúncio foi visualizado
              dispositivo: getDeviceInfo(),
              pais: locationInfo.pais,
              regiao: locationInfo.regiao,
              session_id: sessionId.current,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    };
  }, [anuncioId, tipoAnuncio, paginaId, hasRegisteredImpression, locationInfo, isVisible]);
  
  // Registrar clique quando o usuário clicar no anúncio
  const handleClick = () => {
    const componentId = componentIdRef.current;
    
    // Verificar se temos todos os dados necessários
    if (!anuncioId || !tipoAnuncio) {
      console.warn(`AdTracker [${componentId}]: Tentativa de registrar clique sem dados essenciais`);
      return; // Não registrar o clique se faltar qualquer dado essencial
    }
    
    // Usar o paginaId fornecido ou cair para o pathname como fallback
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const pagina = paginaId || currentPath || '/';
    
    // Calcular o tempo atual de exposição se o anúncio estiver visível
    let tempoAtual = exposureTime;
    if (visibleStartTime) {
      const tempoVisivel = (Date.now() - visibleStartTime) / 1000;
      tempoAtual = Math.round(tempoVisivel * 100) / 100;
    }
    
    console.log(`AdTracker [${componentId}]: Clique detectado. Tempo exposto: ${tempoAtual.toFixed(2)}s`);
    
    registerEvent({
      anuncio_id: anuncioId,
      tipo_anuncio: tipoAnuncio,
      pagina: pagina,
      tipo_evento: 'clique',
      tempo_exposto: tempoAtual,
      visivel: true, // Modificado: TRUE para eventos de clique também
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