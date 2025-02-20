import React, { useState, useEffect } from "react";
import { supabase } from "../../config/supabaseClient"; // Importando Supabase
import "../../styles/Ganhadores.css"; // Caminho do CSS

function Ganhadores() {
    const [historico, setHistorico] = useState([]);
    const [emailVisivel, setEmailVisivel] = useState(false);
    const [loading, setLoading] = useState(true);

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
            <h2>Ganhadores Anteriores</h2>

            {/* Botão "Fale Conosco" */}
            <button className="fale-conosco" onClick={() => setEmailVisivel(!emailVisivel)}>
                {emailVisivel ? "emaildecontato@contato.com" : "Fale Conosco"}
            </button>

            <div className="banner">🚀 Publicidade 🚀</div>

            {/* Exibe "Carregando..." enquanto busca os dados */}
            {loading ? (
                <p>🔄 Carregando sorteios...</p>
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
                            <React.Fragment key={sorteio.id}>
                                <tr>
                                    <td>{new Date(sorteio.data).toLocaleDateString()}</td>
                                    <td>{sorteio.numero}</td>
                                    <td>{sorteio.nome}</td>
                                    <td>{sorteio.streamer}</td>
                                    <td>
                                        <button onClick={() => alert(`Abrindo lista do sorteio ${sorteio.data}`)}>
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
        </div>
    );
}

export default Ganhadores;
