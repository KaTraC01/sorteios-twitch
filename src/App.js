import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { useTranslation } from 'react-i18next'; // Importar hook de tradução
import Header from "./components/Header";
import Timer from "./components/Timer";
import ListaSorteio from "./components/ListaSorteio";
import Ganhadores from "./pages/Ganhadores/Ganhadores"; // Caminho corrigido
import RelatorioAnuncios from "./pages/RelatorioAnuncios"; // Nova página de relatórios
import Anuncio from "./components/Anuncio"; // Importando o componente de anúncio

function App() {
    const { t } = useTranslation(); // Hook de tradução
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
                            onFechar={() => fecharAnuncio('esquerda')}
                            paginaId={`app_lateral_esquerda`}
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
                        padding: "20px 0", /* Removendo padding horizontal para maximizar espaço */
                        textAlign: "center", 
                        backgroundColor: "#0a0a0a", 
                        color: "white",
                        minHeight: "calc(100vh - 120px)",
                        width: "100%", /* Garantindo largura máxima */
                        maxWidth: "100%", /* Garantindo que não haja limitação máxima */
                        margin: "0", /* Removendo margens horizontais */
                        boxSizing: "border-box" /* Garantindo que padding não afete a largura */
                    }}>
                        <Routes>
                            {/* Rota para a Lista de Sorteios */}
                            <Route path="/" element={
                                <>
                                    <h1>{t('home.title')}</h1>
                                    <p>{t('home.welcome')}</p>
                                    <ListaSorteio onReiniciarLista={handleReiniciarLista} />
                                </>
                            } />

                            {/* Rota para a página de Ganhadores */}
                            <Route path="/ganhadores" element={<Ganhadores />} />
                            
                            {/* Rota para a página de Relatórios de Anúncios */}
                            <Route path="/relatorio-anuncios" element={<RelatorioAnuncios />} />
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
                            onFechar={() => fecharAnuncio('direita')}
                            paginaId={`app_lateral_direita`}
                        />
                    )}
                </div>

                {/* Anúncio fixo inferior */}
                {adsVisible.fixoInferior && (
                    <Anuncio 
                        tipo="fixo-inferior" 
                        posicao="fixo" 
                        mostrarFechar={true} 
                        onFechar={() => fecharAnuncio('fixoInferior')}
                        paginaId={`app_fixo_inferior`}
                    />
                )}
                
                {!adsVisible.fixoInferior && (
                    <div className="anuncio-fixo-botao" onClick={() => setAdsVisible(prev => ({ ...prev, fixoInferior: true }))}>
                        {t('anuncio.mostrarPublicidade')}
                    </div>
                )}
            </div>
        </Router>
    );
}

export default App;

//test
