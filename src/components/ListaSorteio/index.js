import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient"; // Importando Supabase
import "./ListaSorteio.css"; // Importando o CSS

function ListaSorteio({ onReiniciarLista }) {
    // Estado para armazenar os participantes
    const [participantes, setParticipantes] = useState([]);
    const [novoParticipante, setNovoParticipante] = useState({ nome: "", streamer: "" });
    const [tempoEspera, setTempoEspera] = useState(0);
    const [listaCongelada, setListaCongelada] = useState(false);
    const [sorteioRealizado, setSorteioRealizado] = useState(false);
    const [ultimoVencedor, setUltimoVencedor] = useState(null); 
    const [mostrarInstrucoes, setMostrarInstrucoes] = useState(false); 

    // Atualiza o temporizador a cada segundo
    useEffect(() => {
        if (tempoEspera > 0) {
            const timer = setTimeout(() => setTempoEspera(tempoEspera - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [tempoEspera]);

    // Carregar lista do Supabase
    useEffect(() => {
        const fetchParticipantes = async () => {
            const { data, error } = await supabase.from("participantes_ativos").select("*");
            if (error) {
                console.error("Erro ao buscar participantes:", error);
            } else {
                setParticipantes(data);
            }
        };
        fetchParticipantes();
    }, []);

    // Verifica a hora atual para congelar a lista e realizar o sorteio
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

    // Função para realizar o sorteio
    const realizarSorteio = () => {
        if (participantes.length === 0) {
            alert("Nenhum participante na lista. O sorteio foi cancelado.");
            return;
        }

        const vencedorIndex = Math.floor(Math.random() * participantes.length);
        const vencedor = participantes[vencedorIndex];

        setUltimoVencedor({
            nome: vencedor.nome,
            streamer: vencedor.streamer,
            numero: vencedorIndex + 1,
            data: new Date().toLocaleDateString()
        });

        setSorteioRealizado(true);
    };

    // Função para resetar a lista às 21h05
    const resetarLista = async () => {
        await supabase.from("participantes_ativos").delete().neq("id", ""); // Apaga todos os participantes
        setParticipantes([]);
        setListaCongelada(false);
        setSorteioRealizado(false);

        if (onReiniciarLista) {
            onReiniciarLista();
        }
    };

    // Função para adicionar participante
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
            const { error } = await supabase.from("participantes_ativos").insert([
                {
                    nome_twitch: novoParticipante.nome,
                    streamer_escolhido: novoParticipante.streamer
                }
            ]);

            if (error) {
                console.error("Erro ao adicionar participante:", error);
            } else {
                // Atualiza a lista imediatamente sem precisar recarregar a página
                const { data } = await supabase.from("participantes_ativos").select("*");
                setParticipantes(data);
                setNovoParticipante({ nome: "", streamer: "" });
                setTempoEspera(10); // Define tempo de espera de 10 segundos
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
                    <p>📝 **Escreva seu nickname da Twitch** no campo indicado e o **nome do Streamer** que deseja que receba seu Sub.</p>
                    <p>🔄 Você **pode participar mais de uma vez** e escolher **diferentes streamers**.</p>
                    <p>⏳ Os sorteios acontecem **às 21h**, mas **a lista é encerrada 10 minutos antes**. **Não perca tempo!**</p>
                </div>
            )}

            <h2>Lista de Participantes {listaCongelada && "(❄️ Lista Congelada Aguardando Sorteio ❄️)"}</h2>

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
