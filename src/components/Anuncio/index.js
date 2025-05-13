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
  const [anuncioConfig, setAnuncioConfig] = useState(null);
  
  // Carregar o arquivo de configuração de anúncios
  useEffect(() => {
    fetch('/anuncios/config.json')
      .then(response => response.json())
      .then(data => {
        // Se existem anúncios deste tipo e ativos
        if (data[tipo] && data[tipo].length > 0) {
          const anunciosAtivos = data[tipo].filter(a => a.ativo);
          if (anunciosAtivos.length > 0) {
            // Se for banner na tabela, procurar por um anúncio específico para essa posição
            if (tipo === 'banner' && posicao === 'na-tabela') {
              // Procurar por um anúncio com posição específica 'na-tabela'
              const anuncioEspecifico = anunciosAtivos.find(a => a.posicao === 'na-tabela');
              // Se encontrar, usar esse anúncio, senão usar o primeiro da lista
              setAnuncioConfig(anuncioEspecifico || anunciosAtivos[0]);
            } 
            // Se for do tipo fixo-superior, sempre usar o primeiro anúncio da lista
            else if (tipo === 'fixo-superior') {
              setAnuncioConfig(anunciosAtivos[0]);
            }
            else {
              // Para outros casos, seleciona um anúncio aleatório do tipo especificado
              const anuncioSelecionado = anunciosAtivos[Math.floor(Math.random() * anunciosAtivos.length)];
              setAnuncioConfig(anuncioSelecionado);
            }
          }
        }
      })
      .catch(error => {
        console.error("Erro ao carregar configuração de anúncios:", error);
      });
  }, [tipo, posicao]);
  
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
  
  // Usar dados do anuncioConfig se estiver disponível, caso contrário usar props
  const anuncioTitulo = anuncioConfig?.titulo || titulo;
  const anuncioDescricao = anuncioConfig?.descricao || descricao;
  const anuncioUrlDestino = anuncioConfig?.urlDestino || urlDestino;
  const anuncioImagemSrc = anuncioConfig?.imagem || imagemSrc;
  const anuncioAvisos = anuncioConfig?.avisos || avisos;
  const anuncioPosicao = anuncioConfig?.posicao || posicao;
  
  const estiloPersonalizado = {
    backgroundColor: cor || '#222',
    color: corTexto || '#ffffff'
  };
  
  // Renderiza o anúncio de acordo com o tipo
  switch(tipo) {
    case 'banner':
      return (
        <div 
          className={`anuncio anuncio-${tipo} anuncio-${anuncioPosicao}`} 
          style={estiloPersonalizado}
        >
          {mostrarFechar && (
            <button className="anuncio-fechar" onClick={handleFechar}>
              X
            </button>
          )}
          <a href={anuncioUrlDestino} className="anuncio-link" target="_blank" rel="noopener noreferrer">
            {/* Quando há imagem, mostrar apenas ela */}
            {anuncioImagemSrc && <img src={anuncioImagemSrc} alt={anuncioTitulo || 'Anúncio'} className="anuncio-imagem" />}
            
            {/* Quando não há imagem, mostrar o conteúdo tradicional */}
            {!anuncioImagemSrc && (
              <>
                <div className="anuncio-conteudo">
                  {anuncioTitulo && <h3>{anuncioTitulo}</h3>}
                  {anuncioDescricao && <p className="anuncio-descricao">{anuncioDescricao}</p>}
                  {idade && <span className="anuncio-tag">+{idade}</span>}
                  {anuncioAvisos && <small className="anuncio-avisos">{anuncioAvisos}</small>}
                  {mostrarPresente && (
                    <button className="botao-presente">Clique para abrir!</button>
                  )}
                </div>
                {logo && <img src={logo} alt="Logo" className="anuncio-logo" />}
                {mostrarPresente && <img src="/presente.png" alt="Presente" className="presente-animado" />}
              </>
            )}
          </a>
        </div>
      );
    
    case 'fixo-superior':
      return (
        <div 
          className={`anuncio anuncio-fixo-superior`} 
          style={estiloPersonalizado}
        >
          {mostrarFechar && (
            <button className="anuncio-fechar" onClick={handleFechar}>
              X
            </button>
          )}
          <a href={anuncioUrlDestino} className="anuncio-link" target="_blank" rel="noopener noreferrer">
            {/* Quando há imagem, mostrar apenas ela */}
            {anuncioImagemSrc && <img src={anuncioImagemSrc} alt={anuncioTitulo || 'Anúncio'} className="anuncio-imagem" />}
            
            {/* Quando não há imagem, mostrar o conteúdo tradicional */}
            {!anuncioImagemSrc && (
              <>
                <div className="anuncio-conteudo">
                  {anuncioTitulo && <h3>{anuncioTitulo}</h3>}
                  {anuncioDescricao && <p className="anuncio-descricao">{anuncioDescricao}</p>}
                  {idade && <span className="anuncio-tag">+{idade}</span>}
                  {anuncioAvisos && <small className="anuncio-avisos">{anuncioAvisos}</small>}
                </div>
                {logo && <img src={logo} alt="Logo" className="anuncio-logo" />}
              </>
            )}
          </a>
        </div>
      );
    
    case 'lateral':
      return (
        <div 
          className={`anuncio anuncio-${tipo} anuncio-${anuncioPosicao}`}
          style={estiloPersonalizado}
        >
          {mostrarFechar && (
            <button className="anuncio-fechar" onClick={handleFechar}>
              X
            </button>
          )}
          <a href={anuncioUrlDestino} className="anuncio-link" target="_blank" rel="noopener noreferrer">
            {anuncioImagemSrc && <img src={anuncioImagemSrc} alt={anuncioTitulo || 'Anúncio'} className="anuncio-imagem" />}
            {!anuncioImagemSrc && (
              <>
                <div className="anuncio-tag">PUBLICIDADE</div>
                {logo && <img src={logo} alt="Logo" className="anuncio-logo" />}
                <div className="anuncio-conteudo">
                  {anuncioTitulo && <h3>{anuncioTitulo}</h3>}
                  {anuncioDescricao && <p className="anuncio-descricao">{anuncioDescricao}</p>}
                  {idade && <span className="anuncio-tag">+{idade}</span>}
                  {anuncioAvisos && <small className="anuncio-avisos">{anuncioAvisos}</small>}
                  {mostrarPresente && (
                    <button className="botao-presente">Clique para abrir!</button>
                  )}
                </div>
                {mostrarPresente && <img src="/presente.png" alt="Presente" className="presente-animado" />}
              </>
            )}
          </a>
        </div>
      );
    
    case 'quadrado':
      return (
        <div 
          className={`anuncio anuncio-${tipo} anuncio-${anuncioPosicao}`}
          style={estiloPersonalizado}
        >
          {mostrarFechar && (
            <button className="anuncio-fechar" onClick={handleFechar}>
              X
            </button>
          )}
          <a href={anuncioUrlDestino} className="anuncio-link" target="_blank" rel="noopener noreferrer">
            {anuncioImagemSrc && <img src={anuncioImagemSrc} alt={anuncioTitulo || 'Anúncio'} className="anuncio-imagem" />}
            {!anuncioImagemSrc && (
              <>
                <div className="anuncio-tag">PUBLICIDADE</div>
                {logo && <img src={logo} alt="Logo" className="anuncio-logo" />}
                <div className="anuncio-conteudo">
                  {anuncioTitulo && <h3>{anuncioTitulo}</h3>}
                  {anuncioDescricao && <p className="anuncio-descricao">{anuncioDescricao}</p>}
                  {idade && <span className="anuncio-tag">+{idade}</span>}
                  {anuncioAvisos && <small className="anuncio-avisos">{anuncioAvisos}</small>}
                  {mostrarPresente && (
                    <button className="botao-presente">Clique para abrir!</button>
                  )}
                </div>
                {mostrarPresente && <img src="/presente.png" alt="Presente" className="presente-animado" />}
              </>
            )}
          </a>
        </div>
      );
    
    case 'video':
      return (
        <div 
          className={`anuncio anuncio-${tipo} anuncio-${anuncioPosicao}`}
          style={estiloPersonalizado}
        >
          {mostrarFechar && (
            <button className="anuncio-fechar" onClick={handleFechar}>
              X
            </button>
          )}
          <a href={anuncioUrlDestino} className="anuncio-link" target="_blank" rel="noopener noreferrer">
            {anuncioImagemSrc && <img src={anuncioImagemSrc} alt={anuncioTitulo || 'Anúncio'} className="anuncio-imagem" />}
            {!anuncioImagemSrc && (
              <>
                <div className="anuncio-tag">PUBLICIDADE</div>
                {logo && <img src={logo} alt="Logo" className="anuncio-logo" />}
                <div className="anuncio-conteudo">
                  {anuncioTitulo && <h3>{anuncioTitulo}</h3>}
                  {anuncioDescricao && <p className="anuncio-descricao">{anuncioDescricao}</p>}
                  {idade && <span className="anuncio-tag">+{idade}</span>}
                  {anuncioAvisos && <small className="anuncio-avisos">{anuncioAvisos}</small>}
                </div>
              </>
            )}
          </a>
        </div>
      );
    
    case 'fixo-inferior':
      return (
        <div className={`anuncio-fixo-inferior`}>
          {mostrarFechar && (
            <button className="anuncio-fechar-grande" onClick={handleFechar}>
              ✖
            </button>
          )}
          <a href={anuncioUrlDestino} target="_blank" rel="noopener noreferrer" className="anuncio-link">
            {anuncioImagemSrc && <img src={anuncioImagemSrc} alt={anuncioTitulo || 'Anúncio'} className="anuncio-imagem" />}
          </a>
        </div>
      );
    
    case 'tela-inteira':
      return (
        <div className="anuncio-tela-inteira">
          <div className="anuncio-tela-inteira-container">
            {mostrarFechar && (
              <button className="anuncio-tela-inteira-fechar" onClick={handleFechar}>
                ✖
              </button>
            )}
            
            <a 
              href={anuncioUrlDestino} 
              className="anuncio-link" 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault();
                if (onFechar && typeof onFechar === 'function') {
                  onFechar();
                } else {
                  window.open(anuncioUrlDestino, '_blank');
                }
              }}
            >
              <img 
                src={anuncioImagemSrc} 
                alt={anuncioTitulo || "Anúncio"} 
                className="anuncio-tela-inteira-imagem" 
              />
            </a>
          </div>
        </div>
      );
    
    case 'cursos':
      // Obter propriedades específicas do tipo cursos
      const subtitulo = anuncioConfig?.subtitulo || '';
      const botaoTexto = anuncioConfig?.botaoTexto || 'SABER MAIS';
      const corFundo = anuncioConfig?.corFundo || '#ff5722';
      const corBotao = anuncioConfig?.corTexto || '#ffffff';
      
      return (
        <div 
          className={`anuncio anuncio-${tipo}`}
        >
          {mostrarFechar && (
            <button className="anuncio-fechar" onClick={handleFechar}>
              X
            </button>
          )}
          <a href={anuncioUrlDestino} className="anuncio-link" target="_blank" rel="noopener noreferrer">
            {anuncioImagemSrc && <img src={anuncioImagemSrc} alt={anuncioTitulo || 'Anúncio'} className="anuncio-imagem" />}
          </a>
        </div>
      );
    
    case 'logos':
      const logoTamanho = anuncioConfig?.tamanho || 'medio';
      
      return (
        <div className={`anuncio anuncio-logos anuncio-logos-${logoTamanho}`}>
          {mostrarFechar && (
            <button className="anuncio-fechar" onClick={handleFechar}>
              X
            </button>
          )}
          <a href={anuncioUrlDestino} target="_blank" rel="noopener noreferrer">
            <img 
              src={anuncioImagemSrc} 
              alt={anuncioTitulo || 'Patrocinador'} 
              className="anuncio-logos-imagem" 
            />
          </a>
        </div>
      );
    
    // Caso padrão para espaço reservado para anúncios
    default:
      return (
        <div 
          className={`anuncio anuncio-padrao anuncio-${anuncioPosicao}`}
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