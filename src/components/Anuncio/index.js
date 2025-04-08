import React, { useState, useEffect } from 'react';
import './Anuncio.css';

const Anuncio = ({ 
  tipo = 'reservado', 
  posicao = 'direita', 
  conteudoPersonalizado, 
  urlDestino = '#',
  imagemSrc,
  titulo,
  descricao,
  idade,
  avisos,
  logo,
  cor,
  corTexto,
  mostrarFechar = true,
  mostrarPresente = false
}) => {
  const [fechado, setFechado] = useState(false);
  
  useEffect(() => {
    if (fechado) {
      const timer = setTimeout(() => {
        setFechado(false);
      }, 30000);
      
      return () => clearTimeout(timer);
    }
  }, [fechado]);
  
  const handleFechar = (e) => {
    e.preventDefault();
    setFechado(true);
  };
  
  if (fechado) {
    return null;
  }
  
  // Se houver conteúdo personalizado, renderize-o diretamente
  if (conteudoPersonalizado) {
    return (
      <div className={`anuncio anuncio-${tipo} anuncio-${posicao}`}>
        {mostrarFechar && (
          <button className="anuncio-fechar" onClick={handleFechar}>
            X
          </button>
        )}
        {conteudoPersonalizado}
      </div>
    );
  }
  
  const estiloPersonalizado = {
    backgroundColor: cor || '#222',
    color: corTexto || '#ffffff'
  };
  
  // Renderiza o anúncio de acordo com o tipo
  switch(tipo) {
    case 'banner':
      return (
        <div 
          className={`anuncio anuncio-${tipo} anuncio-${posicao}`} 
          style={estiloPersonalizado}
        >
          {mostrarFechar && (
            <button className="anuncio-fechar" onClick={handleFechar}>
              X
            </button>
          )}
          <a href={urlDestino} className="anuncio-link" target="_blank" rel="noopener noreferrer">
            {logo && <img src={logo} alt="Logo" className="anuncio-logo" />}
            {imagemSrc && <img src={imagemSrc} alt={titulo || 'Anúncio'} className="anuncio-imagem" />}
            {mostrarPresente && <img src="/presente.png" alt="Presente" className="presente-animado" />}
            <div className="anuncio-conteudo">
              {titulo && <h3>{titulo}</h3>}
              {descricao && <p className="anuncio-descricao">{descricao}</p>}
              {idade && <span className="anuncio-tag">+{idade}</span>}
              {avisos && <small className="anuncio-avisos">{avisos}</small>}
              {mostrarPresente && (
                <button className="botao-presente">Clique para abrir!</button>
              )}
            </div>
          </a>
        </div>
      );
    
    case 'lateral':
      return (
        <div 
          className={`anuncio anuncio-${tipo} anuncio-${posicao}`}
          style={estiloPersonalizado}
        >
          {mostrarFechar && (
            <button className="anuncio-fechar" onClick={handleFechar}>
              X
            </button>
          )}
          <a href={urlDestino} className="anuncio-link" target="_blank" rel="noopener noreferrer">
            {logo && <img src={logo} alt="Logo" className="anuncio-logo" />}
            {imagemSrc && <img src={imagemSrc} alt={titulo || 'Anúncio'} className="anuncio-imagem" />}
            {mostrarPresente && <img src="/presente.png" alt="Presente" className="presente-animado" />}
            <div className="anuncio-conteudo">
              {titulo && <h3>{titulo}</h3>}
              {descricao && <p className="anuncio-descricao">{descricao}</p>}
              {idade && <span className="anuncio-tag">+{idade}</span>}
              {avisos && <small className="anuncio-avisos">{avisos}</small>}
              {mostrarPresente && (
                <button className="botao-presente">Clique para abrir!</button>
              )}
            </div>
          </a>
        </div>
      );
    
    case 'fixo-bottom':
      return (
        <div 
          className={`anuncio anuncio-${tipo}`}
          style={estiloPersonalizado}
        >
          {mostrarFechar && (
            <button className="anuncio-fechar" onClick={handleFechar}>
              X
            </button>
          )}
          <a href={urlDestino} className="anuncio-link" target="_blank" rel="noopener noreferrer">
            {logo && <img src={logo} alt="Logo" className="anuncio-logo" />}
            {imagemSrc && <img src={imagemSrc} alt={titulo || 'Anúncio'} className="anuncio-imagem" />}
            {mostrarPresente && <img src="/presente.png" alt="Presente" className="presente-animado" />}
            <div className="anuncio-conteudo">
              {titulo && <h3>{titulo}</h3>}
              {descricao && <p className="anuncio-descricao">{descricao}</p>}
              {idade && <span className="anuncio-tag">+{idade}</span>}
              {avisos && <small className="anuncio-avisos">{avisos}</small>}
              {mostrarPresente && (
                <button className="botao-presente">Clique para abrir!</button>
              )}
            </div>
          </a>
        </div>
      );
    
    // Caso padrão para espaço reservado para anúncios
    default:
      return (
        <div 
          className={`anuncio anuncio-reservado anuncio-${posicao}`}
          style={estiloPersonalizado}
        >
          <span>Espaço reservado para anúncio</span>
        </div>
      );
  }
};

export default Anuncio;