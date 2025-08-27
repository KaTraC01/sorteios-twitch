import React, { useState, useEffect, Suspense, lazy } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { useTranslation } from 'react-i18next'; // Importar hook de tradução
import Header from "./components/Header";
import Timer from "./components/Timer";
import ListaSorteio from "./components/ListaSorteio";
import Anuncio from "./components/Anuncio"; // Importando o componente de anúncio

// ✅ MELHORIA: Lazy loading de páginas não críticas
// ✅ PRESERVA: Componentes principais carregados normalmente para não afetar métricas
const Ganhadores = lazy(() => import("./pages/Ganhadores/Ganhadores"));
const RelatorioAnuncios = lazy(() => import("./pages/RelatorioAnuncios"));

// Componente de loading personalizado
const LoadingComponent = ({ text = "Carregando..." }) => (
    <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '200px',
        color: 'white',
        fontSize: '18px',
        backgroundColor: '#0a0a0a'
    }}>
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
        }}>
            <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid #6441a5',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
            }}></div>
            {text}
        </div>
        <style jsx>{`
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `}</style>
    </div>
);

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

    // Efeito para lidar com o anúncio fixo-inferior
    useEffect(() => {
        // Só mostrar o anúncio se estiver visível
        if (!adsVisible.fixoInferior) return;
        
        // Ajustar o padding do body para acomodar o anúncio fixo-inferior
        document.body.style.paddingBottom = window.innerWidth <= 970 ? '70px' : '90px';
        
        return () => {
            document.body.style.paddingBottom = '0';
        };
    }, [adsVisible.fixoInferior]);

    // Efeito para atualizar o padding quando a janela for redimensionada
    useEffect(() => {
        if (!adsVisible.fixoInferior) return;
        
        const atualizarPadding = () => {
            document.body.style.paddingBottom = window.innerWidth <= 970 ? '70px' : '90px';
        };
        
        window.addEventListener('resize', atualizarPadding);
        
        return () => {
            window.removeEventListener('resize', atualizarPadding);
        };
    }, [adsVisible.fixoInferior]);

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

                            {/* ✅ MELHORIA: Rotas com lazy loading e fallback */}
                            <Route path="/ganhadores" element={
                                <Suspense fallback={<LoadingComponent text="Carregando histórico de ganhadores..." />}>
                                    <Ganhadores />
                                </Suspense>
                            } />
                            
                            <Route path="/relatorio-anuncios" element={
                                <Suspense fallback={<LoadingComponent text="Carregando relatórios de anúncios..." />}>
                                    <RelatorioAnuncios />
                                </Suspense>
                            } />
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
