import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Header from "./components/Header";
import Timer from "./components/Timer";
import ListaSorteio from "./components/ListaSorteio";
import Ganhadores from "./pages/Ganhadores/Ganhadores"; // Caminho corrigido
import Anuncio from "./components/Anuncio"; // Importando o componente de anúncio

function App() {
    // Estado para controlar quando a lista for reiniciada
    const [listaReiniciada, setListaReiniciada] = useState(false);
    // Estado para controlar se os anúncios laterais foram fechados
    const [adsVisible, setAdsVisible] = useState({
        esquerdaTopo: true,
        esquerdaBaixo: true,
        direitaTopo: true,
        direitaBaixo: true,
        fixoInferior: true
    });

    // Função para resetar a lista e notificar o Timer
    const handleReiniciarLista = () => {
        setListaReiniciada(true);
        setTimeout(() => setListaReiniciada(false), 1000); // Reseta o estado após 1 segundo
    };

    // Função para fechar um anúncio lateral
    const fecharAnuncio = (posicao) => {
        setAdsVisible(prev => ({
            ...prev,
            [posicao]: false
        }));
        
        // Configurar timer para reaparecer em 30 segundos
        setTimeout(() => {
            setAdsVisible(prev => ({
                ...prev,
                [posicao]: true
            }));
        }, 30000); // 30 segundos
    };

    return (
        <Router>
            <div className="conteudo-com-laterais">
                {/* Anúncios laterais personalizados à esquerda */}
                <div className="coluna-lateral esquerda">
                    {adsVisible.esquerdaTopo && (
                        <div className="anuncio-lateral esquerda" style={{ top: "120px", minHeight: "200px" }}>
                            <button className="anuncio-fechar" onClick={() => fecharAnuncio('esquerdaTopo')}>✖</button>
                            <div className="anuncio-tag">PUBLICIDADE</div>
                            <div className="anuncio-lateral-conteudo">
                                <p>ANÚNCIO TOP</p>
                                <button className="anuncio-button">Clique Aqui</button>
                            </div>
                        </div>
                    )}
                    
                    {adsVisible.esquerdaBaixo && (
                        <div className="anuncio-lateral esquerda" style={{ top: "340px", minHeight: "200px" }}>
                            <button className="anuncio-fechar" onClick={() => fecharAnuncio('esquerdaBaixo')}>✖</button>
                            <div className="anuncio-tag">PUBLICIDADE</div>
                            <div className="anuncio-lateral-conteudo">
                                <p>ANÚNCIO INFERIOR</p>
                                <button className="anuncio-button">Clique Aqui</button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="area-central">
                    {/* Cabeçalho fixo */}
                    <Header />

                    {/* Timer fixo abaixo do cabeçalho */}
                    <Timer listaReiniciada={listaReiniciada} />
                    
                    <main style={{ 
                        marginTop: "120px", /* Aumentando para acomodar o header e o timer */
                        padding: "20px", 
                        textAlign: "center", 
                        backgroundColor: "#0a0a0a", 
                        color: "white",
                        minHeight: "calc(100vh - 120px)" 
                    }}>
                        <Routes>
                            {/* Rota para a Lista de Sorteios */}
                            <Route path="/" element={
                                <>
                                    <h1>Site de Sorteios</h1>
                                    <p>Bem-vindo ao site de sorteios! 🚀</p>
                                    <ListaSorteio onReiniciarLista={handleReiniciarLista} />
                                </>
                            } />

                            {/* Rota para a página de Ganhadores */}
                            <Route path="/ganhadores" element={<Ganhadores />} />
                        </Routes>
                    </main>
                </div>

                {/* Anúncios laterais personalizados à direita */}
                <div className="coluna-lateral direita">
                    {adsVisible.direitaTopo && (
                        <div className="anuncio-lateral direita" style={{ top: "120px", minHeight: "200px" }}>
                            <button className="anuncio-fechar" onClick={() => fecharAnuncio('direitaTopo')}>✖</button>
                            <div className="anuncio-tag">PUBLICIDADE</div>
                            <div className="anuncio-lateral-conteudo">
                                <p>ANÚNCIO TOP</p>
                                <button className="anuncio-button">Clique Aqui</button>
                            </div>
                        </div>
                    )}
                    
                    {adsVisible.direitaBaixo && (
                        <div className="anuncio-lateral direita" style={{ top: "340px", minHeight: "200px" }}>
                            <button className="anuncio-fechar" onClick={() => fecharAnuncio('direitaBaixo')}>✖</button>
                            <div className="anuncio-tag">PUBLICIDADE</div>
                            <div className="anuncio-lateral-conteudo">
                                <p>ANÚNCIO INFERIOR</p>
                                <button className="anuncio-button">Clique Aqui</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Anúncio fixo na parte inferior da tela */}
                {adsVisible.fixoInferior && (
                    <Anuncio tipo="fixo-inferior" posicao="fixo" mostrarFechar={true} />
                )}
                
                {/* Substituir o anúncio padrão pelo nosso personalizado quando fechado */}
                {!adsVisible.fixoInferior && (
                    <div className="anuncio-fixo-botao" onClick={() => fecharAnuncio('fixoInferior')}>
                        Mostrar publicidade
                    </div>
                )}
            </div>
        </Router>
    );
}

export default App;
