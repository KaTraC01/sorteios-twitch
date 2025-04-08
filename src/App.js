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
        esquerda: true,
        direita: true,
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
                {/* Anúncio lateral esquerdo */}
                <div className="coluna-lateral esquerda">
                    {adsVisible.esquerda && (
                        <Anuncio 
                            tipo="lateral" 
                            posicao="esquerda" 
                            mostrarFechar={true}
                            mostrarPresente={true}
                            urlDestino="https://twitch.tv"
                            titulo="Sorteios Twitch"
                            descricao="Participe agora!"
                        />
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

                {/* Anúncio lateral direito */}
                <div className="coluna-lateral direita">
                    {adsVisible.direita && (
                        <Anuncio 
                            tipo="lateral" 
                            posicao="direita" 
                            mostrarFechar={true}
                            mostrarPresente={true}
                            urlDestino="https://twitch.tv"
                            titulo="Sorteios Twitch"
                            descricao="Participe agora!"
                        />
                    )}
                </div>

                {/* Anúncio fixo inferior */}
                {adsVisible.fixoInferior && (
                    <Anuncio 
                        tipo="fixo-bottom" 
                        mostrarFechar={true} 
                        mostrarPresente={true}
                        urlDestino="https://twitch.tv"
                        titulo="Sorteios Diários!"
                        descricao="Ganhe prêmios participando dos sorteios"
                    />
                )}
                
                {!adsVisible.fixoInferior && (
                    <div className="anuncio-fixo-botao" onClick={() => setAdsVisible(prev => ({ ...prev, fixoInferior: true }))}>
                        Mostrar publicidade
                    </div>
                )}
            </div>
        </Router>
    );
}

export default App;

//test
