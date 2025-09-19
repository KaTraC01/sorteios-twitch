/**
 * Google Tag Manager (GTM) Utilities
 * 
 * Implementação profissional do GTM seguindo boas práticas de segurança.
 * Suporta configuração via variáveis de ambiente para diferentes ambientes.
 */

// ID do GTM - configurável via variável de ambiente para flexibilidade
const GTM_ID = process.env.REACT_APP_GTM_ID || 'GTM-5XDBWS8G';

/**
 * Inicializa o dataLayer do GTM se ainda não existir
 */
export const initializeDataLayer = () => {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
  }
};

/**
 * Inicializa o Google Tag Manager
 * Deve ser chamado o mais cedo possível no carregamento da página
 */
export const initializeGTM = () => {
  if (typeof window === 'undefined' || !GTM_ID) return;

  // Inicializar dataLayer
  initializeDataLayer();

  // Adicionar evento inicial do GTM
  window.dataLayer.push({
    'gtm.start': new Date().getTime(),
    event: 'gtm.js'
  });

  // Criar e inserir o script do GTM
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  
  // Inserir o script no head
  const firstScript = document.getElementsByTagName('script')[0];
  if (firstScript && firstScript.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else {
    document.head.appendChild(script);
  }
};

/**
 * Envia eventos personalizados para o GTM
 * @param {string} eventName - Nome do evento
 * @param {Object} eventData - Dados adicionais do evento
 */
export const sendGTMEvent = (eventName, eventData = {}) => {
  if (typeof window === 'undefined' || !window.dataLayer) return;

  window.dataLayer.push({
    event: eventName,
    ...eventData
  });
};

/**
 * Retorna o HTML do noscript para ser inserido no body
 * Usado para usuários que têm JavaScript desabilitado
 */
export const getGTMNoscript = () => {
  if (!GTM_ID) return '';
  
  return `<iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}"
    height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
};

/**
 * Utilitário para tracking de eventos específicos do site de sorteio
 */
export const trackSorteioEvent = (action, data = {}) => {
  sendGTMEvent('sorteio_event', {
    sorteio_action: action,
    ...data
  });
};

/**
 * Utilitário para tracking de interações com anúncios
 */
export const trackAnuncioEvent = (action, posicao, data = {}) => {
  sendGTMEvent('anuncio_event', {
    anuncio_action: action,
    anuncio_posicao: posicao,
    ...data
  });
};

export { GTM_ID };
