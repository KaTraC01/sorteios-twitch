// Função serverless para realizar o sorteio automaticamente
// Esta função será executada por um cron job da Vercel

import { createClient } from "@supabase/supabase-js";
import { sanitizarEntrada } from '../lib/supabaseClient';

// Configuração do Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Verificar se as variáveis necessárias estão configuradas
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('ERRO CRÍTICO: As variáveis de ambiente SUPABASE_URL e/ou SUPABASE_SERVICE_KEY não estão configuradas.');
}

// Log das configurações (reduzidas para não expor a chave completa)
console.log(`SORTEIO-API DEBUG: Config - URL configurada: ${SUPABASE_URL ? 'Sim' : 'Não'}`);
console.log(`SORTEIO-API DEBUG: Config - KEY configurada: ${SUPABASE_SERVICE_KEY ? 'Sim (últimos 4 caracteres: ' + (SUPABASE_SERVICE_KEY ? SUPABASE_SERVICE_KEY.slice(-4) : 'N/A') + ')' : 'NÃO CONFIGURADA'}`);

// Criando o cliente Supabase com a chave de serviço para acesso total
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  try {
    console.log(`===== SORTEIO-API DEBUG: Iniciando função às ${new Date().toISOString()} =====`);
    console.log(`SORTEIO-API DEBUG: Método ${req.method}, Body: ${JSON.stringify(req.body || {})}`);
    
    // Verificar se é uma requisição autorizada
    // Você pode adicionar uma chave de API ou outro método de autenticação aqui
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('SORTEIO-API DEBUG: Erro de autorização - header inválido ou ausente');
      return res.status(401).json({ error: 'Não autorizado' });
    }
    
    const token = authHeader.split(' ')[1];
    if (token !== process.env.API_SECRET_KEY) {
      console.log('SORTEIO-API DEBUG: Erro de autorização - token inválido');
      return res.status(401).json({ error: 'Token inválido' });
    }
    console.log('SORTEIO-API DEBUG: Autorização validada com sucesso');

    // Verificar o método da requisição
    if (req.method === 'POST') {
      // Determinar qual ação executar com base no parâmetro de ação
      const { action } = req.body;
      console.log(`SORTEIO-API DEBUG: Ação solicitada: "${action}"`);

      if (action === 'sorteio') {
        console.log('SORTEIO-API DEBUG: Iniciando execução do sorteio');
        const resultado = await realizarSorteio();
        console.log(`SORTEIO-API DEBUG: Sorteio finalizado com resultado: ${JSON.stringify(resultado)}`);
        return res.status(200).json({ success: true, message: 'Sorteio realizado com sucesso', resultado });
      } 
      else if (action === 'resetar') {
        console.log('SORTEIO-API DEBUG: Iniciando reset da lista');
        await resetarLista();
        console.log('SORTEIO-API DEBUG: Lista resetada com sucesso');
        return res.status(200).json({ success: true, message: 'Lista resetada com sucesso' });
      }
      else if (action === 'congelar') {
        // A funcionalidade de congelar foi removida do projeto
        console.log('SORTEIO-API DEBUG: Ação "congelar" foi solicitada, mas esta funcionalidade foi desativada');
        return res.status(200).json({ success: true, message: 'Função de congelamento foi desativada' });
      }
      else if (action === 'diagnostico') {
        // Nova ação para diagnóstico do cron job
        console.log('SORTEIO-API DEBUG: Executando diagnóstico');
        
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
            node_version: process.version,
            vercel_env: process.env.VERCEL_ENV || 'local',
            hora_server: new Date().toISOString()
          },
          variaveis: {
            supabase_url_configurada: !!process.env.SUPABASE_URL,
            supabase_key_configurada: !!process.env.SUPABASE_SERVICE_KEY,
            api_secret_key_configurada: !!process.env.API_SECRET_KEY
          }
        };
        
        console.log('SORTEIO-API DEBUG: Diagnóstico concluído:', JSON.stringify(diagnosticoInfo, null, 2));
        return res.status(200).json({ 
          success: true, 
          message: 'Diagnóstico realizado com sucesso', 
          diagnostico: diagnosticoInfo 
        });
      }
      else {
        console.log(`SORTEIO-API DEBUG: Ação inválida recebida: "${action}"`);
        return res.status(400).json({ error: 'Ação inválida' });
      }
    } else {
      // Se não for POST, retornar erro
      console.log(`SORTEIO-API DEBUG: Método inválido: ${req.method}`);
      return res.status(405).json({ error: 'Método não permitido' });
    }
  } catch (error) {
    console.error('SORTEIO-API DEBUG: ERRO CRÍTICO:', error);
    return res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  } finally {
    console.log(`===== SORTEIO-API DEBUG: Função finalizada às ${new Date().toISOString()} =====`);
  }
}

// Função para realizar o sorteio
async function realizarSorteio() {
  // Buscar todos os participantes
  console.log('SORTEIO-API DEBUG: Buscando participantes no Supabase');
  const { data: participantes, error: erroParticipantes } = await supabase
    .from("participantes_ativos")
    .select("*");

  if (erroParticipantes) {
    console.log(`SORTEIO-API DEBUG: ERRO ao buscar participantes - ${erroParticipantes.message}`);
    throw new Error(`Erro ao buscar participantes: ${erroParticipantes.message}`);
  }

  console.log(`SORTEIO-API DEBUG: Total de participantes encontrados: ${participantes?.length || 0}`);
  
  if (!participantes || participantes.length === 0) {
    console.log("SORTEIO-API DEBUG: Nenhum participante na lista. O sorteio foi cancelado.");
    return { realizado: false, mensagem: "Nenhum participante na lista" };
  }

  // Selecionar um vencedor aleatório
  const vencedorIndex = Math.floor(Math.random() * participantes.length);
  const vencedor = participantes[vencedorIndex];
  
  // Sanitizar dados do vencedor antes de salvar
  const nomeSanitizado = sanitizarEntrada(vencedor.nome_twitch);
  const streamerSanitizado = sanitizarEntrada(vencedor.streamer_escolhido);
  
  console.log(`SORTEIO-API DEBUG: Vencedor sorteado - ${nomeSanitizado} (índice ${vencedorIndex})`);
  
  // Obter a data atual no fuso horário de Brasília
  const dataAtual = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
  const dataHoraBrasil = new Date(dataAtual);
  console.log(`SORTEIO-API DEBUG: Data do sorteio - ${dataHoraBrasil.toISOString()}`);

  // Salvar o resultado do sorteio no Supabase
  console.log('SORTEIO-API DEBUG: Salvando resultado no Supabase');
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
    console.log(`SORTEIO-API DEBUG: ERRO ao salvar o sorteio - ${erroSorteio.message}`);
    throw new Error(`Erro ao salvar o sorteio: ${erroSorteio.message}`);
  }

  console.log(`SORTEIO-API DEBUG: Sorteio salvo com sucesso - ID: ${sorteioSalvo?.[0]?.id || 'N/A'}`);

  // Salvar a lista completa de participantes no histórico
  if (sorteioSalvo && sorteioSalvo.length > 0) {
    const sorteioId = sorteioSalvo[0].id;
    console.log(`SORTEIO-API DEBUG: Preparando histórico de participantes para sorteio ID ${sorteioId}`);
    
    // Prepara os dados dos participantes para inserção no histórico
    const participantesHistorico = participantes.map((participante, index) => ({
      sorteio_id: sorteioId,
      nome_twitch: sanitizarEntrada(participante.nome_twitch),
      streamer_escolhido: sanitizarEntrada(participante.streamer_escolhido),
      posicao_original: index + 1 // Adicionando a posição original (começando em 1)
    }));
    
    console.log(`SORTEIO-API DEBUG: Salvando ${participantesHistorico.length} participantes no histórico`);
    
    // Insere todos os participantes no histórico
    const { error: erroHistorico } = await supabase
      .from("historico_participantes")
      .insert(participantesHistorico);
      
    if (erroHistorico) {
      console.log(`SORTEIO-API DEBUG: ERRO ao salvar histórico - ${erroHistorico.message}`);
      throw new Error(`Erro ao salvar histórico de participantes: ${erroHistorico.message}`);
    }
    
    console.log('SORTEIO-API DEBUG: Histórico de participantes salvo com sucesso');
  }

  console.log(`SORTEIO-API DEBUG: Sorteio realizado com sucesso. Vencedor: ${nomeSanitizado}`);
  
  // Resetar a lista após o sorteio
  console.log('SORTEIO-API DEBUG: Resetando lista de participantes');
  await resetarLista();
  
  return { 
    realizado: true, 
    vencedor: {
      nome: nomeSanitizado,
      streamer: streamerSanitizado,
      numero: vencedorIndex + 1,
      data: dataHoraBrasil.toISOString()
    }
  };
}

// Função para resetar a lista
async function resetarLista() {
  console.log('SORTEIO-API DEBUG: Executando exclusão de participantes ativos');
  
  try {
    // Tentativa 1: Usar nossa nova função segura que foi criada especificamente para resolver este problema
    console.log('SORTEIO-API DEBUG: Tentando usar função segura limpar_participantes_seguro');
    const { error: safeError } = await supabase.rpc('limpar_participantes_seguro');
    
    if (!safeError) {
      console.log('SORTEIO-API DEBUG: Lista resetada com sucesso via função segura');
      return;
    }
    
    console.log(`SORTEIO-API DEBUG: Erro na função segura: ${safeError.message}, tentando alternativa...`);
    
    // Tentativa 2: Usar a RPC resetar_participantes_ativos
    console.log('SORTEIO-API DEBUG: Tentando usar RPC resetar_participantes_ativos');
    const { error: rpcError } = await supabase.rpc('resetar_participantes_ativos');
    
    if (!rpcError) {
      console.log('SORTEIO-API DEBUG: Lista resetada com sucesso via RPC');
      return;
    }
    
    console.log(`SORTEIO-API DEBUG: Falha na RPC: ${rpcError.message}, tentando método direto...`);
    
    // Tentativa 3: Método direto com cláusula WHERE segura
    console.log('SORTEIO-API DEBUG: Tentando método direto com WHERE seguro');
    const { error: deleteError } = await supabase
      .from("participantes_ativos")
      .delete()
      .not('id', 'is', null);
    
    if (!deleteError) {
      console.log('SORTEIO-API DEBUG: Lista resetada com sucesso via método direto');
      return;
    }
    
    console.log(`SORTEIO-API DEBUG: Erro no método direto: ${deleteError.message}`);
    throw new Error(`Falha em todas as tentativas de limpar a lista: ${deleteError.message}`);
    
  } catch (error) {
    console.log(`SORTEIO-API DEBUG: ERRO CRÍTICO ao limpar lista - ${error.message}`);
    // Aqui não lançamos o erro para evitar quebrar o fluxo do sorteio
    // apenas registramos no log para diagnóstico posterior
  }
}

// A função congelarLista() foi removida pois não é mais necessária
// async function congelarLista() { ... } - REMOVIDA 