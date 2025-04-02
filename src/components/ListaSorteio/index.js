import React, { useState, useEffect } from "react";
import { supabase } from "../../config/supabaseClient"; // Importando Supabase
import "./ListaSorteio.css"; // Importando o CSS
import Anuncio from "../Anuncio"; // Importando o componente de anúncio

function ListaSorteio({ onReiniciarLista }) {
    const [participantes, setParticipantes] = useState([]);
    const [novoParticipante, setNovoParticipante] = useState({ nome: "", streamer: "" });
    const [tempoEspera, setTempoEspera] = useState(0);
    const [listaCongelada, setListaCongelada] = useState(false);
    const [sorteioRealizado, setSorteioRealizado] = useState(false);
    const [ultimoVencedor, setUltimoVencedor] = useState(null);
    const [mostrarInstrucoes, setMostrarInstrucoes] = useState(false);
    const [feedback, setFeedback] = useState({ mensagem: "", tipo: "", visivel: false });
    const [ultimaAtualizacao, setUltimaAtualizacao] = useState(Date.now());
    // Estados para controlar a paginação
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [itensPorPagina, setItensPorPagina] = useState(10);

    // Função para verificar o tempo de espera baseado na expiração
    const verificarTempoEspera = () => {
        const tempoExpiracao = localStorage.getItem("tempoExpiracao");
        if (tempoExpiracao) {
            const agora = Date.now();
            const expiracao = parseInt(tempoExpiracao);
            
            if (agora >= expiracao) {
                // Tempo já expirou
                localStorage.removeItem("tempoExpiracao");
                setTempoEspera(0);
            } else {
                // Ainda tem tempo restante
                const segundosRestantes = Math.ceil((expiracao - agora) / 1000);
                setTempoEspera(segundosRestantes);
            }
        } else {
            setTempoEspera(0);
        }
    };

    // 🔄 **Função para buscar participantes no Supabase**
    const fetchParticipantes = async () => {
        const { data, error } = await supabase
            .from("participantes_ativos")
            .select("*")
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Erro ao buscar participantes:", error);
        } else {
            console.log("Participantes recebidos:", data);
            setParticipantes(data);
        }
    };

    // 🏆 **Função para buscar o último vencedor do Supabase**
    const fetchUltimoVencedor = async () => {
        const { data, error } = await supabase
            .from("sorteios")
            .select("*")
            .order("data", { ascending: false })
            .limit(1);

        if (error) {
            console.error("Erro ao buscar último vencedor:", error);
        } else if (data && data.length > 0) {
            const vencedor = data[0];
            setUltimoVencedor({
                nome: vencedor.nome,
                streamer: vencedor.streamer,
                numero: vencedor.numero,
                data: new Date(vencedor.data).toLocaleDateString('pt-BR')
            });
            
            // Salva no localStorage também como backup
            localStorage.setItem("ultimoVencedor", JSON.stringify({
                nome: vencedor.nome,
                streamer: vencedor.streamer,
                numero: vencedor.numero,
                data: new Date(vencedor.data).toLocaleDateString('pt-BR')
            }));
        }
    };

    // 🔒 **Função para verificar se a lista está congelada**
    const verificarListaCongelada = async () => {
        const { data, error } = await supabase
            .from("configuracoes")
            .select("*")
            .eq("chave", "lista_congelada")
            .single();

        if (error) {
            console.error("Erro ao verificar estado da lista:", error);
        } else if (data) {
            setListaCongelada(data.valor === "true");
        }
    };

    // 🔄 **Carrega os dados iniciais e configura atualizações em tempo real com Supabase Realtime**
    useEffect(() => {
        // Verificar se há um último vencedor no localStorage
        const vencedorSalvo = localStorage.getItem("ultimoVencedor");
        if (vencedorSalvo && !ultimoVencedor) {
            setUltimoVencedor(JSON.parse(vencedorSalvo));
        }
        
        // Carregar dados iniciais
        fetchParticipantes();
        fetchUltimoVencedor();
        verificarListaCongelada();
        
        // Configurar canais Realtime para atualizações em tempo real
        
        // 1. Canal para participantes
        const participantesChannel = supabase
            .channel('public:participantes_ativos')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'participantes_ativos' }, 
                (payload) => {
                    console.log('Alteração em participantes detectada:', payload);
                    // Atualiza a lista completa para garantir a ordenação correta
                    fetchParticipantes();
                }
            )
            .subscribe((status) => {
                console.log('Status do canal participantes:', status);
            });
            
        // 2. Canal para sorteios (último vencedor)
        const sorteiosChannel = supabase
            .channel('public:sorteios')
            .on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'sorteios' }, 
                (payload) => {
                    console.log('Novo sorteio detectado:', payload);
                    fetchUltimoVencedor();
                }
            )
            .subscribe((status) => {
                console.log('Status do canal sorteios:', status);
            });
            
        // 3. Canal para configurações (lista congelada)
        const configChannel = supabase
            .channel('public:configuracoes')
            .on('postgres_changes', 
                { event: 'UPDATE', schema: 'public', table: 'configuracoes' }, 
                (payload) => {
                    console.log('Configuração atualizada:', payload);
                    verificarListaCongelada();
                }
            )
            .subscribe((status) => {
                console.log('Status do canal configurações:', status);
            });

        // Limpeza ao desmontar o componente
        return () => {
            // Remover todos os canais de atualização em tempo real
            supabase.removeChannel(participantesChannel);
            supabase.removeChannel(sorteiosChannel);
            supabase.removeChannel(configChannel);
        };
    }, []);

    // ⏳ **Atualiza o temporizador de espera**
    useEffect(() => {
        // Verifica o tempo restante ao iniciar o componente
        verificarTempoEspera();
        
        // Atualiza o tempo a cada segundo
        const timer = setInterval(() => {
            verificarTempoEspera();
        }, 1000);
        
        return () => clearInterval(timer);
    }, []);

    // 🎲 **Função para realizar o sorteio - Mantida apenas para uso manual pela interface administrativa**
    const realizarSorteio = async () => {
        if (participantes.length === 0) {
            mostrarFeedback("Nenhum participante na lista. O sorteio foi cancelado.", "erro");
            return;
        }

        const vencedorIndex = Math.floor(Math.random() * participantes.length);
        const vencedor = participantes[vencedorIndex];
        
        // Obter a data atual no formato correto
        const dataAtual = new Date();
        const dataFormatada = dataAtual.toLocaleDateString('pt-BR');
        
        const dadosVencedor = {
            nome: vencedor.nome_twitch,
            streamer: vencedor.streamer_escolhido,
            numero: vencedorIndex + 1,
            data: dataFormatada
        };
        
        // Atualiza o estado e salva no localStorage
        setUltimoVencedor(dadosVencedor);
        localStorage.setItem("ultimoVencedor", JSON.stringify(dadosVencedor));

        setSorteioRealizado(true);

        // Ajustar a data para o fuso horário local antes de salvar
        const dataHoraBrasil = new Date();
        // Garantir que a data seja salva com o fuso horário correto
        const dataISO = new Date(
            dataHoraBrasil.getFullYear(),
            dataHoraBrasil.getMonth(),
            dataHoraBrasil.getDate(),
            21, // Hora do sorteio (21h)
            0,  // Minutos
            0   // Segundos
        ).toISOString();

        try {
            // 🔹 **Salva o resultado do sorteio no Supabase**
            const { data: sorteioSalvo, error: erroSorteio } = await supabase.from("sorteios").insert([
                {
                    data: dataISO,
                    numero: vencedorIndex + 1,
                    nome: vencedor.nome_twitch,
                    streamer: vencedor.streamer_escolhido,
                },
            ]).select();

            if (erroSorteio) {
                console.error("Erro ao salvar o sorteio:", erroSorteio);
                return;
            }

            // 🔹 **Salva a lista completa de participantes no histórico**
            if (sorteioSalvo && sorteioSalvo.length > 0) {
                const sorteioId = sorteioSalvo[0].id;
                
                // Prepara os dados dos participantes para inserção no histórico
                const participantesHistorico = participantes.map(participante => ({
                    sorteio_id: sorteioId,
                    nome_twitch: participante.nome_twitch,
                    streamer_escolhido: participante.streamer_escolhido
                }));
                
                // Insere todos os participantes no histórico
                const { error: erroHistorico } = await supabase
                    .from("historico_participantes")
                    .insert(participantesHistorico);
                    
                if (erroHistorico) {
                    console.error("Erro ao salvar histórico de participantes:", erroHistorico);
                } else {
                    console.log("Histórico de participantes salvo com sucesso!");
                }
                
                // Resetar a lista imediatamente após salvar o histórico
                await resetarLista();
            }
        } catch (err) {
            console.error("Erro durante o processo de sorteio:", err);
        }
    };

    // 🔄 **Função para resetar a lista após o sorteio**
    const resetarLista = async () => {
        // Limpar os participantes do estado
        setParticipantes([]);
        setListaCongelada(false);
        setSorteioRealizado(false);
        
        // Não limpa o ultimoVencedor para manter a exibição do último vencedor

        // Limpar todos os participantes da tabela no banco de dados
        const { error } = await supabase.from("participantes_ativos").delete().neq("id", "");

        if (error) {
            console.error("Erro ao limpar a lista:", error);
        } else {
            console.log("Lista resetada com sucesso!");
            // Atualizar a configuração para indicar que a lista não está mais congelada
            await supabase
                .from("configuracoes")
                .upsert([
                    {
                        chave: "lista_congelada",
                        valor: "false",
                        atualizado_em: new Date().toISOString()
                    }
                ]);
        }

        if (onReiniciarLista) {
            onReiniciarLista();
        }
        
        // Exibe mensagem informando que a lista foi resetada
        mostrarFeedback("Lista resetada para o próximo sorteio! O último vencedor continua visível.", "sucesso");
        
        // Força uma atualização dos dados
        fetchParticipantes();
        fetchUltimoVencedor();
        verificarListaCongelada();
        setUltimaAtualizacao(Date.now());
    };

    // ➕ **Função para adicionar participante**
    const adicionarParticipante = async () => {
        if (listaCongelada) {
            mostrarFeedback("A lista foi congelada! Você não pode mais adicionar nomes.", "erro");
            return;
        }

        if (tempoEspera > 0) {
            mostrarFeedback(`Aguarde ${tempoEspera} segundos antes de adicionar outro nome.`, "aviso");
            return;
        }

        if (novoParticipante.nome && novoParticipante.streamer) {
            const { error } = await supabase
                .from("participantes_ativos")
                .insert([{ nome_twitch: novoParticipante.nome, streamer_escolhido: novoParticipante.streamer }]);

            if (error) {
                console.error("Erro ao adicionar participante:", error);
                mostrarFeedback("Erro ao adicionar. Tente novamente.", "erro");
            } else {
                fetchParticipantes(); // Atualiza a lista imediatamente após a inserção
                setNovoParticipante({ nome: "", streamer: "" });
                
                // Define o tempo de expiração em vez do contador
                const tempoEsperaMs = 10 * 1000; // 10 segundos em milissegundos
                const tempoExpiracao = Date.now() + tempoEsperaMs;
                localStorage.setItem("tempoExpiracao", tempoExpiracao.toString());
                setTempoEspera(10);
                
                mostrarFeedback("Participante adicionado com sucesso!", "sucesso");
            }
        } else {
            mostrarFeedback("Preencha todos os campos!", "aviso");
        }
    };

    // Função para mostrar feedback
    const mostrarFeedback = (mensagem, tipo) => {
        setFeedback({ mensagem, tipo, visivel: true });
        
        // Se for uma mensagem de sucesso para participante adicionado, mostrar notificação centralizada
        if (tipo === 'sucesso' && mensagem.includes('Participante adicionado')) {
            const notificacao = document.getElementById('notificacao-sucesso');
            if (notificacao) {
                notificacao.textContent = mensagem;
                notificacao.style.display = 'block';
                
                // Esconder após 3 segundos
                setTimeout(() => {
                    notificacao.style.display = 'none';
                }, 3000);
            }
        }
        
        // Esconder o feedback após 3 segundos
        setTimeout(() => {
            setFeedback(prev => ({ ...prev, visivel: false }));
        }, 3000);
    };

    // Função para carregar mais participantes ou retrair a lista
    const alternarMostrarMais = () => {
        if (paginaAtual * itensPorPagina >= participantes.length) {
            // Se já estamos mostrando todos, voltar para a primeira página
            setPaginaAtual(1);
        } else {
            // Caso contrário, avançar para a próxima página
            setPaginaAtual(paginaAtual + 1);
        }
    };

    // Calcular quais participantes mostrar na página atual
    const participantesPaginados = participantes.slice(0, paginaAtual * itensPorPagina);
    
    // Verificar se há mais participantes para mostrar
    const temMaisParticipantes = participantes.length > paginaAtual * itensPorPagina;

    // Função para renderizar os participantes com espaços para propaganda
    const renderizarParticipantesComPropaganda = () => {
        if (!participantesPaginados || participantesPaginados.length === 0) {
            return (
                <tr>
                    <td colSpan="3">Nenhum participante encontrado</td>
                </tr>
            );
        }

        // Criar um array com os participantes e propagandas intercaladas
        const linhasTabela = [];
        
        participantesPaginados.forEach((participante, index) => {
            // Adicionar o participante
            linhasTabela.push(
                <tr key={`participante-${index}`}>
                    <td>{index + 1}</td>
                    <td>{participante.nome_twitch}</td>
                    <td>{participante.streamer_escolhido}</td>
                </tr>
            );
            
            // Adicionar anúncio específico entre as linhas 10 e 11
            if (index === 9) {
                linhasTabela.push(
                    <tr key="propaganda-linha-10-11" className="linha-propaganda">
                        <td colSpan="3" className="anuncio-entre-linhas">
                            <Anuncio tipo="banner" posicao="na-tabela" mostrarFechar={true} />
                        </td>
                    </tr>
                );
            }
            // A cada 10 participantes adicionais (após a linha 11), adicionar uma linha de propaganda
            else if ((index + 1) % 10 === 0 && index !== 9 && index !== participantesPaginados.length - 1) {
                const tiposAnuncios = ['video', 'quadrado', 'cursos'];
                const tipoAleatorio = tiposAnuncios[Math.floor(Math.random() * tiposAnuncios.length)];
                
                linhasTabela.push(
                    <tr key={`propaganda-${index}`} className="linha-propaganda">
                        <td colSpan="3">
                            <Anuncio tipo={tipoAleatorio} posicao="na-tabela" mostrarFechar={true} />
                        </td>
                    </tr>
                );
            }
        });
        
        return linhasTabela;
    };

    return (
        <div className="lista-sorteio">
            {/* Notificação de sucesso centralizada */}
            <div id="notificacao-sucesso" className="notificacao-centralizada">
                Participante adicionado com sucesso!
            </div>
            
            {/* Banner superior - exibido sempre no topo, após o cabeçalho */}
            <Anuncio tipo="banner" posicao="topo" mostrarFechar={true} />

            {ultimoVencedor && (
                <div className="vencedor-info">
                    <h3><span className="icon-trophy">🏆</span> Último Vencedor: {ultimoVencedor.nome}</h3>
                    <div className="vencedor-detalhes">
                        <div className="detalhe">
                            <div className="detalhe-label"><span className="icon-streamer">🎥</span> Streamer</div>
                            <div className="detalhe-valor">{ultimoVencedor.streamer}</div>
                        </div>
                        <div className="detalhe">
                            <div className="detalhe-label"><span className="icon-number">🔢</span> Número Sorteado</div>
                            <div className="detalhe-valor">{ultimoVencedor.numero}</div>
                        </div>
                        <div className="detalhe">
                            <div className="detalhe-label"><span className="icon-date">📅</span> Data</div>
                            <div className="detalhe-valor">{ultimoVencedor.data}</div>
                        </div>
                    </div>
                </div>
            )}

            <button className="como-participar-btn" onClick={() => setMostrarInstrucoes(!mostrarInstrucoes)}>
                {mostrarInstrucoes ? "Fechar Instruções" : "Como Participar"}
            </button>

            {mostrarInstrucoes && (
                <div className="instrucoes">
                    <p>📝 **Escreva seu nickname da Twitch** e o **nome do Streamer** que deseja apoiar.</p>
                    <p>🔄 Você **pode participar várias vezes**, escolhendo **diferentes streamers**.</p>
                    <p>⏳ Os sorteios acontecem **às 21h**, mas **a lista é congelada 10 minutos antes**.</p>
                </div>
            )}

            <h2>Lista de Participantes {listaCongelada && "(❄️ Lista Congelada ❄️)"}</h2>

            <div className="formulario">
                <input
                    type="text"
                    placeholder="Seu nickname da Twitch"
                    value={novoParticipante.nome}
                    onChange={(e) => setNovoParticipante({ ...novoParticipante, nome: e.target.value })}
                    disabled={listaCongelada}
                    maxLength={25}
                />
                <input
                    type="text"
                    placeholder="Nome do Streamer"
                    value={novoParticipante.streamer}
                    onChange={(e) => setNovoParticipante({ ...novoParticipante, streamer: e.target.value })}
                    disabled={listaCongelada}
                    maxLength={25}
                />
                <button onClick={adicionarParticipante} disabled={tempoEspera > 0 || listaCongelada}>
                    {listaCongelada ? "Lista Congelada ❄️" : tempoEspera > 0 ? `Aguarde ${tempoEspera}s` : "Confirmar"}
                </button>
            </div>

            {/* Espaço para propaganda principal - estilo cursos antes da tabela */}
            <Anuncio tipo="cursos" posicao="principal" mostrarFechar={true} />

            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Nome na Twitch</th>
                        <th>Streamer</th>
                    </tr>
                </thead>
                <tbody>
                    {renderizarParticipantesComPropaganda()}
                </tbody>
            </table>

            {participantes.length > 10 && (
                <button className="botao-mostrar-mais" onClick={alternarMostrarMais}>
                    {temMaisParticipantes ? "Mostrar Mais" : "Mostrar Menos"}
                </button>
            )}

            {/* Anúncio de vídeo no final da lista */}
            <Anuncio tipo="video" posicao="rodape" mostrarFechar={true} />
        </div>
    );
}

export default ListaSorteio;
