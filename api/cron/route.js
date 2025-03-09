import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    // Verificar se é uma requisição autorizada
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Não autorizado' });
    }
    
    const token = authHeader.split(' ')[1];
    if (token !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Verificar a hora atual para determinar qual ação executar
    const agora = new Date();
    const horas = agora.getHours();
    const minutos = agora.getMinutes();

    let action = null;
    let message = '';

    // Congelar a lista às 20:50
    if (horas === 20 && minutos >= 50 && minutos < 55) {
      action = 'congelar';
      message = 'Lista congelada com sucesso';
    }
    // Realizar o sorteio às 21:00
    else if (horas === 21 && minutos >= 0 && minutos < 5) {
      action = 'sorteio';
      message = 'Sorteio realizado com sucesso';
    }
    // Resetar a lista às 21:05
    else if (horas === 21 && minutos >= 5 && minutos < 10) {
      action = 'resetar';
      message = 'Lista resetada com sucesso';
    }

    if (action) {
      // Chamar a API de sorteio
      const response = await fetch(`${process.env.VERCEL_URL || 'https://seu-site.vercel.app'}/api/sorteio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.API_SECRET_KEY}`
        },
        body: JSON.stringify({ action })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erro ao executar ação ${action}: ${errorData.error}`);
      }

      return res.status(200).json({ success: true, message });
    }

    // Se não for hora de executar nenhuma ação
    return res.status(200).json({ success: true, message: 'Nenhuma ação necessária no momento' });
  } catch (error) {
    console.error('Erro na execução do cron job:', error);
    return res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
} 