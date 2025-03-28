// Função serverless para realizar o sorteio automaticamente
// Esta função será executada por um cron job da Vercel

import { createClient } from "@supabase/supabase-js";

// Configuração do Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || "https://nsqiytflqwlyqhdmueki.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

// Log das configurações (reduzidas para não expor a chave completa)
console.log(`SORTEIO-API DEBUG: Config - URL: ${SUPABASE_URL}`);
console.log(`SORTEIO-API DEBUG: Config - KEY: ${SUPABASE_SERVICE_KEY ? 'Configurada (últimos 4 caracteres: ' + SUPABASE_SERVICE_KEY.slice(-4) + ')' : 'NÃO CONFIGURADA'}`);

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
        console.log('SORTEIO-API DEBUG: Iniciando congelamento da lista');
        await congelarLista();
        console.log('SORTEIO-API DEBUG: Lista congelada com sucesso');
        return res.status(200).json({ success: true, message: 'Lista congelada com sucesso' });
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
  
  console.log(`SORTEIO-API DEBUG: Vencedor sorteado - ${vencedor.nome_twitch} (índice ${vencedorIndex})`);
  
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
        nome: vencedor.nome_twitch,
        streamer: vencedor.streamer_escolhido,
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
    const participantesHistorico = participantes.map(participante => ({
      sorteio_id: sorteioId,
      nome_twitch: participante.nome_twitch,
      streamer_escolhido: participante.streamer_escolhido
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

  console.log(`SORTEIO-API DEBUG: Sorteio realizado com sucesso. Vencedor: ${vencedor.nome_twitch}`);
  
  // Resetar a lista após o sorteio
  console.log('SORTEIO-API DEBUG: Resetando lista de participantes');
  await resetarLista();
  
  return { 
    realizado: true, 
    vencedor: {
      nome: vencedor.nome_twitch,
      streamer: vencedor.streamer_escolhido,
      numero: vencedorIndex + 1,
      data: dataHoraBrasil.toISOString()
    }
  };
}

// Função para resetar a lista
async function resetarLista() {
  console.log('SORTEIO-API DEBUG: Executando exclusão de participantes ativos');
  const { error } = await supabase
    .from("participantes_ativos")
    .delete()
    .neq("id", "");

  if (error) {
    console.log(`SORTEIO-API DEBUG: ERRO ao limpar a lista - ${error.message}`);
    throw new Error(`Erro ao limpar a lista: ${error.message}`);
  }

  console.log('SORTEIO-API DEBUG: Lista resetada com sucesso');
  
  // Descongelar a lista após resetar
  console.log('SORTEIO-API DEBUG: Descongelando a lista');
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

// Função para congelar a lista
async function congelarLista() {
  // Aqui podemos adicionar uma flag no banco de dados para indicar que a lista está congelada
  // Por exemplo, podemos criar uma tabela de configurações
  console.log('SORTEIO-API DEBUG: Atualizando configuração para congelar lista');
  const { error } = await supabase
    .from("configuracoes")
    .upsert([
      {
        chave: "lista_congelada",
        valor: "true",
        atualizado_em: new Date().toISOString()
      }
    ]);

  if (error) {
    console.log(`SORTEIO-API DEBUG: ERRO ao congelar a lista - ${error.message}`);
    throw new Error(`Erro ao congelar a lista: ${error.message}`);
  }

  console.log('SORTEIO-API DEBUG: Lista congelada com sucesso');
} 