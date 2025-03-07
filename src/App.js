import React, { useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Header from "./components/Header";
import Timer from "./components/Timer";
import ListaSorteio from "./components/ListaSorteio";
import Ganhadores from "./pages/Ganhadores/Ganhadores"; // Caminho corrigido

function App() {
    // Estado para controlar quando a lista for reiniciada
    const [listaReiniciada, setListaReiniciada] = useState(false);

    // Função para resetar a lista e notificar o Timer
    const handleReiniciarLista = () => {
        setListaReiniciada(true);
        setTimeout(() => setListaReiniciada(false), 1000); // Reseta o estado após 1 segundo
    };

    return (
        <Router>
            <div>
                {/* Cabeçalho fixo */}
                <Header />

                {/* Timer fixo abaixo do cabeçalho */}
                <Timer listaReiniciada={listaReiniciada} />

                <main style={{ 
                    marginTop: "100px", 
                    padding: "20px", 
                    textAlign: "center", 
                    backgroundColor: "#0a0a0a", 
                    color: "white",
                    minHeight: "calc(100vh - 100px)" 
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
        </Router>
    );
}

export default App;
