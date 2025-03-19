import React, { useState, useEffect } from 'react';
import './Anuncio.css';

// Componente de anúncio que pode ser usado em diferentes formatos e locais
function Anuncio({ tipo, posicao, mostrarFechar = false }) {
    const [fechado, setFechado] = useState(false);
    
    // Efeito para reabrir o anúncio após 30 segundos caso seja fechado
    useEffect(() => {
        let timer;
        if (fechado) {
            timer = setTimeout(() => {
                setFechado(false);
            }, 30000); // 30 segundos
        }
        
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [fechado]);

    // Se o anúncio foi fechado pelo usuário, não exibe nada
    if (fechado) {
        return null;
    }

    // Define o conteúdo do anúncio baseado no tipo
    let conteudoAnuncio;
    
    switch (tipo) {
        case 'banner':
            conteudoAnuncio = (
                <div className={`anuncio-banner ${posicao}`}>
                    <div className="anuncio-conteudo">
                        <div className="anuncio-tag">PUBLICIDADE</div>
                        <p>Seu PRÓXIMO CLICK é PATROCINADO pela SUPERBET</p>
                        <div className="anuncio-call-action">
                            <span className="anuncio-icon">👆</span>
                        </div>
                    </div>
                    <div className="anuncio-info">
                        <span className="anuncio-idade">+18</span>
                        <span className="anuncio-aviso">JOGUE COM RESPONSABILIDADE</span>
                    </div>
                    {mostrarFechar && (
                        <button className="anuncio-fechar" onClick={() => setFechado(true)}>
                            ✖
                        </button>
                    )}
                </div>
            );
            break;
            
        case 'quadrado':
            conteudoAnuncio = (
                <div className={`anuncio-quadrado ${posicao}`}>
                    <div className="anuncio-tag">PUBLICIDADE</div>
                    <div className="anuncio-conteudo">
                        <p>DESPERTE SEUS SENTIDOS</p>
                        <div className="anuncio-button">Saber mais</div>
                    </div>
                    {mostrarFechar && (
                        <button className="anuncio-fechar" onClick={() => setFechado(true)}>
                            ✖
                        </button>
                    )}
                </div>
            );
            break;
            
        case 'video':
            conteudoAnuncio = (
                <div className={`anuncio-video ${posicao}`}>
                    <div className="anuncio-tag">PUBLICIDADE</div>
                    <div className="anuncio-conteudo">
                        <div className="anuncio-play">▶</div>
                        <div className="anuncio-button">Saber mais</div>
                        <div className="anuncio-mute">🔇</div>
                    </div>
                    <div className="anuncio-info">
                        <span className="anuncio-valor">R$18</span>
                    </div>
                    {mostrarFechar && (
                        <button className="anuncio-fechar" onClick={() => setFechado(true)}>
                            ✖
                        </button>
                    )}
                </div>
            );
            break;
            
        case 'cursos':
            conteudoAnuncio = (
                <div className={`anuncio-cursos ${posicao}`}>
                    <div className="anuncio-tag">PUBLICIDADE</div>
                    <div className="anuncio-conteudo">
                        <h3>Fez ENEM nos últimos 10 anos?</h3>
                        <h4>Aproveite descontos nos cursos presenciais!</h4>
                        <div className="anuncio-button">Saiba mais!</div>
                    </div>
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
                <div className={`anuncio-fixo-inferior ${posicao}`}>
                    <div className="anuncio-tag-pequena">#PROPAGANDA</div>
                    <div className="anuncio-fixo-conteudo">
                        <div className="anuncio-fixo-logo">V</div>
                        <div className="anuncio-fixo-texto">
                            <p>SEU PRÓXIMO CLICK É PATROCINADO PELA</p>
                            <h2>SUPERBET</h2>
                        </div>
                        <div className="anuncio-fixo-icone">
                            <span>👆</span>
                        </div>
                    </div>
                    <div className="anuncio-fixo-info">
                        <span className="anuncio-idade">+18</span>
                        <span className="anuncio-aviso-pequeno">PROIBIDO PARA MENORES DE 18 ANOS</span>
                        <span className="anuncio-aviso-pequeno">JOGUE COM RESPONSABILIDADE</span>
                    </div>
                    {mostrarFechar && (
                        <button className="anuncio-fechar-grande" onClick={() => setFechado(true)}>
                            ✖
                        </button>
                    )}
                </div>
            );
            break;
            
        case 'lateral':
            conteudoAnuncio = (
                <div className={`anuncio-lateral ${posicao}`}>
                    <div className="anuncio-tag">PUBLICIDADE</div>
                    <div className="anuncio-lateral-conteudo">
                        <p>ANÚNCIO LATERAL</p>
                        <div className="anuncio-button">Clique Aqui</div>
                    </div>
                    {mostrarFechar && (
                        <button className="anuncio-fechar" onClick={() => setFechado(true)}>
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