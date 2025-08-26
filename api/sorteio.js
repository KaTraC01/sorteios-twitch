// Função serverless para realizar o sorteio automaticamente
// Esta função será executada por um cron job da Vercel

import { getSupabaseServiceClient, sanitizarEntrada } from '../src/lib/supabaseManager';
import logger from '../lib/logger';
import { errorResponse, successResponse, withErrorHandling } from '../lib/apiResponse';

// Usar cliente de serviço otimizado para sorteio automático
const supabase = getSupabaseServiceClient();

async function handler(req, res) {
  try {
    logger.api('sorteio', `Iniciando função às ${new Date().toISOString()}`);
    logger.debug(`Método ${req.method}, Body: ${JSON.stringify(req.body || {})}`);
    
    // Verificar se é uma requisição autorizada
    // Você pode adicionar uma chave de API ou outro método de autenticação aqui
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Erro de autorização - header inválido ou ausente');
      return errorResponse(res, 401, 'Não autorizado', 'Header de autorização inválido ou ausente');
    }
    
    const token = authHeader.split(' ')[1];
    if (token !== process.env.API_SECRET_KEY) {
      logger.warn('Erro de autorização - token inválido');
      return errorResponse(res, 401, 'Token inválido', 'O token fornecido não corresponde ao esperado');
    }
    logger.debug('Autorização validada com sucesso');

    // Verificar o método da requisição
    if (req.method === 'POST') {
      // Determinar qual ação executar com base no parâmetro de ação
      const { action } = req.body;
      logger.debug(`Ação solicitada: "${action}"`);

      if (action === 'sorteio') {
        logger.info('Iniciando execução do sorteio');
        const resultado = await realizarSorteio();
        logger.info(`Sorteio finalizado com sucesso, vencedor: ${resultado.vencedor?.nome || 'N/A'}`);
        return successResponse(res, 'Sorteio realizado com sucesso', { resultado });
      } 
      else if (action === 'resetar') {
        logger.info('Iniciando reset da lista');
        await resetarLista();
        logger.info('Lista resetada com sucesso');
        return successResponse(res, 'Lista resetada com sucesso');
      }
      else if (action === 'congelar') {
        // A funcionalidade de congelar foi removida do projeto
        logger.debug('Ação "congelar" foi solicitada, mas esta funcionalidade foi desativada');
        return successResponse(res, 'Função de congelamento foi desativada');
      }
      else if (action === 'diagnostico') {
        // Nova ação para diagnóstico do cron job
        logger.info('Executando diagnóstico');
        
        // Verificar a conexão com o Supabase
        let statusSupabase = 'não testado';
        try {
          const { data, error } = await supabase.from('configuracoes').select('*').limit(1);
          if (error) {
            statusSupabase = `erro: ${error.message}`;
          } else {
            statusSupabase = `ok (${data?.length || 0} registros retornados)`;
          }
        } catch (err) {
          statusSupabase = `erro crítico: ${err.message}`;
        }
        
        // Coleta informações sobre o ambiente
        const diagnosticoInfo = {
          timestamp: new Date().toISOString(),
          status_api: 'funcionando',
          auth: 'válida',
          supabase_conexao: statusSupabase,
          ambiente: {
            vercel_env: process.env.VERCEL_ENV || 'local',
            hora_server: new Date().toISOString()
          },
          variaveis: {
            supabase_url_configurada: !!process.env.SUPABASE_URL,
            supabase_key_configurada: !!process.env.SUPABASE_SERVICE_KEY,
            api_secret_key_configurada: !!process.env.API_SECRET_KEY
          }
        };
        
        logger.debug('Diagnóstico concluído:', diagnosticoInfo);
        return successResponse(res, 'Diagnóstico realizado com sucesso', { diagnostico: diagnosticoInfo });
      }
      else {
        logger.warn(`Ação inválida recebida: "${action}"`);
        return errorResponse(res, 400, 'Ação inválida', `A ação '${action}' não é reconhecida`);
      }
    } else {
      // Se não for POST, retornar erro
      logger.warn(`Método inválido: ${req.method}`);
      return errorResponse(res, 405, 'Método não permitido', `O método ${req.method} não é suportado por esta API`);
    }
  } catch (error) {
    logger.critical('ERRO CRÍTICO:', error);
    return errorResponse(res, 500, 'Ocorreu um erro interno no servidor', error);
  } finally {
    logger.api('sorteio', `Função finalizada às ${new Date().toISOString()}`);
  }
}

// Função para realizar o sorteio
async function realizarSorteio() {
  // Buscar todos os participantes
  logger.debug('Buscando participantes no Supabase');
  const { data: participantes, error: erroParticipantes } = await supabase
    .from("participantes_ativos")
    .select("*");

  if (erroParticipantes) {
    logger.error(`ERRO ao buscar participantes: ${erroParticipantes.message}`);
    throw new Error(`Erro ao buscar participantes: ${erroParticipantes.message}`);
  }

  logger.info(`Total de participantes encontrados: ${participantes?.length || 0}`);
  
  if (!participantes || participantes.length === 0) {
    logger.warn("Nenhum participante na lista. O sorteio foi cancelado.");
    return { realizado: false, mensagem: "Nenhum participante na lista" };
  }

  // Selecionar um vencedor aleatório
  const vencedorIndex = Math.floor(Math.random() * participantes.length);
  const vencedor = participantes[vencedorIndex];
  
  // Sanitizar dados do vencedor antes de salvar
  const nomeSanitizado = sanitizarEntrada(vencedor.nome_twitch || "");
  const streamerSanitizado = sanitizarEntrada(vencedor.streamer_escolhido || "");
  
  logger.info(`Vencedor sorteado: ${nomeSanitizado} (índice ${vencedorIndex})`);
  
  // Obter a data atual no fuso horário de Brasília
  const dataAtual = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
  const dataHoraBrasil = new Date(dataAtual);
  logger.debug(`Data do sorteio: ${dataHoraBrasil.toISOString()}`);

  // Salvar o resultado do sorteio no Supabase
  logger.debug('Salvando resultado no Supabase');
  const { data: sorteioSalvo, error: erroSorteio } = await supabase
    .from("sorteios")
    .insert([
      {
        data: dataHoraBrasil.toISOString(),
        numero: vencedorIndex + 1,
        nome: nomeSanitizado,
        streamer: streamerSanitizado,
      },
    ])
    .select();

  if (erroSorteio) {
    logger.error(`ERRO ao salvar o sorteio: ${erroSorteio.message}`);
    throw new Error(`Erro ao salvar o sorteio: ${erroSorteio.message}`);
  }

  logger.info(`Sorteio salvo com sucesso - ID: ${sorteioSalvo?.[0]?.id || 'N/A'}`);

  // Salvar a lista completa de participantes no histórico
  if (sorteioSalvo && sorteioSalvo.length > 0) {
    const sorteioId = sorteioSalvo[0].id;
    logger.debug(`Preparando histórico de participantes para sorteio ID ${sorteioId}`);
    
    // Prepara os dados dos participantes para inserção no histórico
    const participantesHistorico = participantes.map((participante, index) => ({
      sorteio_id: sorteioId,
      nome_twitch: sanitizarEntrada(participante.nome_twitch || ""),
      streamer_escolhido: sanitizarEntrada(participante.streamer_escolhido || ""),
      posicao_original: index + 1 // Adicionando a posição original (começando em 1)
    }));
    
    logger.debug(`Salvando ${participantesHistorico.length} participantes no histórico`);
    
    // Insere todos os participantes no histórico
    const { error: erroHistorico } = await supabase
      .from("historico_participantes")
      .insert(participantesHistorico);
      
    if (erroHistorico) {
      logger.error(`ERRO ao salvar histórico de participantes: ${erroHistorico.message}`);
      throw new Error(`Erro ao salvar histórico de participantes: ${erroHistorico.message}`);
    }
    
    logger.info(`Histórico de participantes salvo com sucesso`);
  }
  
  // Resetar a lista de participantes ativos após o sorteio
  try {
    logger.debug('Limpando lista de participantes ativos');
    await resetarLista();
    logger.info('Lista de participantes ativos resetada com sucesso');
  } catch (erroReset) {
    logger.error(`ERRO ao resetar lista após sorteio: ${erroReset.message}`);
    // Não lançamos um erro aqui para não invalidar o sorteio que já foi realizado
  }

  return { 
    realizado: true, 
    vencedor: {
      nome: nomeSanitizado,
      streamer: streamerSanitizado,
      indice: vencedorIndex
    },
    sorteioId: sorteioSalvo?.[0]?.id
  };
}

// Função para resetar a lista de participantes
async function resetarLista() {
  logger.debug('Executando reset da lista de participantes');
  
  const { error } = await supabase
    .from("participantes_ativos")
    .delete()
    .neq("id", 0); // Isso fará com que todos os registros sejam deletados
  
  if (error) {
    logger.error(`ERRO ao resetar lista: ${error.message}`);
    throw new Error(`Erro ao resetar lista: ${error.message}`);
  }
  
  logger.info('Lista de participantes resetada com sucesso');
  return true;
}

// Exportar o handler com o middleware de tratamento de erros
export default withErrorHandling(handler); 