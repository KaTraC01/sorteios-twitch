/**
 * Componente Google Tag Manager
 * 
 * Componente responsável por inserir o noscript do GTM no body
 * e gerenciar a inicialização do GTM de forma controlada.
 */

import { useEffect } from 'react';
import { initializeGTM, getGTMNoscript } from '../utils/gtm';

const GTM = () => {
  useEffect(() => {
    // Inicializar GTM quando o componente for montado
    initializeGTM();
  }, []);

  // Renderizar o noscript para usuários sem JavaScript
  return (
    <noscript 
      dangerouslySetInnerHTML={{ 
        __html: getGTMNoscript() 
      }} 
    />
  );
};

export default GTM;
