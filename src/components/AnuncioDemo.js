import React from 'react';
import './AnuncioDemo.css';
import AdTracker from './AdTracker';

const AnuncioDemo = ({ tipo = 'banner', titulo = '', backgroundColor = '#2563eb' }) => {
  const tipoFormatado = titulo || tipo.charAt(0).toUpperCase() + tipo.slice(1).replace(/-/g, ' ');
  
  // Gerar um ID único para o anúncio de demonstração
  const anuncioId = `demo_${tipo}_${Date.now().toString(36).substring(2, 9)}`;
  
  // Obter a página atual para o rastreamento
  const paginaAtual = typeof window !== 'undefined' ? window.location.pathname : '/demo';
  
  const conteudoAnuncio = (
    <div className="anuncio-demo">
      <div 
        className={`anuncio-demo-container anuncio-demo-${tipo}`} 
        style={{ backgroundColor }}
      >
        <div className="anuncio-demo-conteudo">
          <div className="anuncio-demo-info">
            <h3>{tipoFormatado}</h3>
            <p>Exemplo</p>
          </div>
        </div>
      </div>
    </div>
  );
  
  return (
    <AdTracker
      anuncioId={anuncioId}
      tipoAnuncio={`demo-${tipo}`}
      paginaId={`${paginaAtual}_demo_${tipo}`}
      preservarLayout={true}
    >
      {conteudoAnuncio}
    </AdTracker>
  );
};

export default AnuncioDemo; 