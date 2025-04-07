import React, { useState, useEffect } from 'react';
import './Anuncio.css';

// Componente de anúncio que pode ser usado em diferentes formatos e locais
function Anuncio({ 
    tipo, 
    posicao, 
    mostrarFechar = false,
    // Novos props para conteúdo personalizado
    conteudoPersonalizado = null,
    urlDestino = '#',
    imagemSrc = '',
    titulo = '',
    descricao = '',
    idade = '',
    avisos = [],
    logo = '',
    cor = '',
    corTexto = ''
}) {
    const [fechado, setFechado] = useState(false);
    
    // Efeito para reabrir o anúncio após 30 segundos caso seja fechado
    useEffect(() => {
        let timer;
        if (fechado) {
            timer = setTimeout(() => {
                setFechado(false);
            }, 30000);
        }
        
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [fechado]);

    // Se o anúncio foi fechado pelo usuário, não exibe nada
    if (fechado) {
        return null;
    }

    // Se houver conteúdo personalizado, renderiza ele diretamente
    if (conteudoPersonalizado) {
        return (
            <div className={`anuncio-${tipo} ${posicao}`} style={{ backgroundColor: cor, color: corTexto }}>
                {mostrarFechar && (
                    <button className="anuncio-fechar" onClick={() => setFechado(true)}>
                        ✖
                    </button>
                )}
                <div className="anuncio-tag">PUBLICIDADE</div>
                {conteudoPersonalizado}
            </div>
        );
    }

    // Define o conteúdo do anúncio baseado no tipo
    let conteudoAnuncio;
    
    switch (tipo) {
        case 'banner':
            conteudoAnuncio = (
                <div className={`anuncio-banner ${posicao}`} style={{ backgroundColor: cor, color: corTexto }}>
                    <a href={urlDestino} target="_blank" rel="noopener noreferrer" className="anuncio-link">
                        <div className="anuncio-conteudo">
                            <div className="anuncio-tag">PUBLICIDADE</div>
                            {logo && <img src={logo} alt="Logo do patrocinador" className="anuncio-logo" />}
                            {imagemSrc && <img src={imagemSrc} alt={titulo} className="anuncio-imagem" />}
                            <p>{titulo || "Espaço disponível para publicidade"}</p>
                            {descricao && <p className="anuncio-descricao">{descricao}</p>}
                        </div>
                        {(idade || avisos.length > 0) && (
                            <div className="anuncio-info">
                                {idade && <span className="anuncio-idade">{idade}</span>}
                                {avisos.map((aviso, index) => (
                                    <span key={index} className="anuncio-aviso">{aviso}</span>
                                ))}
                            </div>
                        )}
                    </a>
                    {mostrarFechar && (
                        <button className="anuncio-fechar" onClick={() => setFechado(true)}>
                            ✖
                        </button>
                    )}
                </div>
            );
            break;
            
        case 'lateral':
            conteudoAnuncio = (
                <div className={`anuncio-lateral ${posicao}`} style={{ backgroundColor: cor, color: corTexto }}>
                    <div className="anuncio-tag">PUBLICIDADE</div>
                    <a href={urlDestino} target="_blank" rel="noopener noreferrer" className="anuncio-link">
                        <div className="anuncio-lateral-conteudo">
                            {logo && <img src={logo} alt="Logo do patrocinador" className="anuncio-logo" />}
                            {imagemSrc && <img src={imagemSrc} alt={titulo} className="anuncio-imagem" />}
                            <p>{titulo || "Espaço disponível para publicidade"}</p>
                            {descricao && <p className="anuncio-descricao">{descricao}</p>}
                            <div className="anuncio-button">Saiba mais</div>
                        </div>
                    </a>
                    {mostrarFechar && (
                        <button className="anuncio-fechar" onClick={() => setFechado(true)}>
                            ✖
                        </button>
                    )}
                </div>
            );
            break;

        case 'fixo-inferior':
            conteudoAnuncio = (
                <div className={`anuncio-fixo-inferior ${posicao}`} style={{ backgroundColor: cor, color: corTexto }}>
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
                        {(idade || avisos.length > 0) && (
                            <div className="anuncio-fixo-info">
                                {idade && <span className="anuncio-idade">{idade}</span>}
                                {avisos.map((aviso, index) => (
                                    <span key={index} className="anuncio-aviso-pequeno">{aviso}</span>
                                ))}
                            </div>
                        )}
                    </a>
                    {mostrarFechar && (
                        <button className="anuncio-fechar-grande" onClick={() => setFechado(true)}>
                            ✖
                        </button>
                    )}
                </div>
            );
            break;
            
        default:
            // Formato padrão para espaço reservado
            conteudoAnuncio = (
                <div className={`anuncio-padrao ${posicao}`}>
                    <div className="anuncio-tag">PUBLICIDADE</div>
                    <p>Espaço reservado para anúncio</p>
                    {mostrarFechar && (
                        <button className="anuncio-fechar" onClick={() => setFechado(true)}>
                            ✖
                        </button>
                    )}
                </div>
            );
    }

    return conteudoAnuncio;
}

export default Anuncio; 