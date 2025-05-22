import React from 'react';
import './AnuncioDemo.css';

const AnuncioDemo = ({ tipo = 'banner', titulo = '', backgroundColor = '#2563eb' }) => {
  const tipoFormatado = titulo || tipo.charAt(0).toUpperCase() + tipo.slice(1).replace(/-/g, ' ');
  
  return (
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
};

export default AnuncioDemo; 