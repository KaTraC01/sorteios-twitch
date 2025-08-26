import React, { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next'; // Importar hook de tradu��o
import { getSupabaseClient } from "../../lib/supabaseManager"; // Importando gerenciador otimizado

// Usar cliente otimizado para opera��es de frontend
const supabase = getSupabaseClient();
import "./ListaSorteio.css"; // Importando o CSS
import Anuncio from "../Anuncio"; // Importando o componente de an�ncio
import PlataformaIcon from "../PlataformaIcon"; // Importando o componente de �cone de plataforma

// Fun��o de sanitiza��o de entrada (atualizada para suportar Unicode)
const sanitizarEntrada = (texto) => {
  if (!texto) return "";
  let sanitizado = texto
    // Remove apenas caracteres realmente perigosos, mas permite letras e n�meros de qualquer idioma
    .replace(/[<>'"\\/\{\}\[\];]/g, '') // Remove caracteres potencialmente perigosos
    .replace(/--/g, '_')                      // Remove poss�veis inje��es SQL
    .replace(/script/gi, '')                  // Remove tentativas de XSS
    .trim();                                  // Remove espa�os extras
  // Limitar comprimento
  return sanitizado.substring(0, 25);
};

function ListaSorteio({ onReiniciarLista }) {
    const { t } = useTranslation(); // Hook de tradu��o
    const [participantes, setParticipantes] = useState([]);
    const [novoParticipante, setNovoParticipante] = useState({ nome: "", streamer: "", plataforma: "twitch" });
    const [tempoEspera, setTempoEspera] = useState(0);
    const [listaCongelada, setListaCongelada] = useState(false);
    const [sorteioRealizado, setSorteioRealizado] = useState(false);
    const [ultimoVencedor, setUltimoVencedor] = useState(null);
    const [mostrarInstrucoes, setMostrarInstrucoes] = useState(false);
    const [feedback, setFeedback] = useState({ mensagem: "", tipo: "", visivel: false });
    const [ultimaAtualizacao, setUltimaAtualizacao] = useState(Date.now());
    // Estados para controlar a pagina��o
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [itensPorPagina, setItensPorPagina] = useState(10);
    // Novo estado para controlar a visibilidade do an�ncio de tela inteira
    const [mostrarAnuncioTelaInteira, setMostrarAnuncioTelaInteira] = useState(false);

    // Fun��o para verificar o tempo de espera baseado na expira��o
    const verificarTempoEspera = () => {
        const tempoExpiracao = localStorage.getItem("tempoExpiracao");
        if (tempoExpiracao) {
            const agora = Date.now();
            const expiracao = parseInt(tempoExpiracao);
            
            if (agora >= expiracao) {
                // Tempo j� expirou
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

    // ?? **Fun��o para buscar participantes no Supabase**
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

    // ?? **Fun��o para buscar o �ltimo vencedor do Supabase**
    const fetchUltimoVencedor = async () => {
        const { data, error } = await supabase
            .from("sorteios")
            .select("*")
            .order("data", { ascending: false })
            .limit(1);

        if (error) {
            console.error("Erro ao buscar �ltimo vencedor:", error);
        } else if (data && data.length > 0) {
            const vencedor = data[0];
            setUltimoVencedor({
                nome: vencedor.nome,
                streamer: vencedor.streamer,
                numero: vencedor.numero,
                data: new Date(vencedor.data).toLocaleDateString('pt-BR'),
                plataforma: vencedor.plataforma_premio || "twitch"
            });
            
            // Salva no localStorage tamb�m como backup
            localStorage.setItem("ultimoVencedor", JSON.stringify({
                nome: vencedor.nome,
                streamer: vencedor.streamer,
                numero: vencedor.numero,
                data: new Date(vencedor.data).toLocaleDateString('pt-BR'),
                plataforma: vencedor.plataforma_premio || "twitch"
            }));
        }
    };

    // ?? **Fun��o para verificar se a lista est� congelada**
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

    // ?? **Carrega os dados iniciais e configura atualiza��es em tempo real com Supabase Realtime**
    useEffect(() => {
        // Verificar se h� um �ltimo vencedor no localStorage
        const vencedorSalvo = localStorage.getItem("ultimoVencedor");
        if (vencedorSalvo && !ultimoVencedor) {
            setUltimoVencedor(JSON.parse(vencedorSalvo));
        }
        
        // Carregar dados iniciais
        fetchParticipantes();
        fetchUltimoVencedor();
        verificarListaCongelada();
        
        // Configurar canal �nico consolidado para atualiza��es em tempo real
        const sessionId = Math.random().toString(36).substring(2, 15);
        const consolidatedChannel = supabase
            .channel(`sorteio-realtime-${sessionId}`)
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'participantes_ativos' }, 
                (payload) => {
                    // Atualiza a lista completa para garantir a ordena��o correta
                    fetchParticipantes();
                }
            )
            .on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'sorteios' }, 
                (payload) => {
                    fetchUltimoVencedor();
                }
            )
            .on('postgres_changes', 
                { event: 'UPDATE', schema: 'public', table: 'configuracoes' }, 
                (payload) => {
                    verificarListaCongelada();
                }
            )
            .subscribe();

        // Limpeza ao desmontar o componente
        return () => {
            // Remover o canal consolidado
            supabase.removeChannel(consolidatedChannel);
        };
    }, []);

    // ? **Atualiza o temporizador de espera**
    useEffect(() => {
        // Verifica o tempo restante ao iniciar o componente
        verificarTempoEspera();
        
        // Atualiza o tempo a cada segundo
        const timer = setInterval(() => {
            verificarTempoEspera();
        }, 1000);
        
        return () => clearInterval(timer);
    }, []);

    // ?? **Fun��o para realizar o sorteio - Mantida apenas para uso manual pela interface administrativa**
    const realizarSorteio = async () => {
        if (participantes.length === 0) {
            mostrarFeedback(t('listaSorteio.nenhumParticipante'), "erro");
            return;
        }

        const vencedorIndex = Math.floor(Math.random() * participantes.length);
        const vencedor = participantes[vencedorIndex];
        
        // Obter a data atual no formato correto
        const dataAtual = new Date();
        const dataFormatada = dataAtual.toLocaleDateString('pt-BR');
        
        // Gerar um n�mero baseado no �ndice do participante na lista (1-based)
        // Assim garantimos que o n�mero sorteado corresponde a um participante real
        const numeroSorteado = vencedorIndex + 1;
        
        const dadosVencedor = {
            nome: vencedor.nome_twitch,
            streamer: vencedor.streamer_escolhido,
            numero: numeroSorteado, // Usar o n�mero baseado no �ndice real do participante
            data: dataFormatada,
            plataforma: vencedor.plataforma_premio || "twitch"
        };
        
        // Atualiza o estado e salva no localStorage
        setUltimoVencedor(dadosVencedor);
        localStorage.setItem("ultimoVencedor", JSON.stringify(dadosVencedor));

        setSorteioRealizado(true);

        // Ajustar a data para o fuso hor�rio local antes de salvar
        const dataHoraBrasil = new Date();
        // Garantir que a data seja salva com o fuso hor�rio correto
        const dataISO = new Date(
            dataHoraBrasil.getFullYear(),
            dataHoraBrasil.getMonth(),
            dataHoraBrasil.getDate(),
            21, // Hora do sorteio (21h)
            0,  // Minutos
            0   // Segundos
        ).toISOString();

        try {
            // ?? **Salva o resultado do sorteio no Supabase**
            const { data: sorteioSalvo, error: erroSorteio } = await supabase.from("sorteios").insert([
                {
                    data: dataISO,
                    numero: numeroSorteado, // Usar o n�mero baseado no �ndice real do participante
                    nome: vencedor.nome_twitch,
                    streamer: vencedor.streamer_escolhido,
                    plataforma_premio: vencedor.plataforma_premio || "twitch"
                },
            ]).select();

            if (erroSorteio) {
                console.error("Erro ao salvar o sorteio:", erroSorteio);
                return;
            }

            // ?? **Salva a lista completa de participantes no hist�rico**
            if (sorteioSalvo && sorteioSalvo.length > 0) {
                const sorteioId = sorteioSalvo[0].id;
                
                // Prepara os dados dos participantes para inser��o no hist�rico
                const participantesHistorico = participantes.map((participante, index) => ({
                    sorteio_id: sorteioId,
                    nome_twitch: participante.nome_twitch,
                    streamer_escolhido: participante.streamer_escolhido,
                    plataforma_premio: participante.plataforma_premio || "twitch",
                    posicao_original: index + 1 // Adicionando a posi��o original (come�ando em 1)
                }));
                
                // Insere todos os participantes no hist�rico
                const { error: erroHistorico } = await supabase
                    .from("historico_participantes")
                    .insert(participantesHistorico);
                    
                if (erroHistorico) {
                    console.error("Erro ao salvar hist�rico de participantes:", erroHistorico);
                } else {
                    // console.log("Hist�rico de participantes salvo com sucesso!");
                }
                
                // Resetar a lista imediatamente ap�s salvar o hist�rico
                await resetarLista();
            }
        } catch (err) {
            console.error("Erro durante o processo de sorteio:", err);
        }
    };

    // ?? **Fun��o para resetar a lista ap�s o sorteio**
    const resetarLista = async () => {
        // Limpar os participantes do estado
        setParticipantes([]);
        setListaCongelada(false);
        setSorteioRealizado(false);
        
        // N�o limpa o ultimoVencedor para manter a exibi��o do �ltimo vencedor

        // Limpar todos os participantes da tabela no banco de dados
        const { error } = await supabase.from("participantes_ativos").delete().neq("id", "");

        if (error) {
            console.error("Erro ao limpar a lista:", error);
        } else {
            // console.log("Lista resetada com sucesso!");
            // Atualizar a configura��o para indicar que a lista n�o est� mais congelada
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
        mostrarFeedback(t('listaSorteio.listaResetada'), "sucesso");
        
        // For�a uma atualiza��o dos dados
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

    // ? **Fun��o para adicionar participante**
    const adicionarParticipante = async () => {
        // Valida��es b�sicas
        if (!novoParticipante.nome || !novoParticipante.streamer) {
            mostrarFeedback(t('listaSorteio.preenchaTodosCampos'), "erro");
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
                mostrarFeedback(`${t('listaSorteio.erroDetalhado')}: ${error.message}`, "erro");
                return;
            }

            console.log("Participante adicionado com sucesso:", data);
            
            // Limpar o formul�rio, mas manter a plataforma selecionada
            setNovoParticipante({ nome: "", streamer: "", plataforma: plataformaSelecionada });
            
            // Definir tempo de espera (60 segundos - 1 minuto)
            const expiracao = Date.now() + 60000;
            localStorage.setItem("tempoExpiracao", expiracao.toString());
            setTempoEspera(60);

            // For�ar atualiza��o imediata da lista
            await fetchParticipantes();

            // Mostrar feedback de sucesso
            mostrarFeedback(t('listaSorteio.participanteAdicionado'), "sucesso");

        } catch (error) {
            console.error("Erro ao adicionar participante:", error);
            mostrarFeedback(`${t('listaSorteio.erro')}: ${error.message}`, "erro");
        }
    };

    // Fun��o para adicionar participantes de uma vez - atualizada para mostrar an�ncio de tela inteira
    const adicionarDezParticipantes = async () => {
        if (!novoParticipante.nome || !novoParticipante.streamer) {
            mostrarFeedback(t('listaSorteio.preenchaTodosCampos'), "erro");
            return;
        }

        if (listaCongelada) {
            mostrarFeedback(t('listaSorteio.listaCongelada'), "erro");
            return;
        }

        if (tempoEspera > 0) {
            mostrarFeedback(t('listaSorteio.aguarde', { segundos: tempoEspera }), "aviso");
            return;
        }

        // Sanitizar entradas
        const nomeSanitizado = sanitizarEntrada(novoParticipante.nome);
        const streamerSanitizado = sanitizarEntrada(novoParticipante.streamer);
        const plataformaSelecionada = novoParticipante.plataforma;

        try {
            // Mostrar feedback inicial
            mostrarFeedback(t('listaSorteio.adicionandoParticipacoes'), "aviso");
            
            // Chamar a fun��o RPC do Supabase para adicionar participantes sem n�meros
            const { data, error } = await supabase.rpc('inserir_participantes_sem_numero', {
                nome: nomeSanitizado,
                streamer: streamerSanitizado,
                quantidade: 10,
                plataforma: plataformaSelecionada
            });
            
            if (error) {
                console.error("Erro ao adicionar participantes em lote:", error);
                // FALLBACK: Se a RPC falhar, inserir manualmente os participantes
                mostrarFeedback(t('listaSorteio.metodoAlternativo'), "aviso");
                await inserirParticipantesManualmente(nomeSanitizado, streamerSanitizado, 10, plataformaSelecionada);
            } else {
                // Processamento normal se a RPC funcionou
                // Limpar o formul�rio
                setNovoParticipante({ nome: "", streamer: "", plataforma: plataformaSelecionada });
                
                // Definir tempo de espera (300 segundos - 5 minutos)
                const expiracao = Date.now() + 300000;
                localStorage.setItem("tempoExpiracao", expiracao.toString());
                setTempoEspera(300);
                
                // Mostrar mensagem de sucesso com o n�mero real de inser��es
                if (data && data.sucesso) {
                    const quantidade = data.inseridos || 10;
                    mostrarFeedback(t('listaSorteio.participacoesRegistradas', { quantidade }), "sucesso");
                } else if (data) {
                    // Se a opera��o falhou mas retornou uma mensagem
                    mostrarFeedback(data.mensagem || t('listaSorteio.erroAdicionarParticipantes'), "erro");
                } else {
                    mostrarFeedback(t('listaSorteio.dezParticipacoesRegistradas'), "sucesso");
                }
            }
            
            // For�ar atualiza��o da lista independentemente do m�todo usado
            await fetchParticipantes();
            
        } catch (error) {
            console.error("Erro ao adicionar participantes:", error);
            mostrarFeedback(`${t('listaSorteio.erro')}: ${error.message}`, "erro");
        }

        // Mostrar an�ncio de tela inteira ap�s processar as entradas
        setMostrarAnuncioTelaInteira(true);
        
        // Registrar a exibi��o do an�ncio para m�tricas
        try {
            await supabase.from("metricas_anuncios").insert([{
                tipo_anuncio: "botao_mais_10",
                usuario_info: {
                    nome: nomeSanitizado,
                    streamer: streamerSanitizado,
                    plataforma: plataformaSelecionada
                },
                detalhes: `Usu�rio adicionou 10 participa��es - Nome: ${nomeSanitizado}`
            }]);
        } catch (error) {
            console.error("Erro ao registrar m�trica de an�ncio:", error);
        }
    };

    // Fun��o simplificada apenas para fechar o an�ncio
    const processarAdicaoParticipantes = () => {
        setMostrarAnuncioTelaInteira(false);
    };

    // M�todo fallback para inser��o manual de participantes
    const inserirParticipantesManualmente = async (nome, streamer, quantidade, plataforma) => {
        let inseridos = 0;
        let mensagensErro = [];
        
        try {
            // Registrar lote no log para que o trigger de rate limit permita
            await supabase.from("logs").insert([{
                descricao: `Lote autorizado: ${nome} - iniciando ${quantidade} inser��es (fallback)`
            }]);
            
            for (let i = 1; i <= quantidade; i++) {
                try {
                    // Inserir o mesmo nome sem numera��o
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
                        // Pequena pausa entre inser��es para evitar rate limiting
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                } catch (err) {
                    mensagensErro.push(`Exce��o ao inserir ${i}: ${err.message}`);
                }
            }
            
            // Registrar conclus�o do lote
            await supabase.from("logs").insert([{
                descricao: `Conclus�o do lote: ${nome} - inseridos ${inseridos}/${quantidade} (fallback)`
            }]);
            
            // Limpar o formul�rio mas manter a plataforma
            setNovoParticipante({ nome: "", streamer: "", plataforma });
            
            // Definir tempo de espera (300 segundos para o m�todo manual - 5 minutos)
            const expiracao = Date.now() + 300000;
            localStorage.setItem("tempoExpiracao", expiracao.toString());
            setTempoEspera(300);
            
            if (inseridos > 0) {
                mostrarFeedback(t('listaSorteio.participacoesRegistradas', { quantidade: inseridos }), "sucesso");
            } else {
                mostrarFeedback(t('listaSorteio.naoFoiPossivelAdicionar'), "erro");
                console.error("Erros durante inser��o manual:", mensagensErro);
            }
        } catch (error) {
            console.error("Erro na inser��o manual:", error);
            mostrarFeedback(t('listaSorteio.erroAdicionarParticipantesManualmente'), "erro");
        }
        
        return inseridos;
    };

    // Fun��o para mostrar feedback
    const mostrarFeedback = (mensagem, tipo) => {
        setFeedback({ mensagem, tipo, visivel: true });
        
        // Se for uma mensagem de sucesso para participante adicionado, mostrar notifica��o centralizada
        if (tipo === 'sucesso' && mensagem.includes('Participante adicionado')) {
            const notificacao = document.getElementById('notificacao-sucesso');
            if (notificacao) {
                notificacao.textContent = mensagem;
                notificacao.style.display = 'block';
                
                // Esconder ap�s 3 segundos
                setTimeout(() => {
                    notificacao.style.display = 'none';
                }, 3000);
            }
        }
        
        // Esconder o feedback ap�s 3 segundos
        setTimeout(() => {
            setFeedback(prev => ({ ...prev, visivel: false }));
        }, 3000);
    };

    // Fun��o para carregar mais participantes ou retrair a lista
    const alternarMostrarMais = () => {
        if (paginaAtual * itensPorPagina >= participantes.length) {
            // Se j� estamos mostrando todos, voltar para a primeira p�gina
            setPaginaAtual(1);
        } else {
            // Caso contr�rio, avan�ar para a pr�xima p�gina
            setPaginaAtual(paginaAtual + 1);
        }
    };

    // Calcular quais participantes mostrar na p�gina atual
    const participantesPaginados = participantes.slice(0, paginaAtual * itensPorPagina);
    
    // Verificar se h� mais participantes para mostrar
    const temMaisParticipantes = participantes.length > paginaAtual * itensPorPagina;

    // Fun��o para renderizar os participantes com espa�os para propaganda
    const renderizarParticipantesComPropaganda = () => {
        if (!participantesPaginados || participantesPaginados.length === 0) {
            return (
                <tr>
                    <td colSpan="4">{t('listaSorteio.nenhumParticipanteEncontrado')}</td>
                </tr>
            );
        }

        // Criar um array com os participantes e propagandas intercaladas
        const linhasTabela = [];
        
        participantesPaginados.forEach((participante, index) => {
            // Usar o nome completo sem remover os n�meros
            // Isso permite que os n�meros nos nomes sejam exibidos na tabela
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
            
            // Adicionar an�ncio espec�fico entre as linhas 10 e 11
            if (index === 9) {
                linhasTabela.push(
                    <tr key="propaganda-linha-10-11" className="linha-propaganda">
                        <td colSpan="4" className="anuncio-entre-linhas">
                            <Anuncio 
                              tipo="cursos" 
                              posicao="na-tabela" 
                              mostrarFechar={true} 
                              preservarLayout={false}
                              paginaId="lista-sorteio_tabela_linha-10" 
                            />
                        </td>
                    </tr>
                );
            }
            // A cada 10 participantes adicionais (ap�s a linha 11), adicionar uma linha de propaganda do tipo cursos
            else if ((index + 1) % 10 === 0 && index !== 9 && index !== participantesPaginados.length - 1) {
                linhasTabela.push(
                    <tr key={`propaganda-${index}`} className="linha-propaganda">
                        <td colSpan="4" className="anuncio-entre-linhas">
                            <Anuncio 
                              tipo="cursos" 
                              posicao="na-tabela" 
                              mostrarFechar={true} 
                              preservarLayout={false}
                              paginaId={`lista-sorteio_tabela_linha-${index + 1}`} 
                            />
                        </td>
                    </tr>
                );
            }
        });
        
        return linhasTabela;
    };

    return (
        <div className="lista-sorteio">
            {/* Notifica��o de sucesso centralizada */}
            <div id="notificacao-sucesso" className="notificacao-centralizada">
                {t('listaSorteio.participanteAdicionado')}
            </div>
            
            {/* Espa�amento adicionado naturalmente pela margin-bottom do anuncio-container-superior */}
            
            {/* Banner superior - exibido sempre no topo, ap�s o cabe�alho */}
            <div className="anuncio-container-superior">
                <Anuncio 
                  tipo="fixo-superior" 
                  posicao="topo" 
                  mostrarFechar={true}
                  paginaId="lista-sorteio_topo" 
                />
            </div>
            
            <h2>{t('listaSorteio.participantes')}</h2>
            
            {ultimoVencedor && (
                <div className="vencedor-info">
                    <h3><span className="icon-trophy">??</span> {t('listaSorteio.ultimoVencedor')}: {ultimoVencedor.nome}</h3>
                    <div className="vencedor-detalhes">
                        <div className="detalhe">
                            <div className="detalhe-label"><span className="icon-streamer">??</span> {t('listaSorteio.streamer')}</div>
                            <div className="detalhe-valor">{ultimoVencedor.streamer}</div>
                        </div>
                        <div className="detalhe">
                            <div className="detalhe-label"><span className="icon-number">??</span> {t('listaSorteio.numeroSorteado')}</div>
                            <div className="detalhe-valor">{ultimoVencedor.numero}</div>
                        </div>
                        <div className="detalhe">
                            <div className="detalhe-label"><span className="icon-date">??</span> {t('listaSorteio.data')}</div>
                            <div className="detalhe-valor">{ultimoVencedor.data}</div>
                        </div>
                        <div className="detalhe">
                            <div className="detalhe-label"><span className="icon-platform">??</span> {t('listaSorteio.plataforma')}</div>
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

            {/* An�ncio de cursos acima do bot�o Como Participar */}
            <div className="anuncio-sobre-participar">
                <Anuncio 
                  tipo="cursos" 
                  posicao="centro" 
                  mostrarFechar={true}
                  preservarLayout={true}
                  paginaId="lista-sorteio_antes_participar" 
                />
            </div>
            
            {/* Script para verificar se o AdTracker est� registrando este an�ncio */}
            {useEffect(() => {
                console.log("An�ncio 'cursos' acima do bot�o 'Como Participar' montado com pageId: lista-sorteio_antes_participar");
                
                // Verificar no console se o AdTracker est� inicializando este an�ncio
                return () => {
                    console.log("An�ncio 'cursos' acima do bot�o 'Como Participar' desmontado");
                };
            }, [])}

            <button className="como-participar-btn" onClick={() => setMostrarInstrucoes(!mostrarInstrucoes)}>
                {mostrarInstrucoes ? t('listaSorteio.fecharInstrucoes') : t('listaSorteio.instrucoes.title')}
            </button>

            {mostrarInstrucoes && (
                <div className="instrucoes">
                    <p>{t('listaSorteio.instrucoes.info1')}</p>
                    <p>{t('listaSorteio.instrucoes.info2')}</p>
                    <p>{t('listaSorteio.instrucoes.info3')}</p>
                    <p>{t('listaSorteio.instrucoes.info4')}</p>
                </div>
            )}

            <h2>{t('listaSorteio.participantes')} {listaCongelada && `(?? ${t('listaSorteio.listaCongelada')} ??)`}</h2>

            <div className="formulario form-horizontal">
                <input
                    type="text"
                    placeholder={t('listaSorteio.nome')}
                    value={novoParticipante.nome}
                    onChange={(e) => handleInputChange(e, 'nome')}
                    disabled={listaCongelada}
                    maxLength={25}
                />
                <input
                    type="text"
                    placeholder={t('listaSorteio.streamer')}
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
                <button onClick={adicionarDezParticipantes} disabled={tempoEspera > 0 || listaCongelada}>
                    {listaCongelada ? `${t('listaSorteio.listaCongelada')} ??` : tempoEspera > 0 ? t('listaSorteio.aguarde', { segundos: tempoEspera }) : t('listaSorteio.adicionar10Participantes')}
                </button>
                <button onClick={adicionarParticipante} disabled={tempoEspera > 0 || listaCongelada}>
                    {listaCongelada ? `${t('listaSorteio.listaCongelada')} ??` : tempoEspera > 0 ? t('listaSorteio.aguarde', { segundos: tempoEspera }) : t('listaSorteio.adicionarParticipante')}
                </button>
            </div>

            {/* Banner de an�ncio no topo da lista */}
            <Anuncio 
              tipo="cursos" 
              posicao="principal" 
              mostrarFechar={true} 
              preservarLayout={true}
              paginaId="lista-sorteio_principal" 
            />

            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>{t('listaSorteio.nome')}</th>
                        <th>{t('listaSorteio.streamer')}</th>
                        <th>??</th>
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
                    {temMaisParticipantes ? t('listaSorteio.mostrarMais') : t('listaSorteio.mostrarMenos')}
                </button>
            )}

            {/* An�ncio de v�deo no final da lista */}
            <Anuncio 
              tipo="video" 
              posicao="rodape" 
              mostrarFechar={true}
              paginaId="lista-sorteio_rodape" 
            />

            {/* An�ncio de tela inteira quando o bot�o +10 � clicado */}
            {mostrarAnuncioTelaInteira && (
                <Anuncio 
                    tipo="tela-inteira"
                    titulo="PROMO��O EXCLUSIVA"
                    descricao="Para adicionar +10 participa��es, confira nossa oferta especial"
                    urlDestino="#"
                    imagemSrc="/images/promo.jpg" // Opcional: O caminho para a imagem do an�ncio
                    mostrarFechar={true}
                    avisos="Ao clicar voc� concorda com os termos de uso."
                    onFechar={() => {
                        setMostrarAnuncioTelaInteira(false);
                    }}
                />
            )}
        </div>
    );
}

export default ListaSorteio;
