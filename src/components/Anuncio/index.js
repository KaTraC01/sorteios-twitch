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
  mostrarPresente = false,
  onFechar = null
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
    
    if (onFechar && typeof onFechar === 'function') {
      onFechar();
    }
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
    
    case 'fixo-inferior':
      return (
        <div className={`anuncio-fixo-inferior`} style={estiloPersonalizado}>
          <a href={urlDestino} target="_blank" rel="noopener noreferrer" className="anuncio-link">
            <div className="anuncio-tag-pequena">#PROPAGANDA</div>
            <div className="anuncio-fixo-conteudo">
              {logo && (
                <div className="anuncio-fixo-logo">
                  <img src={logo} alt="Logo do patrocinador" />
                </div>
              )}
              <div className="anuncio-fixo-texto">
                <p>{descricao || "Espaço disponível para publicidade"}</p>
                <h2>{titulo || "ANÚNCIO"}</h2>
              </div>
            </div>
            {(idade || avisos) && (
              <div className="anuncio-fixo-info">
                {idade && <span className="anuncio-idade">{idade}</span>}
                {avisos && <span className="anuncio-aviso-pequeno">{avisos}</span>}
              </div>
            )}
          </a>
          {mostrarFechar && (
            <button className="anuncio-fechar-grande" onClick={handleFechar}>
              ✖
            </button>
          )}
        </div>
      );
    
    case 'tela-inteira':
      return (
        <div className="anuncio-tela-inteira">
          <div className="anuncio-tela-inteira-container" style={estiloPersonalizado}>
            <div className="anuncio-tag">PUBLICIDADE</div>
            
            {mostrarFechar && (
              <button className="anuncio-tela-inteira-fechar" onClick={handleFechar}>
                ✖
              </button>
            )}
            
            <a 
              href={urlDestino} 
              className="anuncio-link" 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault();
                if (onFechar && typeof onFechar === 'function') {
                  onFechar();
                } else {
                  window.open(urlDestino, '_blank');
                }
              }}
            >
              {logo && <img src={logo} alt="Logo" className="anuncio-logo" />}
              
              <h2 className="anuncio-tela-inteira-titulo">
                {titulo || "OFERTA ESPECIAL"}
              </h2>
              
              <h3 className="anuncio-tela-inteira-subtitulo">
                {descricao || "Para continuar adicionando +10 participações"}
              </h3>
              
              {imagemSrc && (
                <img 
                  src={imagemSrc} 
                  alt={titulo || "Anúncio"} 
                  className="anuncio-tela-inteira-imagem" 
                />
              )}
              
              <button className="anuncio-tela-inteira-botao">
                CLIQUE PARA CONTINUAR
              </button>
              
              {avisos && <p className="anuncio-tela-inteira-aviso">{avisos}</p>}
              {idade && <span className="anuncio-tag">+{idade}</span>}
            </a>
          </div>
        </div>
      );
    
    // Caso padrão para espaço reservado para anúncios
    default:
      return (
        <div 
          className={`anuncio anuncio-padrao anuncio-${posicao}`}
          style={estiloPersonalizado}
        >
          <div className="anuncio-tag">PUBLICIDADE</div>
          <p>Espaço reservado para anúncio</p>
          {mostrarFechar && (
            <button className="anuncio-fechar" onClick={handleFechar}>
              X
            </button>
          )}
        </div>
      );
  }
};

export default Anuncio;