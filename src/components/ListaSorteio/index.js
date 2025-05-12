import React, { useState, useEffect } from "react";
import { supabase } from "../../config/supabaseClient"; // Importando Supabase
import "./ListaSorteio.css"; // Importando o CSS
import Anuncio from "../Anuncio"; // Importando o componente de anúncio
import PlataformaIcon from "../PlataformaIcon"; // Importando o componente de ícone de plataforma

// Função de sanitização de entrada (atualizada para suportar Unicode)
const sanitizarEntrada = (texto) => {
  if (!texto) return "";
  let sanitizado = texto
    // Remove apenas caracteres realmente perigosos, mas permite letras e números de qualquer idioma
    .replace(/[<>'"\\/\{\}\[\];]/g, '') // Remove caracteres potencialmente perigosos
    .replace(/--/g, '_')                      // Remove possíveis injeções SQL
    .replace(/script/gi, '')                  // Remove tentativas de XSS
    .trim();                                  // Remove espaços extras
  // Limitar comprimento
  return sanitizado.substring(0, 25);
};

function ListaSorteio({ onReiniciarLista }) {
    const [participantes, setParticipantes] = useState([]);
    const [novoParticipante, setNovoParticipante] = useState({ nome: "", streamer: "", plataforma: "twitch" });
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
    // Novo estado para controlar a visibilidade do anúncio de tela inteira
    const [mostrarAnuncioTelaInteira, setMostrarAnuncioTelaInteira] = useState(false);

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
        console.log("Buscando participantes ativos...");
        const { data, error } = await supabase
            .from("participantes_ativos")
            .select("*")
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Erro ao buscar participantes:", error);
        } else {
            console.log(`Participantes encontrados: ${data.length}`, data);
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
                data: new Date(vencedor.data).toLocaleDateString('pt-BR'),
                plataforma: vencedor.plataforma_premio || "twitch"
            });
            
            // Salva no localStorage também como backup
            localStorage.setItem("ultimoVencedor", JSON.stringify({
                nome: vencedor.nome,
                streamer: vencedor.streamer,
                numero: vencedor.numero,
                data: new Date(vencedor.data).toLocaleDateString('pt-BR'),
                plataforma: vencedor.plataforma_premio || "twitch"
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
                    // Atualiza a lista completa para garantir a ordenação correta
                    fetchParticipantes();
                }
            )
            .subscribe();
            
        // 2. Canal para sorteios (último vencedor)
        const sorteiosChannel = supabase
            .channel('public:sorteios')
            .on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'sorteios' }, 
                (payload) => {
                    fetchUltimoVencedor();
                }
            )
            .subscribe();
            
        // 3. Canal para configurações (lista congelada)
        const configChannel = supabase
            .channel('public:configuracoes')
            .on('postgres_changes', 
                { event: 'UPDATE', schema: 'public', table: 'configuracoes' }, 
                (payload) => {
                    verificarListaCongelada();
                }
            )
            .subscribe();

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
            data: dataFormatada,
            plataforma: vencedor.plataforma_premio || "twitch"
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
                    plataforma_premio: vencedor.plataforma_premio || "twitch"
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
                    streamer_escolhido: participante.streamer_escolhido,
                    plataforma_premio: participante.plataforma_premio || "twitch"
                }));
                
                // Insere todos os participantes no histórico
                const { error: erroHistorico } = await supabase
                    .from("historico_participantes")
                    .insert(participantesHistorico);
                    
                if (erroHistorico) {
                    console.error("Erro ao salvar histórico de participantes:", erroHistorico);
                } else {
                    // console.log("Histórico de participantes salvo com sucesso!");
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
            // console.log("Lista resetada com sucesso!");
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

    // Handler modificado para sanitizar entradas em tempo real
    const handleInputChange = (e, field) => {
        const valor = sanitizarEntrada(e.target.value);
        setNovoParticipante({ ...novoParticipante, [field]: valor });
    };

    // ➕ **Função para adicionar participante**
    const adicionarParticipante = async () => {
        // Validações básicas
        if (!novoParticipante.nome || !novoParticipante.streamer) {
            mostrarFeedback("Por favor, preencha todos os campos.", "erro");
            return;
        }

        // Sanitizar entradas
        const nomeSanitizado = sanitizarEntrada(novoParticipante.nome);
        const streamerSanitizado = sanitizarEntrada(novoParticipante.streamer);
        const plataformaSelecionada = novoParticipante.plataforma;

        try {
            console.log("Adicionando participante:", nomeSanitizado, streamerSanitizado, plataformaSelecionada);
            
            // Inserir no Supabase
            const { data, error } = await supabase.from("participantes_ativos").insert([
                {
                    nome_twitch: nomeSanitizado,
                    streamer_escolhido: streamerSanitizado,
                    plataforma_premio: plataformaSelecionada
                },
            ]).select();

            if (error) {
                console.error("Erro detalhado ao adicionar participante:", error);
                mostrarFeedback(`Erro ao adicionar: ${error.message}`, "erro");
                return;
            }

            console.log("Participante adicionado com sucesso:", data);
            
            // Limpar o formulário, mas manter a plataforma selecionada
            setNovoParticipante({ nome: "", streamer: "", plataforma: plataformaSelecionada });
            
            // Definir tempo de espera (10 segundos)
            const expiracao = Date.now() + 10000;
            localStorage.setItem("tempoExpiracao", expiracao.toString());
            setTempoEspera(10);

            // Forçar atualização imediata da lista
            await fetchParticipantes();

            // Mostrar feedback de sucesso
            mostrarFeedback("Participante adicionado com sucesso!", "sucesso");

        } catch (error) {
            console.error("Erro ao adicionar participante:", error);
            mostrarFeedback(`Erro inesperado: ${error.message}`, "erro");
        }
    };

    // Função para adicionar participantes de uma vez - atualizada para mostrar anúncio de tela inteira
    const adicionarDezParticipantes = async () => {
        if (!novoParticipante.nome || !novoParticipante.streamer) {
            mostrarFeedback("Por favor, preencha todos os campos.", "erro");
            return;
        }

        if (listaCongelada) {
            mostrarFeedback("A lista foi congelada! Você não pode mais adicionar nomes.", "erro");
            return;
        }

        if (tempoEspera > 0) {
            mostrarFeedback(`Aguarde ${tempoEspera} segundos antes de adicionar mais participantes.`, "aviso");
            return;
        }

        // Mostrar anúncio de tela inteira antes de adicionar participantes
        setMostrarAnuncioTelaInteira(true);
        
        // As chamadas para adicionar os participantes serão feitas quando o anúncio for fechado
        // ou o usuário clicar no anúncio, através do componente de anúncio
    };
    
    // Nova função para processar a adição de participantes após o anúncio
    const processarAdicaoParticipantes = async () => {
        setMostrarAnuncioTelaInteira(false);
        
        // Sanitizar entradas
        const nomeSanitizado = sanitizarEntrada(novoParticipante.nome);
        const streamerSanitizado = sanitizarEntrada(novoParticipante.streamer);
        const plataformaSelecionada = novoParticipante.plataforma;

        try {
            // Mostrar feedback inicial
            mostrarFeedback("Adicionando participações, aguarde...", "aviso");
            
            // Chamar a função RPC do Supabase para adicionar participantes sem números
            const { data, error } = await supabase.rpc('inserir_participantes_sem_numero', {
                nome: nomeSanitizado,
                streamer: streamerSanitizado,
                quantidade: 10,
                plataforma: plataformaSelecionada
            });
            
            if (error) {
                console.error("Erro ao adicionar participantes em lote:", error);
                // FALLBACK: Se a RPC falhar, inserir manualmente os participantes
                mostrarFeedback("Usando método alternativo de inserção...", "aviso");
                await inserirParticipantesManualmente(nomeSanitizado, streamerSanitizado, 10, plataformaSelecionada);
            } else {
                // Processamento normal se a RPC funcionou
                // Limpar o formulário
                setNovoParticipante({ nome: "", streamer: "", plataforma: plataformaSelecionada });
                
                // Definir tempo de espera (30 segundos)
                const expiracao = Date.now() + 30000;
                localStorage.setItem("tempoExpiracao", expiracao.toString());
                setTempoEspera(30);
                
                // Mostrar mensagem de sucesso com o número real de inserções
                if (data && data.sucesso) {
                    const quantidade = data.inseridos || 10;
                    mostrarFeedback(`Participante adicionado com sucesso! ${quantidade} participações foram registradas.`, "sucesso");
                } else if (data) {
                    // Se a operação falhou mas retornou uma mensagem
                    mostrarFeedback(data.mensagem || "Erro ao adicionar participantes", "erro");
                } else {
                    mostrarFeedback("Participante adicionado com sucesso! 10 participações foram registradas.", "sucesso");
                }
            }
            
            // Forçar atualização da lista independentemente do método usado
            await fetchParticipantes();
            
        } catch (error) {
            console.error("Erro ao adicionar participantes:", error);
            mostrarFeedback(`Erro: ${error.message}`, "erro");
        }
    };

    // Método fallback para inserção manual de participantes
    const inserirParticipantesManualmente = async (nome, streamer, quantidade, plataforma) => {
        let inseridos = 0;
        let mensagensErro = [];
        
        try {
            // Registrar lote no log para que o trigger de rate limit permita
            await supabase.from("logs").insert([{
                descricao: `Lote autorizado: ${nome} - iniciando ${quantidade} inserções (fallback)`
            }]);
            
            for (let i = 1; i <= quantidade; i++) {
                try {
                    // Inserir o mesmo nome sem numeração
                    const { error } = await supabase.from("participantes_ativos").insert([
                        {
                            nome_twitch: nome,
                            streamer_escolhido: streamer,
                            plataforma_premio: plataforma
                        },
                    ]);
                    
                    if (error) {
                        mensagensErro.push(`Erro ao inserir ${i}: ${error.message}`);
                        console.error(`Erro ao inserir participante ${i}:`, error);
                    } else {
                        inseridos++;
                        // Pequena pausa entre inserções para evitar rate limiting
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                } catch (err) {
                    mensagensErro.push(`Exceção ao inserir ${i}: ${err.message}`);
                }
            }
            
            // Registrar conclusão do lote
            await supabase.from("logs").insert([{
                descricao: `Conclusão do lote: ${nome} - inseridos ${inseridos}/${quantidade} (fallback)`
            }]);
            
            // Limpar o formulário mas manter a plataforma
            setNovoParticipante({ nome: "", streamer: "", plataforma });
            
            // Definir tempo de espera (30 segundos para o método manual)
            const expiracao = Date.now() + 30000;
            localStorage.setItem("tempoExpiracao", expiracao.toString());
            setTempoEspera(30);
            
            if (inseridos > 0) {
                mostrarFeedback(`Participante adicionado com sucesso! ${inseridos} participações foram registradas.`, "sucesso");
            } else {
                mostrarFeedback("Não foi possível adicionar participantes. Tente novamente mais tarde.", "erro");
                console.error("Erros durante inserção manual:", mensagensErro);
            }
        } catch (error) {
            console.error("Erro na inserção manual:", error);
            mostrarFeedback("Erro ao adicionar participantes manualmente.", "erro");
        }
        
        return inseridos;
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
                    <td colSpan="4">Nenhum participante encontrado</td>
                </tr>
            );
        }

        // Criar um array com os participantes e propagandas intercaladas
        const linhasTabela = [];
        
        participantesPaginados.forEach((participante, index) => {
            // Usar o nome completo sem remover os números
            // Isso permite que os números nos nomes sejam exibidos na tabela
            const nomeExibicao = participante.nome_twitch;
            const plataforma = participante.plataforma_premio || "twitch";
            
            // Adicionar o participante
            linhasTabela.push(
                <tr key={`participante-${index}`}>
                    <td>{index + 1}</td>
                    <td>{nomeExibicao}</td>
                    <td>{participante.streamer_escolhido}</td>
                    <td className="coluna-plataforma">
                        <PlataformaIcon plataforma={plataforma} tamanho="pequeno" />
                    </td>
                </tr>
            );
            
            // Adicionar anúncio específico entre as linhas 10 e 11
            if (index === 9) {
                linhasTabela.push(
                    <tr key="propaganda-linha-10-11" className="linha-propaganda">
                        <td colSpan="4" className="anuncio-entre-linhas">
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
                        <td colSpan="4">
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
                        <div className="detalhe">
                            <div className="detalhe-label"><span className="icon-platform">🎥</span> Plataforma</div>
                            <div className="detalhe-valor">
                                {ultimoVencedor.plataforma || "twitch"}
                                <span className="plataforma-emoji">
                                    {ultimoVencedor.plataforma === "youtube" ? <PlataformaIcon plataforma="youtube" tamanho="pequeno" /> :
                                     ultimoVencedor.plataforma === "steam" ? <PlataformaIcon plataforma="steam" tamanho="pequeno" /> :
                                     ultimoVencedor.plataforma === "xbox" ? <PlataformaIcon plataforma="xbox" tamanho="pequeno" /> :
                                     ultimoVencedor.plataforma === "playstation" ? <PlataformaIcon plataforma="playstation" tamanho="pequeno" /> : 
                                     <PlataformaIcon plataforma="twitch" tamanho="pequeno" />}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <button className="como-participar-btn" onClick={() => setMostrarInstrucoes(!mostrarInstrucoes)}>
                {mostrarInstrucoes ? "Fechar Instruções" : "Como Participar"}
            </button>

            {mostrarInstrucoes && (
                <div className="instrucoes">
                    <p>• Preencha com seu nickname da Twitch e o nome do Streamer que você deseja apoiar.</p>
                    <p>• Selecione em qual plataforma deseja receber o prêmio, caso seja sorteado (seu prêmio será entregue nesta plataforma).</p>
                    <p>• Você pode participar várias vezes.</p>
                    <p>• É permitido escolher streamers diferentes a cada participação.</p>
                    <p>• Os sorteios acontecem todos os dias, de forma aleatória, entre 21h e 22h.</p>
                </div>
            )}

            <h2>Lista de Participantes {listaCongelada && "(❄️ Lista Congelada ❄️)"}</h2>

            <div className="formulario form-horizontal">
                <input
                    type="text"
                    placeholder="Nickname"
                    value={novoParticipante.nome}
                    onChange={(e) => handleInputChange(e, 'nome')}
                    disabled={listaCongelada}
                    maxLength={25}
                />
                <input
                    type="text"
                    placeholder="Streamer"
                    value={novoParticipante.streamer}
                    onChange={(e) => handleInputChange(e, 'streamer')}
                    disabled={listaCongelada}
                    maxLength={25}
                />
                <select
                    value={novoParticipante.plataforma}
                    onChange={(e) => setNovoParticipante({ ...novoParticipante, plataforma: e.target.value })}
                    disabled={listaCongelada}
                    className="plataforma-select"
                >
                    <option value="twitch">Twitch</option>
                    {/* 
                    <option value="youtube">YouTube</option>
                    <option value="steam">Steam</option>
                    <option value="xbox">Xbox</option>
                    <option value="playstation">PlayStation</option>
                    */}
                </select>
                <button onClick={adicionarParticipante} disabled={tempoEspera > 0 || listaCongelada}>
                    {listaCongelada ? "Lista Congelada ❄️" : tempoEspera > 0 ? `Aguarde ${tempoEspera}s` : "Confirmar"}
                </button>
                <button onClick={adicionarDezParticipantes} disabled={tempoEspera > 0 || listaCongelada}>
                    {listaCongelada ? "Lista Congelada ❄️" : tempoEspera > 0 ? `Aguarde ${tempoEspera}s` : "+10"}
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
                        <th>🎥</th>
                    </tr>
                </thead>
                <tbody>
                    {renderizarParticipantesComPropaganda()}
                </tbody>
            </table>

            {participantes.length > 10 && (
                <button 
                    className={`botao-mostrar-mais ${!temMaisParticipantes ? 'mostrar-menos' : ''}`} 
                    onClick={alternarMostrarMais}
                >
                    {temMaisParticipantes ? "Mostrar Mais" : "Mostrar Menos"}
                </button>
            )}

            {/* Anúncio de vídeo no final da lista */}
            <Anuncio tipo="video" posicao="rodape" mostrarFechar={true} />

            {/* Anúncio de tela inteira quando o botão +10 é clicado */}
            {mostrarAnuncioTelaInteira && (
                <Anuncio 
                    tipo="tela-inteira"
                    titulo="PROMOÇÃO EXCLUSIVA"
                    descricao="Para adicionar +10 participações, confira nossa oferta especial"
                    urlDestino="#"
                    imagemSrc="/images/promo.jpg" // Opcional: O caminho para a imagem do anúncio
                    mostrarFechar={true}
                    avisos="Ao clicar você concorda com os termos de uso."
                    onFechar={() => {
                        setMostrarAnuncioTelaInteira(false);
                        processarAdicaoParticipantes();
                    }}
                />
            )}
        </div>
    );
}

export default ListaSorteio;
