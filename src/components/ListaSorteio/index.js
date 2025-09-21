import React, { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next'; // Importar hook de tradução
import { getSupabaseClient } from "../../lib/supabaseManager"; // Importando gerenciador otimizado
import { usePaginatedParticipants } from "../../hooks/usePaginatedParticipants"; // Hook de paginação otimizada

// Usar cliente otimizado para operações de frontend
const supabase = getSupabaseClient();
import "./ListaSorteio.css"; // Importando o CSS
import Anuncio from "../Anuncio"; // Importando o componente de anúncio
import PlataformaIcon from "../PlataformaIcon"; // Importando o componente de ícone de plataforma

// Função de sanitização de entrada (atualizada para suportar Unicode)
const sanitizarEntrada = (texto) => {
  if (!texto) return "";
  let sanitizado = texto
    // Remove apenas caracteres realmente perigosos, mas permite letras e números de qualquer idioma
    .replace(/[<>'"\\/\{\}\[\];\(\)]/g, '') // Remove caracteres potencialmente perigosos incluindo parênteses
    .replace(/--/g, '_')                      // Remove possíveis injeções SQL
    .replace(/script/gi, '')                  // Remove tentativas de XSS
    .trim();                                  // Remove espaços extras
  // Limitar comprimento
  return sanitizado.substring(0, 25);
};

function ListaSorteio({ onReiniciarLista }) {
    const { t } = useTranslation(); // Hook de tradução
    
    // ✅ MELHORIA: Hook de paginação otimizada no modo acumulativo (como era antes!)
    const {
        participantes,
        isLoading: participantesLoading,
        allParticipants,
        fetchAllParticipantsForSorteio,
        totalParticipants,
        mostrarMais,
        mostrarMenos,
        mostrandoTodos,
        participantesCarregados,
        refresh: refreshParticipantes
    } = usePaginatedParticipants(10, 'cumulative'); // 10 por página, modo acumulativo
    
    // ✅ PRESERVA: Estados originais necessários para funcionalidades
    const [novoParticipante, setNovoParticipante] = useState({ nome: "", streamer: "", plataforma: "twitch" });
    const [tempoEspera, setTempoEspera] = useState(0);
    const [listaCongelada, setListaCongelada] = useState(false);
    const [sorteioRealizado, setSorteioRealizado] = useState(false);
    const [ultimoVencedor, setUltimoVencedor] = useState(null);
    const [mostrarInstrucoes, setMostrarInstrucoes] = useState(false);
    const [feedback, setFeedback] = useState({ mensagem: "", tipo: "", visivel: false });
    const [ultimaAtualizacao, setUltimaAtualizacao] = useState(Date.now());
    
    // ✅ PRESERVA: Estados para anúncios
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

    // ✅ MANTÉM: Função compatível para casos especiais (agora usa hook)
    const fetchParticipantes = async () => {
        console.log("🔄 Atualizando participantes via hook otimizado...");
        refreshParticipantes();
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

    // ✅ PRESERVA: Carrega dados iniciais e configura realtime otimizado
    useEffect(() => {
        // Verificar se há um último vencedor no localStorage
        const vencedorSalvo = localStorage.getItem("ultimoVencedor");
        if (vencedorSalvo && !ultimoVencedor) {
            setUltimoVencedor(JSON.parse(vencedorSalvo));
        }
        
        // Carregar dados iniciais (participantes já são carregados pelo hook)
        fetchUltimoVencedor();
        verificarListaCongelada();
        
        // ✅ MELHORIA: Realtime adicional para sorteios e configurações
        const sessionId = Math.random().toString(36).substring(2, 15);
        const additionalChannel = supabase
            .channel(`sorteio-additional-${sessionId}`)
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
            supabase.removeChannel(additionalChannel);
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
        // ✅ PRESERVA: Lógica original, mas usa dados completos para sorteio
        const todosParticipantes = await fetchAllParticipantsForSorteio();
        
        if (todosParticipantes.length === 0) {
            mostrarFeedback(t('listaSorteio.nenhumParticipante'), "erro");
            return;
        }

        const vencedorIndex = Math.floor(Math.random() * todosParticipantes.length);
        const vencedor = todosParticipantes[vencedorIndex];
        
        // Obter a data atual no formato correto
        const dataAtual = new Date();
        const dataFormatada = dataAtual.toLocaleDateString('pt-BR');
        
        // Gerar um número baseado no índice do participante na lista (1-based)
        // Assim garantimos que o número sorteado corresponde a um participante real
        const numeroSorteado = vencedorIndex + 1;
        
        const dadosVencedor = {
            nome: vencedor.nome_twitch,
            streamer: vencedor.streamer_escolhido,
            numero: numeroSorteado, // Usar o número baseado no índice real do participante
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
                    numero: numeroSorteado, // Usar o número baseado no índice real do participante
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
                
                // ✅ PRESERVA: Histórico completo usando todos os participantes
                const participantesHistorico = todosParticipantes.map((participante, index) => ({
                    sorteio_id: sorteioId,
                    nome_twitch: participante.nome_twitch,
                    streamer_escolhido: participante.streamer_escolhido,
                    plataforma_premio: participante.plataforma_premio || "twitch",
                    posicao_original: index + 1 // Adicionando a posição original (começando em 1)
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
        // ✅ PRESERVA: Lógica original de limpeza
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
        mostrarFeedback(t('listaSorteio.listaResetada'), "sucesso");
        
        // ✅ MELHORIA: Atualização via hook otimizado
        refreshParticipantes();
        fetchUltimoVencedor();
        verificarListaCongelada();
        setUltimaAtualizacao(Date.now());
    };

    // Handler modificado para sanitizar entradas em tempo real
    const handleInputChange = (e, field) => {
        const valor = sanitizarEntrada(e.target.value);
        setNovoParticipante({ ...novoParticipante, [field]: valor });
    };

    // 🔒 **Função para verificar rate limiting no servidor**
    const verificarLimiteServidor = async (tipoOperacao = 'participante_add_individual') => {
        try {
            console.log(`🔍 Verificando rate limit servidor-side: ${tipoOperacao}`);
            
            const response = await fetch('/api/verificar-rate-limit', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ tipo: tipoOperacao })
            });
            
            const resultado = await response.json();
            
            if (response.ok) {
                console.log(`✅ Rate limit verificado:`, resultado);
                return resultado;
            } else {
                console.warn(`⚠️ Rate limit bloqueado:`, resultado);
                return resultado;
            }
            
        } catch (error) {
            console.error('❌ Erro ao verificar limite servidor:', error);
            // Fail-safe: permitir em caso de erro de rede
            return { 
                permitido: true, 
                mensagem: 'Verificação com erro, prosseguindo...', 
                falha_segura: true 
            };
        }
    };

    // ➕ **Função para adicionar participante**
    const adicionarParticipante = async () => {
        // Validações básicas
        if (!novoParticipante.nome || !novoParticipante.streamer) {
            mostrarFeedback(t('listaSorteio.preenchaTodosCampos'), "erro");
            return;
        }

        // 🔒 **NOVA VERIFICAÇÃO: Rate limiting servidor-side**
        const limiteSevidor = await verificarLimiteServidor('participante_add_individual');
        if (!limiteSevidor.permitido && !limiteSevidor.falha_segura) {
            const mensagemErro = limiteSevidor.mensagem || 'Aguarde antes de adicionar outro participante';
            mostrarFeedback(`🔒 ${mensagemErro}`, "erro");
            
            // Se há próximo tempo permitido, mostrar contador
            if (limiteSevidor.proximoPermitido) {
                const proximoTempo = new Date(limiteSevidor.proximoPermitido);
                const agora = new Date();
                const segundosRestantes = Math.ceil((proximoTempo - agora) / 1000);
                
                if (segundosRestantes > 0) {
                    setTempoEspera(segundosRestantes);
                    localStorage.setItem("tempoExpiracao", proximoTempo.getTime().toString());
                }
            }
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
            
            // Limpar o formulário, mas manter a plataforma selecionada
            setNovoParticipante({ nome: "", streamer: "", plataforma: plataformaSelecionada });
            
            // Definir tempo de espera (60 segundos - 1 minuto) como backup do frontend
            const expiracao = Date.now() + 60000;
            localStorage.setItem("tempoExpiracao", expiracao.toString());
            setTempoEspera(60);

            // ✅ MELHORIA: Atualização otimizada via hook
            refreshParticipantes();

            // Mostrar feedback de sucesso
            mostrarFeedback(t('listaSorteio.participanteAdicionado'), "sucesso");

        } catch (error) {
            console.error("Erro ao adicionar participante:", error);
            mostrarFeedback(`${t('listaSorteio.erro')}: ${error.message}`, "erro");
        }
    };

    // Função para adicionar participantes de uma vez - atualizada para mostrar anúncio de tela inteira
    const adicionarDezParticipantes = async () => {
        if (!novoParticipante.nome || !novoParticipante.streamer) {
            mostrarFeedback(t('listaSorteio.preenchaTodosCampos'), "erro");
            return;
        }

        if (listaCongelada) {
            mostrarFeedback(t('listaSorteio.listaCongelada'), "erro");
            return;
        }

        // 🔒 **NOVA VERIFICAÇÃO: Rate limiting servidor-side para operação em lote**
        const limiteSevidor = await verificarLimiteServidor('lote');
        if (!limiteSevidor.permitido && !limiteSevidor.falha_segura) {
            const mensagemErro = limiteSevidor.mensagem || 'Aguarde antes de adicionar participantes em lote';
            mostrarFeedback(`🔒 ${mensagemErro}`, "erro");
            
            // Se há próximo tempo permitido, mostrar contador
            if (limiteSevidor.proximoPermitido) {
                const proximoTempo = new Date(limiteSevidor.proximoPermitido);
                const agora = new Date();
                const segundosRestantes = Math.ceil((proximoTempo - agora) / 1000);
                
                if (segundosRestantes > 0) {
                    setTempoEspera(segundosRestantes);
                    localStorage.setItem("tempoExpiracao", proximoTempo.getTime().toString());
                }
            }
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
            
            // Chamar a função RPC CORRIGIDA do Supabase que usa IP real e insere 10 participantes
            const { data, error } = await supabase.rpc('inserir_participantes_com_ip_real_corrigido', {
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
                // Limpar o formulário
                setNovoParticipante({ nome: "", streamer: "", plataforma: plataformaSelecionada });
                
                // Definir tempo de espera (300 segundos - 5 minutos) como backup do frontend
                const expiracao = Date.now() + 300000;
                localStorage.setItem("tempoExpiracao", expiracao.toString());
                setTempoEspera(300);
                
                // Mostrar mensagem de sucesso com o número real de inserções
                if (data && data.sucesso) {
                    const quantidade = data.inseridos || 10;
                    mostrarFeedback(t('listaSorteio.participacoesRegistradas', { quantidade }), "sucesso");
                } else if (data) {
                    // Se a operação falhou mas retornou uma mensagem
                    mostrarFeedback(data.mensagem || t('listaSorteio.erroAdicionarParticipantes'), "erro");
                } else {
                    mostrarFeedback(t('listaSorteio.dezParticipacoesRegistradas'), "sucesso");
                }
            }
            
            // ✅ MELHORIA: Atualização otimizada via hook
            refreshParticipantes();
            
        } catch (error) {
            console.error("Erro ao adicionar participantes:", error);
            mostrarFeedback(`${t('listaSorteio.erro')}: ${error.message}`, "erro");
        }

        // Mostrar anúncio de tela inteira após processar as entradas
        setMostrarAnuncioTelaInteira(true);
        
        // Registrar a exibição do anúncio para métricas
        try {
            await supabase.from("metricas_anuncios").insert([{
                tipo_anuncio: "botao_mais_10",
                usuario_info: {
                    nome: nomeSanitizado,
                    streamer: streamerSanitizado,
                    plataforma: plataformaSelecionada
                },
                detalhes: `Usuário adicionou 10 participações - Nome: ${nomeSanitizado}`
            }]);
        } catch (error) {
            console.error("Erro ao registrar métrica de anúncio:", error);
        }
    };

    // Função simplificada apenas para fechar o anúncio
    const processarAdicaoParticipantes = () => {
        setMostrarAnuncioTelaInteira(false);
    };

    // Método fallback para inserção manual de participantes - DESABILITADO
    // Este fallback foi desabilitado porque não respeita o rate limiting por IP
    const inserirParticipantesManualmente = async (nome, streamer, quantidade, plataforma) => {
        console.warn("⚠️ Fallback manual desabilitado por segurança - use apenas função RPC com IP");
        
        mostrarFeedback("Erro: Método de inserção não seguro. Tente novamente.", "erro");
        
        return 0; // Nenhum participante inserido
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

    // ✅ RESTAURADO: Sistema de "mostrar mais" como era antes (mas otimizado!)
    // Participantes são acumulados conforme carrega mais páginas
    const participantesPaginados = participantes;
    
    // ✅ RESTAURADO: Lógica igual ao sistema antigo
    const temMaisParticipantes = !mostrandoTodos;

    // Função para renderizar os participantes com espaços para propaganda
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
            // A cada 10 participantes adicionais (após a linha 11), adicionar uma linha de propaganda do tipo cursos
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
            {/* Notificação de sucesso centralizada */}
            <div id="notificacao-sucesso" className="notificacao-centralizada">
                {t('listaSorteio.participanteAdicionado')}
            </div>
            
            {/* Espaçamento adicionado naturalmente pela margin-bottom do anuncio-container-superior */}
            
            {/* Banner superior - exibido sempre no topo, após o cabeçalho */}
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
                    <h3><span className="icon-trophy">🏆</span> {t('listaSorteio.ultimoVencedor')}: {ultimoVencedor.nome}</h3>
                    <div className="vencedor-detalhes">
                        <div className="detalhe">
                            <div className="detalhe-label"><span className="icon-streamer">🎥</span> {t('listaSorteio.streamer')}</div>
                            <div className="detalhe-valor">{ultimoVencedor.streamer}</div>
                        </div>
                        <div className="detalhe">
                            <div className="detalhe-label"><span className="icon-number">🔢</span> {t('listaSorteio.numeroSorteado')}</div>
                            <div className="detalhe-valor">{ultimoVencedor.numero}</div>
                        </div>
                        <div className="detalhe">
                            <div className="detalhe-label"><span className="icon-date">📅</span> {t('listaSorteio.data')}</div>
                            <div className="detalhe-valor">{ultimoVencedor.data}</div>
                        </div>
                        <div className="detalhe">
                            <div className="detalhe-label"><span className="icon-platform">🎥</span> {t('listaSorteio.plataforma')}</div>
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

            {/* Anúncio de cursos acima do botão Como Participar */}
            <div className="anuncio-sobre-participar">
                <Anuncio 
                  tipo="cursos" 
                  posicao="centro" 
                  mostrarFechar={true}
                  preservarLayout={true}
                  paginaId="lista-sorteio_antes_participar" 
                />
            </div>
            
            {/* Script para verificar se o AdTracker está registrando este anúncio */}
            {useEffect(() => {
                console.log("Anúncio 'cursos' acima do botão 'Como Participar' montado com pageId: lista-sorteio_antes_participar");
                
                // Verificar no console se o AdTracker está inicializando este anúncio
                return () => {
                    console.log("Anúncio 'cursos' acima do botão 'Como Participar' desmontado");
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

            <h2>{t('listaSorteio.participantes')} {listaCongelada && `(❄️ ${t('listaSorteio.listaCongelada')} ❄️)`}</h2>

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
                    {listaCongelada ? `${t('listaSorteio.listaCongelada')} ❄️` : tempoEspera > 0 ? t('listaSorteio.aguarde', { segundos: tempoEspera }) : t('listaSorteio.adicionar10Participantes')}
                </button>
                <button onClick={adicionarParticipante} disabled={tempoEspera > 0 || listaCongelada}>
                    {listaCongelada ? `${t('listaSorteio.listaCongelada')} ❄️` : tempoEspera > 0 ? t('listaSorteio.aguarde', { segundos: tempoEspera }) : t('listaSorteio.adicionarParticipante')}
                </button>
            </div>

            {/* Banner de anúncio no topo da lista */}
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
                        <th>🎥</th>
                    </tr>
                </thead>
                <tbody>
                    {renderizarParticipantesComPropaganda()}
                </tbody>
            </table>

            {/* ✅ RESTAURADO: Botão "Mostrar Mais" como era antes (mas com performance otimizada!) */}
            {totalParticipants > 10 && (
                <button 
                    className={`botao-mostrar-mais ${!temMaisParticipantes ? 'mostrar-menos' : ''}`} 
                    onClick={temMaisParticipantes ? mostrarMais : mostrarMenos}
                    disabled={participantesLoading}
                >
                    {participantesLoading ? 
                        'Carregando...' : 
                        (temMaisParticipantes ? 
                            t('listaSorteio.mostrarMais') || 'Mostrar Mais' : 
                            t('listaSorteio.mostrarMenos') || 'Mostrar Menos'
                        )
                    }
                </button>
            )}

            {/* Anúncio de vídeo no final da lista */}
            <Anuncio 
              tipo="video" 
              posicao="rodape" 
              mostrarFechar={true}
              paginaId="lista-sorteio_rodape" 
            />

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
                    }}
                />
            )}
        </div>
    );
}

export default ListaSorteio;
