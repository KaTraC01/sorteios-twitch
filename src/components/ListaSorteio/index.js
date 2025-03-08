import React, { useState, useEffect } from "react";
import { supabase } from "../../config/supabaseClient"; // Importando Supabase
import "./ListaSorteio.css"; // Importando o CSS

function ListaSorteio({ onReiniciarLista }) {
    const [participantes, setParticipantes] = useState([]);
    const [novoParticipante, setNovoParticipante] = useState({ nome: "", streamer: "" });
    const [tempoEspera, setTempoEspera] = useState(parseInt(localStorage.getItem("tempoEspera")) || 0);
    const [listaCongelada, setListaCongelada] = useState(false);
    const [sorteioRealizado, setSorteioRealizado] = useState(false);
    const [ultimoVencedor, setUltimoVencedor] = useState(null);
    const [mostrarInstrucoes, setMostrarInstrucoes] = useState(false);
    const [feedback, setFeedback] = useState({ mensagem: "", tipo: "", visivel: false });

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
        } else {
            // Tenta carregar do localStorage se não encontrar no Supabase
            const vencedorSalvo = localStorage.getItem("ultimoVencedor");
            if (vencedorSalvo) {
                setUltimoVencedor(JSON.parse(vencedorSalvo));
            }
        }
    };

    useEffect(() => {
        fetchParticipantes();
        fetchUltimoVencedor(); // Carrega o último vencedor ao iniciar
        
        // Verificar a estrutura da tabela
        const verificarEstrutura = async () => {
            const { data, error } = await supabase
                .from('participantes_ativos')
                .select('*')
                .limit(1);
            
            if (error) {
                console.error("Erro ao verificar estrutura:", error);
            } else if (data && data.length > 0) {
                console.log("Estrutura da tabela:", Object.keys(data[0]));
            } else {
                console.log("Tabela vazia ou não existe");
            }
        };
        
        verificarEstrutura();

        // 🔄 **Atualização em tempo real com Supabase**
        const subscription = supabase
            .channel("participantes_ativos")
            .on("postgres_changes", { event: "*", schema: "public", table: "participantes_ativos" }, fetchParticipantes)
            .subscribe();

        // Também escuta por mudanças na tabela de sorteios para atualizar o último vencedor
        const sorteiosSubscription = supabase
            .channel("sorteios")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "sorteios" }, fetchUltimoVencedor)
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
            supabase.removeChannel(sorteiosSubscription);
        };
    }, []);

    // ⏳ **Atualiza o temporizador de espera**
    useEffect(() => {
        if (tempoEspera > 0) {
            localStorage.setItem("tempoEspera", tempoEspera);
            const timer = setTimeout(() => {
                setTempoEspera((prevTempo) => {
                    const novoTempo = prevTempo - 1;
                    if (novoTempo <= 0) {
                        localStorage.removeItem("tempoEspera");
                    }
                    return novoTempo;
                });
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [tempoEspera]);

    // ⏰ **Verifica horários para congelar a lista e sortear**
    useEffect(() => {
        const verificarHorario = () => {
            const agora = new Date();
            const horas = agora.getHours();
            const minutos = agora.getMinutes();

            if (horas === 20 && minutos >= 50) {
                setListaCongelada(true);
            }

            if (horas === 21 && minutos === 0 && !sorteioRealizado) {
                realizarSorteio();
            }

            if (horas === 21 && minutos === 5 && sorteioRealizado) {
                resetarLista();
            }
        };

        verificarHorario();
        const intervalo = setInterval(verificarHorario, 1000);
        return () => clearInterval(intervalo);
    }, [participantes, sorteioRealizado]);

    // 🎲 **Função para realizar o sorteio**
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
        }
    };

    // 🔄 **Função para resetar a lista às 21h05**
    const resetarLista = async () => {
        setParticipantes([]);
        setListaCongelada(false);
        setSorteioRealizado(false);
        
        // Não limpa o ultimoVencedor para manter a exibição do último vencedor

        const { error } = await supabase.from("participantes_ativos").delete().neq("id", "");

        if (error) {
            console.error("Erro ao limpar a lista:", error);
        }

        if (onReiniciarLista) {
            onReiniciarLista();
        }
        
        // Exibe mensagem informando que a lista foi resetada
        mostrarFeedback("Lista resetada para o próximo sorteio! O último vencedor continua visível.", "sucesso");
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
                setTempoEspera(10);
                localStorage.setItem("tempoEspera", 10);
                mostrarFeedback("Participante adicionado com sucesso!", "sucesso");
            }
        } else {
            mostrarFeedback("Preencha todos os campos!", "aviso");
        }
    };

    // Função para mostrar feedback
    const mostrarFeedback = (mensagem, tipo) => {
        setFeedback({ mensagem, tipo, visivel: true });
        
        // Esconder o feedback após 3 segundos
        setTimeout(() => {
            setFeedback(prev => ({ ...prev, visivel: false }));
        }, 3000);
    };

    return (
        <div className="lista-sorteio">
            {feedback.visivel && (
                <div className={`feedback-mensagem ${feedback.tipo}`}>
                    {feedback.mensagem}
                </div>
            )}
            
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
                />
                <input
                    type="text"
                    placeholder="Nome do Streamer"
                    value={novoParticipante.streamer}
                    onChange={(e) => setNovoParticipante({ ...novoParticipante, streamer: e.target.value })}
                    disabled={listaCongelada}
                />
                <button onClick={adicionarParticipante} disabled={tempoEspera > 0 || listaCongelada}>
                    {listaCongelada ? "Lista Congelada ❄️" : tempoEspera > 0 ? `Aguarde ${tempoEspera}s` : "Confirmar"}
                </button>
            </div>

            {feedback.visivel && (
                <div className={`feedback-mensagem ${feedback.tipo}`}>
                    {feedback.mensagem}
                </div>
            )}

            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Nome na Twitch</th>
                        <th>Streamer</th>
                    </tr>
                </thead>
                <tbody>
                    {console.log("Renderizando participantes:", participantes)}
                    {participantes && participantes.length > 0 ? (
                        participantes.map((participante, index) => (
                            <tr key={index}>
                                <td>{index + 1}</td>
                                <td>{participante.nome_twitch}</td>
                                <td>{participante.streamer_escolhido}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="3">Nenhum participante encontrado</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default ListaSorteio;
