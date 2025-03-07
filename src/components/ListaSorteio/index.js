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

    useEffect(() => {
        fetchParticipantes();
        
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

        return () => {
            supabase.removeChannel(subscription);
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
            alert("Nenhum participante na lista. O sorteio foi cancelado.");
            return;
        }

        const vencedorIndex = Math.floor(Math.random() * participantes.length);
        const vencedor = participantes[vencedorIndex];

        setUltimoVencedor({
            nome: vencedor.nome_twitch,
            streamer: vencedor.streamer_escolhido,
            numero: vencedorIndex + 1,
            data: new Date().toLocaleDateString()
        });

        setSorteioRealizado(true);

        // 🔹 **Salva o resultado no Supabase**
        await supabase.from("sorteios").insert([
            {
                data: new Date().toISOString(),
                numero: vencedorIndex + 1,
                nome: vencedor.nome_twitch,
                streamer: vencedor.streamer_escolhido,
            },
        ]);
    };

    // 🔄 **Função para resetar a lista às 21h05**
    const resetarLista = async () => {
        setParticipantes([]);
        setListaCongelada(false);
        setSorteioRealizado(false);

        const { error } = await supabase.from("participantes_ativos").delete().neq("id", "");

        if (error) {
            console.error("Erro ao limpar a lista:", error);
        }

        if (onReiniciarLista) {
            onReiniciarLista();
        }
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
                    <h3>🏆 Último Vencedor: {ultimoVencedor.nome}</h3>
                    <p>🎥 Escolheu: {ultimoVencedor.streamer}</p>
                    <p>🔢 N° Sorteado: {ultimoVencedor.numero}</p>
                    <p>📅 Data: {ultimoVencedor.data}</p>
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
