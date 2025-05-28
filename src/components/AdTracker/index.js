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
    console.warn('%c[AdTracker] ERRO: Tentativa de registrar evento sem dados essenciais:', 'color: red; font-weight: bold', 
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
      console.warn('%c[AdTracker] AVISO: Valor inválido para tempo_exposto, definindo como 0', 'color: orange');
      tempoExposto = 0;
    }
  }

  console.log(`%c[AdTracker] Registrando evento: ${eventData.tipo_evento} para ${eventData.tipo_anuncio} (${eventData.anuncio_id})`, 
    'background: #2196F3; color: white; padding: 3px 5px; border-radius: 3px');
  console.log(`%c[AdTracker] tempo_exposto: ${tempoExposto}s, tipo: ${typeof tempoExposto}`, 'color: #03A9F4');
  
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
  console.log(`%c[AdTracker] Evento adicionado ao buffer. Total de eventos pendentes: ${eventsBuffer.length}`, 'color: #8BC34A');
  
  // Se atingimos o limite de tamanho do buffer, enviar imediatamente
  if (eventsBuffer.length >= BUFFER_SIZE_LIMIT) {
    console.log(`%c[AdTracker] Buffer atingiu limite de ${BUFFER_SIZE_LIMIT} eventos. Enviando...`, 'background: #FF9800; color: black; padding: 2px 5px; border-radius: 3px');
    await flushEventsBuffer();
  }
  
  // Se não houver um timer em execução, iniciar um novo
  if (!bufferTimer) {
    bufferTimer = setTimeout(flushEventsBuffer, BUFFER_TIMEOUT);
    console.log(`%c[AdTracker] Timer de envio configurado para ${BUFFER_TIMEOUT/1000}s`, 'color: #9C27B0');
  }
};

// Função para enviar eventos em lote para o servidor
const flushEventsBuffer = async () => {
  if (eventsBuffer.length === 0) {
    console.log('%c[AdTracker] Buffer vazio, nada para enviar.', 'color: #9E9E9E');
    return false;
  }
  
  console.log(`%c[AdTracker] Preparando para enviar ${eventsBuffer.length} eventos do buffer...`, 'background: #673AB7; color: white; padding: 2px 5px; border-radius: 3px');
  
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
    
    console.log(`%c[AdTracker] Evento processado: ${processedEvent.tipo_anuncio} (${processedEvent.anuncio_id}) - ${processedEvent.tipo_evento}`, 'color: #4CAF50', {
      tempo_exposto: processedEvent.tempo_exposto,
      tipo_tempo_exposto: typeof processedEvent.tempo_exposto,
      pagina: processedEvent.pagina
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
    console.log('%c[AdTracker] Enviando eventos para o Supabase...', 'background: #0288D1; color: white; padding: 3px 5px; border-radius: 3px');
    console.log('%c[AdTracker] Payload:', 'color: #0288D1', JSON.stringify({ eventos: events }, null, 2));
    
    // IMPORTANTE: Remover qualquer chamada a metricas_anuncios que esteja causando o erro 404
    // Usar diretamente a tabela ou a função RPC
    
    // Tentar primeiro inserir diretamente na tabela eventos_anuncios
    let success = false;
    try {
      // Tentar inserção em lote direta
      console.log('%c[AdTracker] Tentando inserção direta na tabela eventos_anuncios...', 'color: #00BCD4');
      const { data, error } = await supabase
        .from('eventos_anuncios')
        .insert(events);
      
      if (!error) {
        console.log('%c[AdTracker] SUCESSO! Eventos inseridos diretamente na tabela', 'background: #4CAF50; color: white; padding: 3px 5px; border-radius: 3px');
        success = true;
      } else if (error.code !== '404') {
        console.warn('%c[AdTracker] AVISO: Erro ao inserir diretamente na tabela:', 'color: orange', error);
        // Continuar e tentar a função RPC como fallback
      } else {
        // Erro 404 (tabela não existe), tentar função RPC
        console.warn('%c[AdTracker] AVISO: Tabela não encontrada, tentando função RPC...', 'color: orange');
      }
    } catch (directInsertError) {
      console.warn('%c[AdTracker] AVISO: Erro ao tentar inserção direta:', 'color: orange', directInsertError);
      // Continuar e tentar a função RPC
    }
    
    // Se a inserção direta falhou, tentar a função RPC
    if (!success) {
      console.log('%c[AdTracker] Tentando inserção via RPC (inserir_eventos_anuncios_lote)...', 'color: #00BCD4');
      const { data, error } = await supabase
        .rpc('inserir_eventos_anuncios_lote', {
          eventos: events // Enviar o array diretamente, não uma string JSON
        });
        
      if (error) {
        console.error('%c[AdTracker] ERRO ao enviar eventos via RPC:', 'color: red', error);
        
        // Verificar se é um erro 404 (função não encontrada)
        if (error.code === '404' || error.message.includes('Not Found')) {
          console.warn('%c[AdTracker] AVISO: Função RPC não encontrada. Tentando inserção individual como último recurso...', 'color: orange');
          
          // Tentar inserir diretamente na tabela como fallback (inserção individual)
          const insertPromises = events.map(event => 
            supabase.from('eventos_anuncios').insert([event])
          );
          
          // Executar todas as inserções
          const results = await Promise.allSettled(insertPromises);
          
          // Verificar resultados
          const successful = results.filter(r => r.status === 'fulfilled').length;
          console.log(`%c[AdTracker] Inserção individual: ${successful}/${results.length} eventos inseridos com sucesso.`, 
            successful > 0 ? 'background: #4CAF50; color: white;' : 'background: #F44336; color: white;', 
            'padding: 3px 5px; border-radius: 3px');
          
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
        console.log('%c[AdTracker] SUCESSO! Eventos inseridos via RPC', 'background: #4CAF50; color: white; padding: 3px 5px; border-radius: 3px');
        success = true;
      }
    }
    
    if (success) {
      console.log(`%c[AdTracker] ✅ CONCLUÍDO: ${events.length} eventos enviados com sucesso!`, 
        'background: #388E3C; color: white; font-weight: bold; padding: 5px; border-radius: 3px; font-size: 14px');
      
      // Remover eventos do localStorage se eles existirem lá
      try {
        const pendingEvents = JSON.parse(localStorage.getItem(BUFFER_STORAGE_KEY) || '[]');
        if (pendingEvents.length > 0) {
          localStorage.setItem(BUFFER_STORAGE_KEY, JSON.stringify([]));
          console.log('%c[AdTracker] Eventos pendentes removidos do localStorage', 'color: #8BC34A');
        }
      } catch (e) {
        console.error('%c[AdTracker] ERRO ao limpar eventos pendentes:', 'color: red', e);
      }
      
      return true;
    }
    
  } catch (error) {
    console.error('%c[AdTracker] ERRO CRÍTICO ao enviar eventos para o Supabase:', 'background: #F44336; color: white; padding: 3px 5px; border-radius: 3px', error);
    
    // Adicionar de volta ao buffer em caso de falha
    eventsBuffer = [...eventsBuffer, ...events];
    
    // Salvar no localStorage como backup
    try {
      localStorage.setItem(BUFFER_STORAGE_KEY, JSON.stringify(eventsBuffer));
      console.log(`%c[AdTracker] ${eventsBuffer.length} eventos salvos no localStorage para recuperação posterior`, 'color: #FF9800');
    } catch (storageError) {
      console.error('%c[AdTracker] ERRO ao salvar eventos no localStorage:', 'color: red', storageError);
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
  
  try {
    const pendingEventsString = localStorage.getItem(BUFFER_STORAGE_KEY);
    if (!pendingEventsString) {
      console.log('%c[AdTracker] Nenhum evento pendente encontrado no localStorage', 'color: #9E9E9E');
      return;
    }
    
    const pendingEvents = JSON.parse(pendingEventsString);
    if (Array.isArray(pendingEvents) && pendingEvents.length > 0) {
      console.log(`%c[AdTracker] ♻️ Recuperados ${pendingEvents.length} eventos pendentes do localStorage`, 'background: #009688; color: white; padding: 3px 5px; border-radius: 3px');
      
      // Mostrar resumo dos tipos de anúncios recuperados
      const tiposAnuncios = {};
      pendingEvents.forEach(evento => {
        const tipo = evento.tipo_anuncio || 'desconhecido';
        tiposAnuncios[tipo] = (tiposAnuncios[tipo] || 0) + 1;
      });
      
      console.log('%c[AdTracker] Resumo dos tipos de anúncios recuperados:', 'color: #009688');
      console.table(tiposAnuncios);
      
      eventsBuffer = [...eventsBuffer, ...pendingEvents];
      
      // Tentar enviar imediatamente
      console.log('%c[AdTracker] Tentando enviar eventos recuperados imediatamente...', 'color: #00BCD4');
      flushEventsBuffer();
    } else {
      console.log('%c[AdTracker] Nenhum evento pendente válido encontrado no localStorage', 'color: #9E9E9E');
    }
  } catch (error) {
    console.error('%c[AdTracker] ERRO ao recuperar eventos pendentes do localStorage:', 'background: #F44336; color: white; padding: 3px 5px; border-radius: 3px', error);
    // Limpar o item para evitar erros futuros
    localStorage.removeItem(BUFFER_STORAGE_KEY);
    console.log('%c[AdTracker] Item de armazenamento de eventos pendentes foi removido para evitar futuros erros', 'color: #FF9800');
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
  const mountTimeRef = useRef(Date.now()); // Ref para armazenar o momento em que o componente foi montado
  
  // Log inicial com informações completas sobre o anúncio
  useEffect(() => {
    console.log(`%c[AdTracker] Inicializando [${componentIdRef.current}]`, 'background: #222; color: #bada55');
    console.log(`%c[AdTracker] Detalhes do anúncio:`, 'color: #2196F3');
    console.table({
      anuncio_id: anuncioId,
      tipo_anuncio: tipoAnuncio,
      pagina: paginaId,
      preservar_layout: preservarLayout,
      component_id: componentIdRef.current,
      session_id: sessionId.current
    });
  }, [anuncioId, tipoAnuncio, paginaId, preservarLayout]);
  
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
      
      // Configurar um timeout para forçar o registro de impressão após 2 segundos
      // para tipos específicos de anúncios que podem ter problemas de visibilidade
      const forceTrackingTypes = ['lateral', 'fixo-superior', 'fixo-inferior', 'banner', 'video', 'quadrado'];
      if (forceTrackingTypes.includes(tipoAnuncio)) {
        setTimeout(() => {
          // Se ainda não registramos uma impressão, forçar um registro mínimo
          if (!hasReportedRef.current) {
            console.log(`%c[AdTracker] [${componentIdRef.current}] Anúncio ${tipoAnuncio} (${anuncioId}): Forçando registro de impressão após 2s`, 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px');
            
            // Marcar que já reportamos para este anúncio
            hasReportedRef.current = true;
            
            // Registrar o evento com tempo mínimo
            const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
            const pagina = paginaId || currentPath || '/';
            
            registerEvent({
              anuncio_id: anuncioId,
              tipo_anuncio: tipoAnuncio,
              pagina: pagina,
              tipo_evento: 'impressao',
              tempo_exposto: 1.0, // Tempo padrão de 1 segundo para garantir registro
              visivel: true,
              dispositivo: getDeviceInfo(),
              pais: locationInfo.pais,
              regiao: locationInfo.regiao,
              session_id: sessionId.current,
              timestamp: new Date().toISOString()
            });
          }
        }, 2000);
      }
    }
    
    // Limpeza ao desmontar completamente
    return () => {
      const id = componentIdRef.current;
      console.log(`%c[AdTracker] [${id}] Anúncio ${tipoAnuncio} (${anuncioId}): Desmontando componente`, 'color: #F44336');
      
      // Forçar registro para todos os anúncios não registrados na desmontagem
      // mesmo que não tenham atingido o limiar de visibilidade
      if (!hasReportedRef.current) {
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
        
        // Garantir valor mínimo e arredondar
        finalVisibleTime = Math.max(0.5, Math.round(finalVisibleTime * 100) / 100);
        
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
          tempo_exposto: finalVisibleTime,
          visivel: true,
          dispositivo: getDeviceInfo(),
          pais: locationInfo.pais,
          regiao: locationInfo.regiao,
          session_id: sessionId.current,
          timestamp: new Date().toISOString()
        });
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
        console.log(`%c[AdTracker] [${id}] Anúncio ${tipoAnuncio} (${anuncioId}): Componente desmontado, enviando ${eventsBuffer.length} eventos pendentes`, 'color: #9C27B0');
        flushEventsBuffer();
      }
    };
  }, []);
  
  // Efeito para obter localização - executa apenas uma vez
  useEffect(() => {
    const fetchLocation = async () => {
      const location = await getLocation();
      setLocationInfo(location);
      console.log(`%c[AdTracker] [${componentIdRef.current}] Anúncio ${tipoAnuncio} (${anuncioId}): Localização definida como ${location.pais}, ${location.regiao}`, 'color: #607D8B');
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
          console.log(`%c[AdTracker] [${componentId}] Anúncio ${tipoAnuncio} (${anuncioId}): Primeira visualização nesta sessão`, 'color: #CDDC39; font-weight: bold');
        } else {
          console.log(`%c[AdTracker] [${componentId}] Anúncio ${tipoAnuncio} (${anuncioId}): Já visualizado anteriormente nesta sessão`, 'color: #FF5722');
        }
      }
      
      // Tratamento especial para anúncios fixos e laterais
      // Esses anúncios são geralmente fixos na tela e podem não disparar os eventos de visibilidade adequadamente
      const fixedAdTypes = ['lateral', 'fixo-superior', 'fixo-inferior'];
      if (fixedAdTypes.includes(tipoAnuncio) && !hasReportedRef.current) {
        // Para anúncios fixos, vamos garantir que eles sejam registrados logo na inicialização
        setTimeout(() => {
          if (!hasReportedRef.current) {
            console.log(`%c[AdTracker] [${componentId}] Anúncio ${tipoAnuncio} (${anuncioId}): Registro imediato para anúncio fixo`, 'background: #3F51B5; color: white; padding: 2px 5px; border-radius: 3px');
            
            // Marcar que já reportamos para este anúncio
            hasReportedRef.current = true;
            
            // Obter a página atual para o rastreamento
            const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
            const pagina = paginaId || currentPath || '/';
            
            // Usar um tempo de exposição padrão para anúncios fixos
            const tempoExposicao = tipoAnuncio.includes('lateral') ? 1.5 : 1.0;
            
            // Registrar o evento com tempo fixo
            registerEvent({
              anuncio_id: anuncioId,
              tipo_anuncio: tipoAnuncio,
              pagina: pagina,
              tipo_evento: 'impressao',
              tempo_exposto: tempoExposicao,
              visivel: true,
              dispositivo: getDeviceInfo(),
              pais: locationInfo.pais,
              regiao: locationInfo.regiao,
              session_id: sessionId.current,
              timestamp: new Date().toISOString()
            });
          }
        }, 1000); // Registrar após 1 segundo para dar tempo de renderizar completamente
      }
    }
  }, [anuncioId, tipoAnuncio]);
  
  // Configurar a detecção de visibilidade com IntersectionObserver
  useEffect(() => {
    const componentId = componentIdRef.current;
    
    // Verificar se temos todos os dados necessários
    if (!anuncioId || !tipoAnuncio || !anuncioRef.current) {
      console.warn(`%c[AdTracker] [${componentId}] ERRO: Dados incompletos para configurar detecção de visibilidade`, 'color: red', {
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
    
    console.log(`%c[AdTracker] [${componentId}] Anúncio ${tipoAnuncio} (${anuncioId}): Configurando observer em ${pagina}`, 'color: #3F51B5');
    
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
          console.log(`%c[AdTracker] [${componentId}] Anúncio ${tipoAnuncio} (${anuncioId}): Visível (${visibilityPercentage}%)`, 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px');
          
          // Iniciar o cronômetro para rastrear tempo exposto
          if (!exposureTimerRef.current) {
            exposureTimerRef.current = setInterval(() => {
              setExposureTime(prev => {
                const newValue = prev + 1;
                // Reduzir frequência de logs (apenas a cada 10 segundos)
                if (newValue % 10 === 0) {
                  console.log(`%c[AdTracker] [${componentId}] Anúncio ${tipoAnuncio} (${anuncioId}): Tempo exposto: ${newValue}s`, 'color: #00BCD4');
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
          
          // Atualizar o tempo de exposição - APENAS se não enviamos ainda neste ciclo
          // Reduzido o tempo mínimo para 0.1 segundos para capturar mais impressões
          if (timeVisible > 0.1 && !hasReportedExposure) {
            console.log(`%c[AdTracker] [${componentId}] Anúncio ${tipoAnuncio} (${anuncioId}): Registrando impressão com tempo=${roundedTime}`, 'background: #673AB7; color: white; padding: 2px 5px; border-radius: 3px');
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
          } else if (timeVisible <= 0.1 && !hasReportedExposure) {
            console.log(`%c[AdTracker] [${componentId}] Anúncio ${tipoAnuncio} (${anuncioId}): Tempo insuficiente (${roundedTime}s < 0.1s) para registrar impressão`, 'background: #FFC107; color: black; padding: 2px 5px; border-radius: 3px');
          }
          
          setVisibleStartTime(null);
          setExposureTime(0); // Resetar contador
        }
      },
      {
        threshold: 0.1, // Reduzido para 10% - Consideramos visível quando 10% do anúncio está na tela (era 0.5 = 50%)
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
          // Reduzido o tempo mínimo para 0.1 segundos
          if (finalTimeVisible > 0.1 && hasRegisteredImpression) {
            console.log(`%c[AdTracker] [${componentId}] Anúncio ${tipoAnuncio} (${anuncioId}): Finalizando componente enquanto visível. Tempo: ${roundedFinalTime.toFixed(2)}s`, 'background: #009688; color: white; padding: 2px 5px; border-radius: 3px');
            
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
          } else if (finalTimeVisible <= 0.1 && hasRegisteredImpression) {
            console.log(`%c[AdTracker] [${componentId}] Anúncio ${tipoAnuncio} (${anuncioId}): Tempo insuficiente (${roundedFinalTime}s < 0.1s) ao finalizar componente`, 'background: #FFC107; color: black; padding: 2px 5px; border-radius: 3px');
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
      console.warn(`%c[AdTracker] [${componentId}] ERRO: Tentativa de registrar clique sem dados essenciais`, 'color: red');
      return; // Não registrar o clique se faltar qualquer dado essencial
    }
    
    // Usar o paginaId fornecido ou cair para o pathname como fallback
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const pagina = paginaId || currentPath || '/';
    
    // Calcular o tempo atual de exposição
    let tempoAtual;
    
    if (tipoAnuncio === 'tela-inteira') {
      // Para anúncios de tela inteira, calcular desde a montagem
      tempoAtual = (Date.now() - mountTimeRef.current) / 1000;
      console.log(`%c[AdTracker] [${componentId}] Anúncio ${tipoAnuncio} (${anuncioId}): Tempo de exposição para tela inteira calculado desde a montagem: ${tempoAtual.toFixed(2)}s`, 'color: #FF9800');
    } else if (visibleStartTime) {
      // Para outros anúncios, calcular desde que ficou visível
      tempoAtual = (Date.now() - visibleStartTime) / 1000;
    } else {
      // Fallback para o valor do estado
      tempoAtual = exposureTime;
    }
    
    // Garantir que o tempo seja um número válido e arredondado
    tempoAtual = Math.max(0.1, Math.round(tempoAtual * 100) / 100);
    
    console.log(`%c[AdTracker] [${componentId}] Anúncio ${tipoAnuncio} (${anuncioId}): CLIQUE detectado! Tempo exposto: ${tempoAtual.toFixed(2)}s`, 'background: #E91E63; color: white; font-size: 14px; padding: 5px; border-radius: 3px');
    
    registerEvent({
      anuncio_id: anuncioId,
      tipo_anuncio: tipoAnuncio,
      pagina: pagina,
      tipo_evento: 'clique',
      tempo_exposto: tempoAtual,
      visivel: true,
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