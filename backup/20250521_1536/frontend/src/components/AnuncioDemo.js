import React from 'react';
import './AnuncioDemo.css';

const AnuncioDemo = ({ tamanho = 'banner', backgroundColor = '#ffffff' }) => {
  // Definir estilos com base no tamanho do anúncio
  const estilos = {
    banner: {
      width: '970px',
      height: '90px',
      margin: '20px auto',
    },
    retangulo: {
      width: '300px',
      height: '250px',
      margin: '20px auto',
    },
    quadrado: {
      width: '250px',
      height: '250px',
      margin: '20px auto',
    }
  };

  const estilo = estilos[tamanho] || estilos.banner;

  return (
    <div 
      className="anuncio-demo-container" 
      style={{ 
        ...estilo,
        backgroundColor: backgroundColor 
      }}
    >
      <div className="anuncio-demo-conteudo">
        <div className="anuncio-demo-info">
          <h3>Exemplo de Anúncio</h3>
          <p>Tamanho: {estilo.width} × {estilo.height}</p>
        </div>
        <div className="anuncio-demo-botao">
          <button>Ver mais</button>
        </div>
      </div>
    </div>
  );
};

export default AnuncioDemo; 