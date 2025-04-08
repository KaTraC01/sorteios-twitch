import React, { useState, useEffect } from "react";
import { supabase } from "../../config/supabaseClient"; // Importando Supabase
import "../../styles/Ganhadores.css"; // Caminho do CSS
import Anuncio from "../../components/Anuncio"; // Importando o componente de anúncio

function Ganhadores() {
    const [historico, setHistorico] = useState([]);
    const [emailVisivel, setEmailVisivel] = useState(false);
    const [loading, setLoading] = useState(true);
    const [mostrarInstrucoes, setMostrarInstrucoes] = useState(false);
    const [listaParticipantes, setListaParticipantes] = useState([]);
    const [sorteioSelecionado, setSorteioSelecionado] = useState(null);
    const [loadingLista, setLoadingLista] = useState(false);

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

    // Função para buscar a lista de participantes de um sorteio específico
    const buscarParticipantesSorteio = async (sorteioId, sorteioData) => {
        setLoadingLista(true);
        setSorteioSelecionado({
            id: sorteioId,
            data: sorteioData
        });
        
        const { data, error } = await supabase
            .from("historico_participantes")
            .select("*")
            .eq("sorteio_id", sorteioId)
            .order("created_at", { ascending: true });
            
        if (error) {
            console.error("Erro ao buscar participantes do sorteio:", error);
            setListaParticipantes([]);
        } else {
            setListaParticipantes(data || []);
        }
        
        setLoadingLista(false);
    };
    
    // Função para fechar o modal da lista de participantes
    const fecharListaParticipantes = () => {
        setSorteioSelecionado(null);
        setListaParticipantes([]);
    };

    return (
        <div className="ganhadores-container">
            {/* Banner superior da SuperBet */}
            <Anuncio tipo="banner" posicao="topo" mostrarFechar={true} />

            <h2>🏆 Ganhadores Anteriores</h2>

            {/* Botão para instruções */}
            <button className="como-participar-btn" onClick={() => setMostrarInstrucoes(!mostrarInstrucoes)}>
                {mostrarInstrucoes ? "Fechar Instruções" : "Como Funcionam os Sorteios"}
            </button>

            {mostrarInstrucoes && (
                <div className="instrucoes">
                    
                    <p>• O histórico completo dos sorteios mais recentes é mantido nesta página.</p>
                    <p>• O histórico completo dos sorteios mais recentes é mantido nesta página.</p>
                </div>
            )}

            {/* Botão "Fale Conosco" */}
            <button className="fale-conosco" onClick={() => setEmailVisivel(!emailVisivel)}>
                {emailVisivel ? "emaildecontato@contato.com" : "Fale Conosco"}
            </button>

            {/* Anúncio de cursos no topo da tabela */}
            <Anuncio tipo="cursos" posicao="principal" mostrarFechar={true} />

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
                                    <td>{new Date(sorteio.data).toLocaleDateString('pt-BR', {
                                        timeZone: 'America/Sao_Paulo',
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric'
                                    })}</td>
                                    <td>{sorteio.numero}</td>
                                    <td>{sorteio.nome}</td>
                                    <td>{sorteio.streamer}</td>
                                    <td>
                                        <button onClick={() => buscarParticipantesSorteio(sorteio.id, sorteio.data)}>
                                            📜 Ver Lista
                                        </button>
                                    </td>
                                </tr>

                                {/* Adiciona anúncios a cada 5 linhas */}
                                {(index + 1) % 5 === 0 && (
                                    <tr>
                                        <td colSpan="5" className="banner-row">
                                            <Anuncio 
                                                tipo={(index % 2 === 0) ? "video" : "quadrado"} 
                                                posicao="na-tabela" 
                                                mostrarFechar={true} 
                                            />
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            )}
            
            {/* Modal para exibir a lista de participantes */}
            {sorteioSelecionado && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Lista de Participantes - Sorteio {new Date(sorteioSelecionado.data).toLocaleDateString('pt-BR', {
                                timeZone: 'America/Sao_Paulo',
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                            })}</h3>
                            <button className="fechar-modal" onClick={fecharListaParticipantes}>×</button>
                        </div>
                        
                        {/* Anúncio dentro do modal */}
                        <Anuncio tipo="quadrado" posicao="topo" mostrarFechar={true} />
                        
                        {loadingLista ? (
                            <div className="loading-container">
                                <div className="loading-spinner"></div>
                                <p>Carregando lista de participantes...</p>
                            </div>
                        ) : listaParticipantes.length === 0 ? (
                            <div className="no-data">
                                <p>Nenhum registro de participantes encontrado para este sorteio.</p>
                            </div>
                        ) : (
                            <div className="lista-participantes-container">
                                <p className="total-participantes">Total de participantes: {listaParticipantes.length}</p>
                                <table className="participantes-tabela">
                                    <thead>
                                        <tr>
                                            <th>Nº</th>
                                            <th>Nome Twitch</th>
                                            <th>Streamer Escolhido</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {listaParticipantes.map((participante, index) => (
                                            <tr key={participante.id || index} className={participante.nome_twitch === historico.find(s => s.id === sorteioSelecionado.id)?.nome ? "vencedor-row" : ""}>
                                                <td>{index + 1}</td>
                                                <td>{participante.nome_twitch}</td>
                                                <td>{participante.streamer_escolhido}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* Anúncio de vídeo no final da página */}
            <Anuncio tipo="video" posicao="rodape" mostrarFechar={true} />
            
            <div className="footer-info">
                <p>Todos os sorteios são realizados de forma transparente e automática.</p>
                <p>© {new Date().getFullYear()} Sistema de Sorteio - Todos os direitos reservados</p>
            </div>
        </div>
    );
}

export default Ganhadores;
