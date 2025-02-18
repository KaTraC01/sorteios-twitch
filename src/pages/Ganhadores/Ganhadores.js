import React, { useState, useEffect } from "react";
import "../../styles/Ganhadores.css"; // Caminho corrigido para importar o CSS

function Ganhadores() {
    const [historico, setHistorico] = useState([]);
    const [emailVisivel, setEmailVisivel] = useState(false);

    // Carrega o histórico dos sorteios do arquivo JSON
    useEffect(() => {
        fetch("/historico.json")
            .then((res) => res.json())
            .then((data) => setHistorico(data.sort((a, b) => new Date(b.data) - new Date(a.data))))
            .catch((error) => console.error("Erro ao carregar histórico:", error));
    }, []);

    return (
        <div className="ganhadores-container">
            {/* Cabeçalho da Página */}
            <h2>Ganhadores Anteriores</h2>

            {/* Botão "Fale Conosco" */}
            <button className="fale-conosco" onClick={() => setEmailVisivel(!emailVisivel)}>
                {emailVisivel ? "emaildecontato@contato.com" : "Fale Conosco"}
            </button>

            {/* Banner de propaganda */}
            <div className="banner">🚀 Publicidade 🚀</div>

            {/* Tabela com histórico */}
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
                                <td>{sorteio.data}</td>
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
        </div>
    );
}

export default Ganhadores;
