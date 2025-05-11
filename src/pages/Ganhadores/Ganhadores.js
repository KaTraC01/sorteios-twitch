import React, { useState, useEffect } from "react";
import { supabase } from "../../config/supabaseClient"; // Importando Supabase
import "../../styles/Ganhadores.css"; // Caminho do CSS
import Anuncio from "../../components/Anuncio"; // Importando o componente de anúncio
import PlataformaIcon from "../../components/PlataformaIcon"; // Importando o componente de ícone

function Ganhadores() {
    const [historico, setHistorico] = useState([]);
    const [emailVisivel, setEmailVisivel] = useState(false);
    const [loading, setLoading] = useState(true);
    const [mostrarInstrucoes, setMostrarInstrucoes] = useState(false);
    const [listaParticipantes, setListaParticipantes] = useState([]);
    const [sorteioSelecionado, setSorteioSelecionado] = useState(null);
    const [loadingLista, setLoadingLista] = useState(false);
    // Estados para controlar a paginação
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [itensPorPagina, setItensPorPagina] = useState(10);

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
        // Verificar se os dados do sorteio estão disponíveis (usando o valor do backend)
        const sorteio = historico.find(s => s.id === sorteioId);
        if (!sorteio || sorteio.dados_disponiveis === false) {
            return; // Não busca participantes se os dados não estiverem disponíveis
        }
        
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

    // Função para retornar o emoji da plataforma - mantido para retrocompatibilidade
    const getPlataformaEmoji = (plataforma) => {
        switch(plataforma) {
            case "youtube":
                return "❤️"; // Coração vermelho para YouTube
            case "steam":
                return "💙"; // Coração azul para Steam
            case "xbox":
                return "💚"; // Coração verde para Xbox
            case "playstation":
                return "🔵"; // Círculo azul para PlayStation
            default:
                return "👾"; // Emoji de game para Twitch como padrão
        }
    };
    
    // Função para alternar a exibição de mais itens (mostrar mais/menos)
    const alternarMostrarMais = () => {
        if (paginaAtual * itensPorPagina >= historico.length) {
            // Se já estamos mostrando todos, voltar para a primeira página
            setPaginaAtual(1);
        } else {
            // Caso contrário, avançar para a próxima página
            setPaginaAtual(paginaAtual + 1);
        }
    };
    
    // Calcular quais sorteios mostrar na página atual
    const historicoPaginado = historico.slice(0, paginaAtual * itensPorPagina);
    
    // Verificar se há mais sorteios para mostrar
    const temMaisSorteios = historico.length > paginaAtual * itensPorPagina;

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
                            <th>N°</th>
                            <th>Ganhador</th>
                            <th>Streamer</th>
                            <th>🎥</th>
                            <th>Lista</th>
                        </tr>
                    </thead>
                    <tbody>
                        {historicoPaginado.map((sorteio, index) => (
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
                                    <td className="coluna-plataforma">
                                        <PlataformaIcon plataforma={sorteio.plataforma_premio || "twitch"} tamanho="pequeno" />
                                    </td>
                                    <td>
                                        {/* Verificar se os dados do sorteio estão disponíveis (usando o campo do backend) */}
                                        {sorteio.dados_disponiveis === false ? (
                                            <button className="botao-bloqueado" disabled>
                                                🔒
                                            </button>
                                        ) : (
                                            <button onClick={() => buscarParticipantesSorteio(sorteio.id, sorteio.data)}>
                                                📜
                                            </button>
                                        )}
                                    </td>
                                </tr>

                                {/* Adiciona anúncios a cada 10 linhas */}
                                {(index + 1) % 10 === 0 && index !== historicoPaginado.length - 1 && (
                                    <tr>
                                        <td colSpan="6" className="banner-row">
                                            <Anuncio 
                                                tipo={index === 9 ? "banner" : ["video", "quadrado", "cursos"][Math.floor(Math.random() * 3)]} 
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
            
            {/* Botão Mostrar Mais/Menos */}
            {historico.length > 10 && (
                <button 
                    className={`botao-mostrar-mais ${!temMaisSorteios ? 'mostrar-menos' : ''}`} 
                    onClick={alternarMostrarMais}
                >
                    {temMaisSorteios ? "Mostrar Mais" : "Mostrar Menos"}
                </button>
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
                                            <th>Nome</th>
                                            <th>Streamer</th>
                                            <th>🎥</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {listaParticipantes.map((participante, index) => (
                                            <tr key={participante.id || index} className={participante.nome_twitch === historico.find(s => s.id === sorteioSelecionado.id)?.nome ? "vencedor-row" : ""}>
                                                <td>{index + 1}</td>
                                                <td>{participante.nome_twitch}</td>
                                                <td>{participante.streamer_escolhido}</td>
                                                <td className="coluna-plataforma">
                                                    <PlataformaIcon plataforma={participante.plataforma_premio || "twitch"} tamanho="pequeno" />
                                                </td>
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
