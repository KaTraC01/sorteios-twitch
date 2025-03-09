// Função serverless para realizar o sorteio automaticamente
// Esta função será executada por um cron job da Vercel

import { createClient } from "@supabase/supabase-js";

// Configuração do Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || "https://nsqiytflqwlyqhdmueki.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

// Criando o cliente Supabase com a chave de serviço para acesso total
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  try {
    // Verificar se é uma requisição autorizada
    // Você pode adicionar uma chave de API ou outro método de autenticação aqui
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Não autorizado' });
    }
    
    const token = authHeader.split(' ')[1];
    if (token !== process.env.API_SECRET_KEY) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Verificar o método da requisição
    if (req.method === 'POST') {
      // Determinar qual ação executar com base no parâmetro de ação
      const { action } = req.body;

      if (action === 'sorteio') {
        await realizarSorteio();
        return res.status(200).json({ success: true, message: 'Sorteio realizado com sucesso' });
      } 
      else if (action === 'resetar') {
        await resetarLista();
        return res.status(200).json({ success: true, message: 'Lista resetada com sucesso' });
      }
      else if (action === 'congelar') {
        await congelarLista();
        return res.status(200).json({ success: true, message: 'Lista congelada com sucesso' });
      }
      else {
        return res.status(400).json({ error: 'Ação inválida' });
      }
    } else {
      // Se não for POST, retornar erro
      return res.status(405).json({ error: 'Método não permitido' });
    }
  } catch (error) {
    console.error('Erro na execução da função serverless:', error);
    return res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
}

// Função para realizar o sorteio
async function realizarSorteio() {
  // Buscar todos os participantes
  const { data: participantes, error: erroParticipantes } = await supabase
    .from("participantes_ativos")
    .select("*");

  if (erroParticipantes) {
    throw new Error(`Erro ao buscar participantes: ${erroParticipantes.message}`);
  }

  if (participantes.length === 0) {
    console.log("Nenhum participante na lista. O sorteio foi cancelado.");
    return;
  }

  // Selecionar um vencedor aleatório
  const vencedorIndex = Math.floor(Math.random() * participantes.length);
  const vencedor = participantes[vencedorIndex];
  
  // Obter a data atual no formato ISO
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

  // Salvar o resultado do sorteio no Supabase
  const { data: sorteioSalvo, error: erroSorteio } = await supabase
    .from("sorteios")
    .insert([
      {
        data: dataISO,
        numero: vencedorIndex + 1,
        nome: vencedor.nome_twitch,
        streamer: vencedor.streamer_escolhido,
      },
    ])
    .select();

  if (erroSorteio) {
    throw new Error(`Erro ao salvar o sorteio: ${erroSorteio.message}`);
  }

  // Salvar a lista completa de participantes no histórico
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
      throw new Error(`Erro ao salvar histórico de participantes: ${erroHistorico.message}`);
    }
  }

  console.log(`Sorteio realizado com sucesso. Vencedor: ${vencedor.nome_twitch}`);
  return vencedor;
}

// Função para resetar a lista
async function resetarLista() {
  const { error } = await supabase
    .from("participantes_ativos")
    .delete()
    .neq("id", "");

  if (error) {
    throw new Error(`Erro ao limpar a lista: ${error.message}`);
  }

  console.log("Lista resetada com sucesso");
}

// Função para congelar a lista
async function congelarLista() {
  // Aqui podemos adicionar uma flag no banco de dados para indicar que a lista está congelada
  // Por exemplo, podemos criar uma tabela de configurações
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
    throw new Error(`Erro ao congelar a lista: ${error.message}`);
  }

  console.log("Lista congelada com sucesso");
} 