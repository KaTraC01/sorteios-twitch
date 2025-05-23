import React, { useState, useEffect } from 'react';
import './Anuncio.css';
import AdTracker from '../AdTracker';

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
  onFechar = null,
  preservarLayout = true,
  paginaId = ''
}) => {
  const [fechado, setFechado] = useState(false);
  const [anuncioConfig, setAnuncioConfig] = useState(null);
  const [pageId, setPageId] = useState('');
  
  // Gerar um pageId confiável baseado no pathname e outros parâmetros
  useEffect(() => {
    // Se um paginaId for fornecido via props, use-o
    if (paginaId) {
      setPageId(paginaId);
    } else {
      // Caso contrário, construa um pageId baseado no pathname e outros parâmetros
      try {
        const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
        // Extrair o nome da página da URL (último segmento ou 'home' se vazio)
        const pageName = pathname.split('/').filter(Boolean).pop() || 'home';
        // Criar identificador sem timestamp para consistência entre recarregamentos
        const uniquePageId = `${pageName}_${tipo}_${posicao}`;
        setPageId(uniquePageId);
      } catch (error) {
        // Em caso de erro, gerar um ID padrão, mas logar o erro
        console.error('Erro ao gerar pageId:', error);
        setPageId(`fallback_${tipo}_${posicao}`);
      }
    }
  }, [paginaId, tipo, posicao]);
  
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
      
      case 'cursos':
        return (
          <div 
            className="anuncio anuncio-cursos"
            style={{
              backgroundColor: anuncioConfig?.corFundo || cor || '#ff5722',
              color: anuncioConfig?.corTexto || corTexto || '#ffffff'
            }}
          >
            {mostrarFechar && (
              <button className="anuncio-fechar" onClick={handleFechar}>
                X
              </button>
            )}
            <a href={anuncioUrlDestino} className="anuncio-link" target="_blank" rel="noopener noreferrer">
              {anuncioImagemSrc ? (
                <img src={anuncioImagemSrc} alt={anuncioTitulo || 'Curso'} className="anuncio-imagem" />
              ) : (
                <>
                  <div className="anuncio-tag">CURSO</div>
                  {anuncioTitulo && <h3>{anuncioTitulo}</h3>}
                  {anuncioConfig?.subtitulo && <h4>{anuncioConfig.subtitulo}</h4>}
                  {anuncioDescricao && <p className="anuncio-descricao">{anuncioDescricao}</p>}
                  <button className="anuncio-button">
                    {anuncioConfig?.botaoTexto || "MATRICULAR AGORA"}
                  </button>
                </>
              )}
            </a>
          </div>
        );
      
      case 'video':
        return (
          <div className="anuncio anuncio-video">
            {mostrarFechar && (
              <button className="anuncio-fechar" onClick={handleFechar}>
                X
              </button>
            )}
            <a href={anuncioUrlDestino} className="anuncio-link" target="_blank" rel="noopener noreferrer">
              {anuncioImagemSrc && (
                <img src={anuncioImagemSrc} alt={anuncioTitulo || 'Vídeo'} className="anuncio-imagem" />
              )}
              <div className="anuncio-info">
                {idade && <span className="anuncio-valor">+{idade}</span>}
              </div>
              {!anuncioImagemSrc && (
                <div className="anuncio-conteudo">
                  {anuncioTitulo && <h3>{anuncioTitulo}</h3>}
                  {anuncioDescricao && <p className="anuncio-descricao">{anuncioDescricao}</p>}
                  <div className="anuncio-play">▶</div>
                </div>
              )}
            </a>
          </div>
        );
      
      case 'quadrado':
        return (
          <div className="anuncio anuncio-quadrado">
            {mostrarFechar && (
              <button className="anuncio-fechar" onClick={handleFechar}>
                X
              </button>
            )}
            <a href={anuncioUrlDestino} className="anuncio-link" target="_blank" rel="noopener noreferrer">
              {anuncioImagemSrc ? (
                <img src={anuncioImagemSrc} alt={anuncioTitulo || 'Anúncio'} className="anuncio-imagem" />
              ) : (
                <>
                  <div className="anuncio-tag">PUBLICIDADE</div>
                  {logo && <img src={logo} alt="Logo" className="anuncio-logo" />}
                  {anuncioTitulo && <h3>{anuncioTitulo}</h3>}
                  {anuncioDescricao && <p className="anuncio-descricao">{anuncioDescricao}</p>}
                  {anuncioAvisos && <small className="anuncio-avisos">{anuncioAvisos}</small>}
                </>
              )}
            </a>
          </div>
        );
      
      case 'logos':
        const tamanho = anuncioConfig?.tamanho || 'medio';
        return (
          <div className={`anuncio anuncio-logos anuncio-logos-${tamanho}`}>
            {mostrarFechar && (
              <button className="anuncio-fechar" onClick={handleFechar}>
                X
              </button>
            )}
            <a href={anuncioUrlDestino} className="anuncio-link" target="_blank" rel="noopener noreferrer">
              {anuncioImagemSrc ? (
                <img src={anuncioImagemSrc} alt={anuncioTitulo || 'Patrocinador'} className="anuncio-logos-imagem" />
              ) : (
                <div className="anuncio-conteudo">
                  <div className="anuncio-tag">PARCEIRO</div>
                  {logo && <img src={logo} alt="Logo" className="anuncio-logo" />}
                  {anuncioTitulo && <h3>{anuncioTitulo}</h3>}
                  {anuncioDescricao && <p className="anuncio-descricao">{anuncioDescricao}</p>}
                </div>
              )}
            </a>
          </div>
        );
      
      default:
        // Verificar se o tipo não é um dos que já tratamos acima
        if (['banner', 'tela-inteira', 'fixo-superior', 'lateral', 'fixo-inferior', 'cursos', 'video', 'quadrado', 'logos'].includes(tipo)) {
          console.warn(`Tipo de anúncio '${tipo}' foi reconhecido mas não está implementado corretamente.`);
        } else {
          console.warn(`Tipo de anúncio '${tipo}' não reconhecido. Usando estilo padrão.`);
        }
        
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
  
  // Renderizar o anúncio com o tracker
  return pageId ? (
    // Verificar se todos os dados necessários para o rastreamento estão disponíveis
    (() => {
      // Determinar o ID efetivo do anúncio (real ou gerado)
      const anuncioIdEfetivo = anuncioConfig?.id || `${tipo}-${posicao}`;
      
      // Só renderizar o AdTracker se tivermos dados válidos e completos
      if (!anuncioIdEfetivo || !pageId || !tipo) {
        // Se algum dado essencial estiver faltando, renderizar apenas o conteúdo sem o tracker
        console.warn(`AdTracker não renderizado para ${tipo}-${posicao}: dados incompletos`);
        return renderConteudoAnuncio();
      }
      
      // Todos os dados necessários estão disponíveis, então renderizar com o AdTracker
      return (
        <AdTracker 
          anuncioId={anuncioIdEfetivo} 
          tipoAnuncio={tipo}
          paginaId={pageId}
          preservarLayout={preservarLayout}
        >
          {renderConteudoAnuncio()}
        </AdTracker>
      );
    })()
  ) : renderConteudoAnuncio(); // Se pageId não estiver pronto, renderizar apenas o conteúdo
};

export default Anuncio;