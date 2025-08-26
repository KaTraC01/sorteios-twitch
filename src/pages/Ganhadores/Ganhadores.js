import React, { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next'; // Importar hook de tradu��o
import { getSupabaseClient } from "../../lib/supabaseManager"; // Importando gerenciador otimizado

// Usar cliente otimizado para opera��es de frontend  
const supabase = getSupabaseClient();
import "../../styles/Ganhadores.css"; // Caminho do CSS
import Anuncio from "../../components/Anuncio"; // Importando o componente de an�ncio
import PlataformaIcon from "../../components/PlataformaIcon"; // Importando o componente de �cone

function Ganhadores() {
    const { t } = useTranslation(); // Hook de tradu��o
    const [historico, setHistorico] = useState([]);
    const [emailVisivel, setEmailVisivel] = useState(false);
    const [loading, setLoading] = useState(true);
    const [mostrarInstrucoes, setMostrarInstrucoes] = useState(false);
    const [listaParticipantes, setListaParticipantes] = useState([]);
    const [sorteioSelecionado, setSorteioSelecionado] = useState(null);
    const [loadingLista, setLoadingLista] = useState(false);
    // Estados para controlar a pagina��o
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [itensPorPagina, setItensPorPagina] = useState(10);
    // Estado para controlar a pagina��o da lista de participantes
    const [paginaParticipantes, setPaginaParticipantes] = useState(1);
    const itensPorPaginaParticipantes = 10; // Constante para quantidade de participantes por p�gina

    // ?? **Carrega o hist�rico dos sorteios do Supabase**
    useEffect(() => {
        const fetchHistorico = async () => {
            setLoading(true); // Exibe o carregamento
            const { data, error } = await supabase
                .from("sorteios")
                .select("*")
                .order("data", { ascending: false });

            if (error) {
                console.error("Erro ao carregar hist�rico:", error);
            } else {
                setHistorico(data);
            }
            setLoading(false); // Esconde o carregamento
        };

        fetchHistorico();
    }, []);

    // Fun��o para buscar a lista de participantes de um sorteio espec�fico
    const buscarParticipantesSorteio = async (sorteioId, sorteioData) => {
        // Verificar se os dados do sorteio est�o dispon�veis (usando o valor do backend)
        const sorteio = historico.find(s => s.id === sorteioId);
        if (!sorteio || sorteio.dados_disponiveis === false) {
            return; // N�o busca participantes se os dados n�o estiverem dispon�veis
        }
        
        setLoadingLista(true);
        setSorteioSelecionado({
            id: sorteioId,
            data: sorteioData
        });
        
        // Resetar a p�gina dos participantes ao abrir um novo modal
        setPaginaParticipantes(1);
        
        const { data, error } = await supabase
            .from("historico_participantes")
            .select("*")
            .eq("sorteio_id", sorteioId)
            .order("posicao_original", { ascending: true }); // Ordenar pela posi��o original em vez de created_at
            
        if (error) {
            console.error("Erro ao buscar participantes do sorteio:", error);
            setListaParticipantes([]);
        } else {
            setListaParticipantes(data || []);
        }
        
        setLoadingLista(false);
    };
    
    // Fun��o para fechar o modal da lista de participantes
    const fecharListaParticipantes = () => {
        setSorteioSelecionado(null);
        setListaParticipantes([]);
        setPaginaParticipantes(1); // Resetar a p�gina quando fechar o modal
    };

    // Fun��o para lidar com cliques no overlay do modal
    const handleModalOverlayClick = (e) => {
        // Verifica se o clique foi diretamente no overlay (n�o em um de seus filhos)
        if (e.target.className === 'modal-overlay') {
            fecharListaParticipantes();
        }
    };

    // Fun��o para alternar a exibi��o de mais participantes no modal
    const alternarMostrarMaisParticipantes = () => {
        if (paginaParticipantes * itensPorPaginaParticipantes >= listaParticipantes.length) {
            // Se j� estamos mostrando todos, voltar para a primeira p�gina
            setPaginaParticipantes(1);
        } else {
            // Caso contr�rio, avan�ar para a pr�xima p�gina
            setPaginaParticipantes(paginaParticipantes + 1);
        }
    };
    
    // Calcular quais participantes mostrar na p�gina atual do modal
    const participantesPaginados = listaParticipantes.slice(0, paginaParticipantes * itensPorPaginaParticipantes);
    
    // Verificar se h� mais participantes para mostrar
    const temMaisParticipantes = listaParticipantes.length > paginaParticipantes * itensPorPaginaParticipantes;

    // Fun��o para retornar o emoji da plataforma - mantido para retrocompatibilidade
    const getPlataformaEmoji = (plataforma) => {
        switch(plataforma) {
            case "youtube":
                return "??"; // Cora��o vermelho para YouTube
            case "steam":
                return "??"; // Cora��o azul para Steam
            case "xbox":
                return "??"; // Cora��o verde para Xbox
            case "playstation":
                return "??"; // C�rculo azul para PlayStation
            default:
                return "??"; // Emoji de game para Twitch como padr�o
        }
    };
    
    // Fun��o para alternar a exibi��o de mais itens (mostrar mais/menos)
    const alternarMostrarMais = () => {
        if (paginaAtual * itensPorPagina >= historico.length) {
            // Se j� estamos mostrando todos, voltar para a primeira p�gina
            setPaginaAtual(1);
        } else {
            // Caso contr�rio, avan�ar para a pr�xima p�gina
            setPaginaAtual(paginaAtual + 1);
        }
    };
    
    // Calcular quais sorteios mostrar na p�gina atual
    const historicoPaginado = historico.slice(0, paginaAtual * itensPorPagina);
    
    // Verificar se h� mais sorteios para mostrar
    const temMaisSorteios = historico.length > paginaAtual * itensPorPagina;

    // Renderizar os participantes com propagandas intercaladas
    const renderizarParticipantesComPropaganda = () => {
        const linhasTabela = [];
        
        participantesPaginados.forEach((participante, index) => {
            // Obter o sorteio atual
            const sorteioAtual = historico.find(s => s.id === sorteioSelecionado.id);
            // Verificar se este participante � o vencedor
            const isVencedor = participante.nome_twitch === sorteioAtual?.nome;
            
            // Adicionar o participante
            linhasTabela.push(
                <tr key={participante.id || index} className={isVencedor ? "vencedor-row" : ""}>
                    <td>{participante.posicao_original || index + 1}</td>
                    <td>{participante.nome_twitch}</td>
                    <td>{participante.streamer_escolhido}</td>
                    <td className="coluna-plataforma">
                        <PlataformaIcon plataforma={participante.plataforma_premio || "twitch"} tamanho="pequeno" />
                    </td>
                </tr>
            );
            
            // Adicionar an�ncio espec�fico entre as linhas 10 e 11
            if (index === 9) {
                linhasTabela.push(
                    <tr key="propaganda-linha-10-11" className="linha-propaganda">
                        <td colSpan="4" className="banner-row">
                            <Anuncio 
                                tipo="cursos" 
                                posicao="na-tabela" 
                                mostrarFechar={true} 
                                preservarLayout={false}
                                paginaId={`ganhadores_participantes_linha-10`}
                            />
                        </td>
                    </tr>
                );
            }
            // A cada 10 participantes adicionais (ap�s a linha 11), adicionar uma linha de propaganda do tipo cursos
            else if ((index + 1) % 10 === 0 && index !== 9 && index !== participantesPaginados.length - 1) {
                linhasTabela.push(
                    <tr key={`propaganda-${index}`} className="linha-propaganda">
                        <td colSpan="4" className="banner-row">
                            <Anuncio 
                                tipo="cursos" 
                                posicao="na-tabela" 
                                mostrarFechar={true} 
                                preservarLayout={false}
                                paginaId={`ganhadores_participantes_linha-${index + 1}`}
                            />
                        </td>
                    </tr>
                );
            }
        });
        
        return linhasTabela;
    };

    return (
        <div className="ganhadores-container">
            {/* Banner superior - exibido sempre no topo, ap�s o cabe�alho */}
            <div className="anuncio-container-superior">
                <Anuncio 
                    tipo="fixo-superior" 
                    posicao="topo" 
                    mostrarFechar={true} 
                    preservarLayout={true}
                    paginaId="ganhadores_topo" 
                />
            </div>
            
            {/* Espa�amento adicionado naturalmente pela margin-bottom do anuncio-container-superior */}
            
            <h2>{t('ganhadores.title')}</h2>

            {/* Bot�o para instru��es */}
            <button className="como-participar-btn" onClick={() => setMostrarInstrucoes(!mostrarInstrucoes)}>
                {mostrarInstrucoes ? t('ganhadores.fecharInstrucoes') : t('ganhadores.listaGanhadores')}
            </button>

            {mostrarInstrucoes && (
                <div className="instrucoes">
                    <p>{t('ganhadores.instrucoes.info1')}</p>
                    <p>{t('ganhadores.instrucoes.info2')}</p>
                </div>
            )}

            {/* Bot�o "Fale Conosco" */}
            <button className="fale-conosco" onClick={() => setEmailVisivel(!emailVisivel)}>
                {emailVisivel ? "contact@subgg.com" : t('ganhadores.faleConosco')}
            </button>

            {/* An�ncio de cursos no topo da tabela */}
            <Anuncio 
                tipo="cursos" 
                posicao="principal" 
                mostrarFechar={true} 
                preservarLayout={true}
                paginaId="ganhadores_principal" 
            />

            {/* Exibe "Carregando..." enquanto busca os dados */}
            {loading ? (
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>{t('ganhadores.carregando')}</p>
                </div>
            ) : historico.length === 0 ? (
                <div className="no-data">
                    <p>{t('ganhadores.nenhumSorteio')}</p>
                </div>
            ) : (
                <table className="historico-tabela">
                    <thead>
                        <tr>
                            <th>{t('ganhadores.tabela.data')}</th>
                            <th>{t('ganhadores.tabela.numero')}</th>
                            <th>{t('ganhadores.tabela.ganhador')}</th>
                            <th>{t('ganhadores.tabela.streamer')}</th>
                            <th>{t('ganhadores.tabela.plataforma')}</th>
                            <th>{t('ganhadores.tabela.lista')}</th>
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
                                        year: '2-digit'
                                    })}</td>
                                    <td>{sorteio.numero || '-'}</td>
                                    <td>{sorteio.nome}</td>
                                    <td>{sorteio.streamer}</td>
                                    <td>
                                        <PlataformaIcon plataforma={sorteio.plataforma_premio || "twitch"} tamanho="pequeno" />
                                    </td>
                                    <td>
                                        {sorteio.dados_disponiveis !== false && (
                                            <button 
                                                className="ver-lista-btn" 
                                                onClick={() => buscarParticipantesSorteio(sorteio.id, sorteio.data)}
                                            >
                                                ??
                                            </button>
                                        )}
                                    </td>
                                </tr>
                                {/* Adiciona an�ncios do tipo cursos a cada 10 linhas */}
                                {(index + 1) % 10 === 0 && index !== historicoPaginado.length - 1 && (
                                    <tr className="linha-propaganda">
                                        <td colSpan="6" className="banner-row">
                                            <Anuncio 
                                                tipo="cursos" 
                                                posicao="na-tabela" 
                                                mostrarFechar={true} 
                                                preservarLayout={false}
                                                paginaId={`ganhadores_historico_linha-${index + 1}`}
                                            />
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            )}
            
            {/* Bot�o "Mostrar Mais" */}
            {!loading && historico.length > itensPorPagina && (
                <button 
                    className={`botao-mostrar-mais ${!temMaisSorteios ? 'mostrar-menos' : ''}`} 
                    onClick={alternarMostrarMais}
                >
                    {temMaisSorteios ? t('ganhadores.mostrarMais') : t('ganhadores.mostrarMenos')}
                </button>
            )}
            
            {/* Modal para exibir a lista de participantes */}
            {sorteioSelecionado && (
                <div className="modal-overlay" onClick={handleModalOverlayClick}>
                    <div className="modal-content">
                        <h3>{t('ganhadores.listaParticipantes')}</h3>
                        <p>
                            {new Date(sorteioSelecionado.data).toLocaleDateString('pt-BR', {
                                timeZone: 'America/Sao_Paulo',
                                day: '2-digit',
                                month: '2-digit',
                                year: '2-digit'
                            })}
                        </p>
                        
                        <button className="fechar-modal-btn" onClick={fecharListaParticipantes}>
                            {t('ganhadores.fecharLista')}
                        </button>
                        
                        {loadingLista ? (
                            <div className="loading-container">
                                <div className="loading-spinner"></div>
                                <p>{t('ganhadores.carregandoLista')}</p>
                            </div>
                        ) : listaParticipantes.length === 0 ? (
                            <div className="no-data">
                                <p>{t('ganhadores.nenhumParticipante')}</p>
                            </div>
                        ) : (
                            <>
                                <table className="participantes-tabela">
                                    <thead>
                                        <tr>
                                            <th>N�</th>
                                            <th>{t('listaSorteio.nome')}</th>
                                            <th>{t('listaSorteio.streamer')}</th>
                                            <th>??</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {renderizarParticipantesComPropaganda()}
                                    </tbody>
                                </table>
                                
                                {/* Bot�o "Mostrar Mais" para participantes */}
                                {listaParticipantes.length > itensPorPaginaParticipantes && (
                                    <button 
                                        className={`botao-mostrar-mais ${!temMaisParticipantes ? 'mostrar-menos' : ''}`} 
                                        onClick={alternarMostrarMaisParticipantes}
                                    >
                                        {temMaisParticipantes ? t('ganhadores.mostrarMais') : t('ganhadores.mostrarMenos')}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
            
            {/* An�ncio de v�deo no final da p�gina */}
            <Anuncio 
                tipo="video" 
                posicao="rodape" 
                mostrarFechar={true} 
                preservarLayout={true}
                paginaId="ganhadores_rodape" 
            />
            
            <div className="footer-info">
                <p>Todos os sorteios s�o realizados de forma transparente e autom�tica.</p>
                <p>� {new Date().getFullYear()} Sistema de Sorteio - Todos os direitos reservados</p>
            </div>
        </div>
    );
}

export default Ganhadores;
