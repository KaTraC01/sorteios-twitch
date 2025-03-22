// API endpoint para executar o sorteio automático diariamente
// Este arquivo é chamado automaticamente pelo cron job da Vercel

import { createClient } from '@supabase/supabase-js';

// Configuração do cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Criar cliente Supabase com a chave de serviço para ter acesso completo
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  try {
    console.log('Iniciando execução do cron job de sorteio automático');
    
    // Verificar autorização com CRON_SECRET
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('Tentativa não autorizada de acesso ao cron job');
      return res.status(401).json({ error: 'Não autorizado' });
    }
    
    // Registrar início do processo nos logs
    await supabase
      .from('logs')
      .insert([{ descricao: 'Cron job iniciado: Sorteio automático' }]);
    
    // Chamar a função de sorteio automático no banco de dados
    const { data, error } = await supabase
      .rpc('realizar_sorteio_automatico');
    
    if (error) {
      console.error('Erro ao executar o sorteio automático:', error);
      
      // Registrar erro nos logs
      await supabase
        .from('logs')
        .insert([{ descricao: `Erro no cron job: ${error.message}` }]);
      
      return res.status(500).json({ 
        success: false, 
        error: error.message,
        details: error
      });
    }
    
    // Registrar resultado nos logs
    await supabase
      .from('logs')
      .insert([{ 
        descricao: `Cron job concluído: ${data.realizado ? 
          'Sorteio realizado com sucesso' : 
          'Sorteio não realizado: ' + data.mensagem}` 
      }]);
    
    console.log('Cron job de sorteio concluído com sucesso:', data);
    
    // Retornar resultado
    return res.status(200).json({
      success: true,
      resultado: data
    });
    
  } catch (err) {
    console.error('Erro não tratado no cron job:', err);
    
    // Tentar registrar erro nos logs
    try {
      await supabase
        .from('logs')
        .insert([{ descricao: `Erro crítico no cron job: ${err.message}` }]);
    } catch (logError) {
      console.error('Não foi possível registrar o erro nos logs:', logError);
    }
    
    return res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
} 