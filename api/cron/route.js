import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    // Log detalhado de horários para debug
    const agora = new Date();
    const horaBrasilia = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const horaUTC = new Date(agora.toISOString());
    
    console.log(`===== SORTEIO DEBUG: Iniciando função às ${agora.toISOString()} =====`);
    console.log(`SORTEIO DEBUG: Hora Brasília: ${horaBrasilia.getHours()}:${horaBrasilia.getMinutes()}:${horaBrasilia.getSeconds()}`);
    console.log(`SORTEIO DEBUG: Hora UTC: ${horaUTC.getHours()}:${horaUTC.getMinutes()}:${horaUTC.getSeconds()}`);
    console.log(`SORTEIO DEBUG: Timestamp: ${agora.getTime()}`);
    
    // Verificar se API_SECRET_KEY está configurada
    if (!process.env.API_SECRET_KEY) {
      console.error('ERRO CRÍTICO: A variável de ambiente API_SECRET_KEY não está configurada.');
      return res.status(500).json({ error: 'Configuração do servidor incompleta: API_SECRET_KEY não configurada' });
    }
    
    if (!process.env.BASE_URL) {
      console.error('ERRO CRÍTICO: A variável de ambiente BASE_URL não está configurada.');
      return res.status(500).json({ error: 'Configuração do servidor incompleta: BASE_URL não configurada' });
    }
    
    const baseUrl = process.env.BASE_URL;
    console.log(`SORTEIO DEBUG: URL base configurada - ${baseUrl}`);
    
    // Realizar o sorteio diretamente (sem congelar a lista)
    console.log('SORTEIO DEBUG: Realizando o sorteio');
    
    const respostaSorteio = await fetch(`${baseUrl}/api/sorteio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.API_SECRET_KEY}`
      },
      body: JSON.stringify({ action: 'sorteio' })
    });
    
    if (!respostaSorteio.ok) {
      const erro = await respostaSorteio.json();
      console.log(`SORTEIO DEBUG: ERRO ao realizar o sorteio - ${JSON.stringify(erro)}`);
      throw new Error(`Erro ao realizar o sorteio: ${erro.error || 'Erro desconhecido'}`);
    }
    
    const resultadoSorteio = await respostaSorteio.json();
    console.log(`SORTEIO DEBUG: Sorteio realizado com sucesso! Vencedor: ${resultadoSorteio.resultado?.vencedor?.nome || 'N/A'}`);
    
    // OBSERVAÇÃO:
    // O processo de sorteio já realiza automaticamente:
    // - Seleção aleatória do vencedor
    // - Salvamento do vencedor na tabela 'sorteios'
    // - Salvamento de todos participantes na tabela 'historico_participantes'
    // - Limpeza da tabela de 'participantes_ativos'
    
    console.log('SORTEIO DEBUG: Processo de sorteio concluído com sucesso');
    return res.status(200).json({ 
      success: true, 
      message: 'Sorteio realizado com sucesso', 
      data: resultadoSorteio
    });

  } catch (error) {
    console.error('SORTEIO DEBUG: ERRO CRÍTICO:', error);
    return res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  } finally {
    console.log(`===== SORTEIO DEBUG: Função finalizada às ${new Date().toISOString()} =====`);
  }
} 