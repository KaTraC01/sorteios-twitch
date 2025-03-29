import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    // Log de início da execução
    console.log(`===== SORTEIO DEBUG: Iniciando função às ${new Date().toISOString()} =====`);
    
    // Verificar se as variáveis de ambiente necessárias estão configuradas
    if (!process.env.CRON_SECRET) {
      console.error('ERRO CRÍTICO: A variável de ambiente CRON_SECRET não está configurada.');
      return res.status(500).json({ error: 'Configuração do servidor incompleta: CRON_SECRET não configurada' });
    }
    
    if (!process.env.API_SECRET_KEY) {
      console.error('ERRO CRÍTICO: A variável de ambiente API_SECRET_KEY não está configurada.');
      return res.status(500).json({ error: 'Configuração do servidor incompleta: API_SECRET_KEY não configurada' });
    }
    
    if (!process.env.BASE_URL) {
      console.error('AVISO: A variável de ambiente BASE_URL não está configurada. Usando URL padrão.');
    }
    
    // Verificar se é uma requisição autorizada
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('SORTEIO DEBUG: Erro de autorização - header inválido ou ausente');
      return res.status(401).json({ error: 'Não autorizado' });
    }
    
    const token = authHeader.split(' ')[1];
    if (token !== process.env.CRON_SECRET) {
      console.log('SORTEIO DEBUG: Erro de autorização - token inválido');
      return res.status(401).json({ error: 'Token inválido' });
    }
    console.log('SORTEIO DEBUG: Autorização validada com sucesso');

    // Verificar a hora atual para determinar qual ação executar
    const agora = new Date();
    const horas = agora.getHours();
    const minutos = agora.getMinutes();
    
    console.log(`SORTEIO DEBUG: Hora atual - ${horas}:${minutos.toString().padStart(2, '0')}`);

    let action = null;
    let message = '';

    // Congelar a lista às 20:50
    if (horas === 20 && minutos >= 50 && minutos < 55) {
      action = 'congelar';
      message = 'Lista congelada com sucesso';
      console.log('SORTEIO DEBUG: Ação determinada - congelar lista');
    }
    // Realizar o sorteio às 21:00
    else if (horas === 21 && minutos >= 0 && minutos < 5) {
      action = 'sorteio';
      message = 'Sorteio realizado com sucesso';
      console.log('SORTEIO DEBUG: Ação determinada - realizar sorteio');
    }
    // Resetar a lista às 21:05
    else if (horas === 21 && minutos >= 5 && minutos < 10) {
      action = 'resetar';
      message = 'Lista resetada com sucesso';
      console.log('SORTEIO DEBUG: Ação determinada - resetar lista');
    }
    // Testar função em qualquer horário (APENAS PARA DIAGNÓSTICO)
    else if (req.query.force_action) {
      action = req.query.force_action;
      message = `Ação forçada: ${action}`;
      console.log(`SORTEIO DEBUG: Ação forçada manualmente - ${action}`);
    }
    else {
      console.log('SORTEIO DEBUG: Nenhuma ação necessária no momento (fora do horário programado)');
    }

    if (action) {
      // Chamar a API de sorteio usando a URL base configurada
      const baseUrl = process.env.BASE_URL || 'https://sorteios-twitch.vercel.app';
      console.log(`SORTEIO DEBUG: URL base configurada - ${baseUrl}`);
      console.log(`SORTEIO DEBUG: Chamando endpoint /api/sorteio com ação "${action}"`);
      
      // Verificar se API_SECRET_KEY está definido
      if (!process.env.API_SECRET_KEY) {
        console.log('SORTEIO DEBUG: ERRO - API_SECRET_KEY não está configurada!');
      } else {
        console.log('SORTEIO DEBUG: API_SECRET_KEY está configurada corretamente');
      }
      
      // Fazer a requisição ao endpoint do sorteio
      const response = await fetch(`${baseUrl}/api/sorteio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.API_SECRET_KEY}`
        },
        body: JSON.stringify({ action })
      });

      console.log(`SORTEIO DEBUG: Resposta da API - status ${response.status}`);
      
      // Analisar a resposta
      if (!response.ok) {
        const errorData = await response.json();
        console.log(`SORTEIO DEBUG: ERRO na resposta da API - ${JSON.stringify(errorData)}`);
        throw new Error(`Erro ao executar ação ${action}: ${errorData.error || 'Erro desconhecido'}`);
      }
      
      const responseData = await response.json();
      console.log(`SORTEIO DEBUG: Resposta completa - ${JSON.stringify(responseData)}`);

      return res.status(200).json({ success: true, message, data: responseData });
    }

    // Se não for hora de executar nenhuma ação
    console.log('SORTEIO DEBUG: Finalizando execução sem ações');
    return res.status(200).json({ success: true, message: 'Nenhuma ação necessária no momento' });
  } catch (error) {
    console.error('SORTEIO DEBUG: ERRO CRÍTICO:', error);
    return res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  } finally {
    console.log(`===== SORTEIO DEBUG: Função finalizada às ${new Date().toISOString()} =====`);
  }
} 