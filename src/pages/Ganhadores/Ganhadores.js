import React, { useState, useEffect } from "react";
import { supabase } from "../../config/supabaseClient"; // Importando Supabase
import "../../styles/Ganhadores.css"; // Caminho do CSS

function Ganhadores() {
    const [historico, setHistorico] = useState([]);
    const [emailVisivel, setEmailVisivel] = useState(false);
    const [loading, setLoading] = useState(true);
    const [mostrarInstrucoes, setMostrarInstrucoes] = useState(false);

    // 🔄 **Carrega o histórico dos sorteios do Supabase**
    useEffect(() => {
        const fetchHistorico = async () => {
            setLoading(true); // Exibe o carregamento
            const { data, error } = await supabase
                .from("sorteios")
                .select("*")
                .order("data", { ascending: false });

            if (error) {
                console.error("Erro ao carregar histórico:", error);
            } else {
                setHistorico(data);
            }
            setLoading(false); // Esconde o carregamento
        };

        fetchHistorico();
    }, []);

    return (
        <div className="ganhadores-container">
            <h2>🏆 Ganhadores Anteriores</h2>

            {/* Botão para instruções */}
            <button className="como-participar-btn" onClick={() => setMostrarInstrucoes(!mostrarInstrucoes)}>
                {mostrarInstrucoes ? "Fechar Instruções" : "Como Funcionam os Sorteios"}
            </button>

            {mostrarInstrucoes && (
                <div className="instrucoes">
                    <p>📝 Os sorteios acontecem <strong>todos os dias às 21h</strong>.</p>
                    <p>🔄 A lista de participantes é <strong>congelada 10 minutos antes</strong> do sorteio.</p>
                    <p>⏳ O histórico completo de todos os sorteios é mantido nesta página.</p>
                </div>
            )}

            {/* Botão "Fale Conosco" */}
            <button className="fale-conosco" onClick={() => setEmailVisivel(!emailVisivel)}>
                {emailVisivel ? "emaildecontato@contato.com" : "Fale Conosco"}
            </button>

            <div className="banner">🚀 Publicidade 🚀</div>

            {/* Exibe "Carregando..." enquanto busca os dados */}
            {loading ? (
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>🔄 Carregando histórico de sorteios...</p>
                </div>
            ) : historico.length === 0 ? (
                <div className="no-data">
                    <p>Nenhum sorteio realizado até o momento.</p>
                </div>
            ) : (
                <table className="historico-tabela">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>N° Sorteado</th>
                            <th>Nome do Ganhador</th>
                            <th>Streamer Escolhido</th>
                            <th>Lista</th>
                        </tr>
                    </thead>
                    <tbody>
                        {historico.map((sorteio, index) => (
                            <React.Fragment key={sorteio.id || index}>
                                <tr>
                                    <td>{new Date(sorteio.data).toLocaleDateString()}</td>
                                    <td>{sorteio.numero}</td>
                                    <td>{sorteio.nome}</td>
                                    <td>{sorteio.streamer}</td>
                                    <td>
                                        <button onClick={() => alert(`Abrindo lista do sorteio ${new Date(sorteio.data).toLocaleDateString()}`)}>
                                            📜 Ver Lista
                                        </button>
                                    </td>
                                </tr>

                                {/* Adiciona banner de propaganda a cada 5 linhas */}
                                {(index + 1) % 5 === 0 && (
                                    <tr>
                                        <td colSpan="5" className="banner-row">🔥 Anúncio 🔥</td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            )}
            
            <div className="footer-info">
                <p>Todos os sorteios são realizados de forma transparente e automática.</p>
                <p>© {new Date().getFullYear()} Sistema de Sorteio - Todos os direitos reservados</p>
            </div>
        </div>
    );
}

export default Ganhadores;
