import React, { useState, useEffect } from "react";
import { supabase } from "../../config/supabaseClient"; // Importando Supabase
import "./ListaSorteio.css"; // Importando o CSS

function ListaSorteio({ onReiniciarLista }) {
    const [participantes, setParticipantes] = useState([]);
    const [novoParticipante, setNovoParticipante] = useState({ nome: "", streamer: "" });
    const [tempoEspera, setTempoEspera] = useState(0);
    const [listaCongelada, setListaCongelada] = useState(false);
    const [sorteioRealizado, setSorteioRealizado] = useState(false);
    const [ultimoVencedor, setUltimoVencedor] = useState(null);
    const [mostrarInstrucoes, setMostrarInstrucoes] = useState(false);

    // 🔄 **Carregar os participantes do Supabase quando a página for carregada**
    useEffect(() => {
        const fetchParticipantes = async () => {
            const { data, error } = await supabase
                .from("participantes_ativos")
                .select("*");

            if (error) {
                console.error("Erro ao buscar participantes:", error);
            } else {
                setParticipantes(data);
            }
        };

        fetchParticipantes();
    }, []);

    // ⏳ Atualiza o temporizador a cada segundo
    useEffect(() => {
        if (tempoEspera > 0) {
            const timer = setTimeout(() => setTempoEspera(tempoEspera - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [tempoEspera]);

    // ⏰ **Verifica o horário para congelar a lista e realizar o sorteio**
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
    const realizarSorteio = () => {
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
    };

    // 🔄 **Função para resetar a lista às 21h05**
    const resetarLista = async () => {
        setParticipantes([]);
        setListaCongelada(false);
        setSorteioRealizado(false);

        // 🛠 Apaga os participantes do Supabase para um novo dia
        const { error } = await supabase.from("participantes_ativos").delete().neq("id", "");

        if (error) {
            console.error("Erro ao limpar a lista:", error);
        }

        if (onReiniciarLista) {
            onReiniciarLista();
        }
    };

    // ➕ **Função para adicionar um participante ao Supabase**
    const adicionarParticipante = async () => {
        if (listaCongelada) {
            alert("A lista foi congelada! Você não pode mais adicionar nomes.");
            return;
        }

        if (tempoEspera > 0) {
            alert(`Aguarde ${tempoEspera} segundos antes de adicionar outro nome.`);
            return;
        }

        if (novoParticipante.nome && novoParticipante.streamer) {
            const { data, error } = await supabase
                .from("participantes_ativos")
                .insert([{ nome_twitch: novoParticipante.nome, streamer_escolhido: novoParticipante.streamer }]);

            if (error) {
                console.error("Erro ao adicionar participante:", error);
                alert("Erro ao adicionar. Tente novamente.");
            } else {
                setParticipantes([...participantes, data[0]]);
                setNovoParticipante({ nome: "", streamer: "" });
                setTempoEspera(10);
            }
        }
    };

    return (
        <div className="lista-sorteio">
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
                    {participantes.map((p, index) => (
                        <tr key={p.id}>
                            <td>{index + 1}</td>
                            <td>{p.nome_twitch}</td>
                            <td>{p.streamer_escolhido}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default ListaSorteio;
