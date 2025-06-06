import React, { useState, useEffect } from 'react';
import './Anuncio.css';
import AdTracker from '../AdTracker';
import { supabase } from '../../utils/supabaseClient';

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
  const [anuncioId, setAnuncioId] = useState(null);
  const [paginaId, setPaginaId] = useState(null);
  
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

  // Obter ou criar IDs para anúncio e página ao montar o componente
  useEffect(() => {
    async function obterOuCriarAnuncio() {
      try {
        // Primeiro, verificar se já temos um anúncio correspondente
        const anuncioNome = anuncioConfig?.titulo || titulo || `Anúncio ${tipo} ${posicao}`;
        const anuncioUrl = anuncioConfig?.urlDestino || urlDestino;
        
        // Usar a função RPC para obter ou criar o anúncio
        const { data, error } = await supabase.rpc(
          'obter_ou_criar_anuncio',
          {
            p_nome: anuncioNome,
            p_url_destino: anuncioUrl,
            p_tipo_anuncio: tipo,
            p_tamanho: posicao
          }
        );
        
        if (error) {
          console.error("Erro ao obter ou criar anúncio:", error);
          return;
        }
        
        // A função RPC retorna diretamente o ID do anúncio
        setAnuncioId(data);
      } catch (err) {
        console.error("Erro inesperado ao processar anúncio:", err);
      }
    }
    
    async function obterOuCriarPagina() {
      try {
        const paginaUrl = window.location.pathname;
        const paginaTitulo = document.title;
        
        // Usar a função RPC para obter ou criar a página
        const { data, error } = await supabase.rpc(
          'obter_ou_criar_pagina',
          {
            p_url: paginaUrl,
            p_titulo: paginaTitulo,
            p_categoria: 'principal',
            p_secao: posicao
          }
        );
        
        if (error) {
          console.error("Erro ao obter ou criar página:", error);
          return;
        }
        
        // A função RPC retorna diretamente o ID da página
        setPaginaId(data);
      } catch (err) {
        console.error("Erro inesperado ao processar página:", err);
      }
    }
    
    if (anuncioConfig || (tipo && posicao)) {
      obterOuCriarAnuncio();
      obterOuCriarPagina();
    }
  }, [anuncioConfig, tipo, posicao, titulo, urlDestino]);
  
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
  
  // Renderizar o conteúdo do anúncio
  const renderConteudoAnuncio = () => {
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
      
      case 'tela-inteira':
        return (
          <div className="anuncio-tela-inteira">
            <div className="anuncio-tela-inteira-container">
              {mostrarFechar && (
                <button className="anuncio-tela-inteira-fechar" onClick={handleFechar}>
                  X
                </button>
              )}
              <a href={anuncioUrlDestino} className="anuncio-link" target="_blank" rel="noopener noreferrer">
                {anuncioImagemSrc && (
                  <img src={anuncioImagemSrc} alt={anuncioTitulo || 'Anúncio'} className="anuncio-tela-inteira-imagem" />
                )}
                {!anuncioImagemSrc && (
                  <>
                    {anuncioTitulo && <h2 className="anuncio-tela-inteira-titulo">{anuncioTitulo}</h2>}
                    {anuncioDescricao && <p className="anuncio-tela-inteira-subtitulo">{anuncioDescricao}</p>}
                    <button className="anuncio-tela-inteira-botao">Clique Aqui</button>
                    {anuncioAvisos && <div className="anuncio-tela-inteira-aviso">{anuncioAvisos}</div>}
                  </>
                )}
              </a>
            </div>
          </div>
        );
      
      case 'fixo-superior':
        return (
          <div className="anuncio-container-superior">
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
      
      case 'fixo-inferior':
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
      
      default:
        return (
          <div 
            className={`anuncio anuncio-padrao anuncio-${anuncioPosicao}`}
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
    }
  };
  
  // Se não temos IDs ainda, renderizar sem o tracker
  if (!anuncioId || !paginaId) {
    return renderConteudoAnuncio();
  }
  
  // Renderizar com o tracker quando temos os IDs
  return (
    <AdTracker 
      adId={anuncioId} 
      pageId={paginaId} 
      tipo={tipo}
    >
      {renderConteudoAnuncio()}
    </AdTracker>
  );
};

export default Anuncio;