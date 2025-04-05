// Endpoint para testar o cron job manualmente
// Acesse: https://seu-site.vercel.app/api/teste-cron

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    console.log("===== TESTE MANUAL CRON JOB =====");
    console.log(`Iniciado em: ${new Date().toISOString()}`);
    
    // 1. Testar conexão com Supabase para registrar o teste
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Erro: Variáveis do Supabase não configuradas");
      return res.status(500).json({ 
        erro: "Configuração incompleta", 
        detalhes: "SUPABASE_URL ou SUPABASE_SERVICE_KEY não encontrados" 
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Registrar o teste nos logs do sistema
    const { error: erroLog } = await supabase
      .from('logs')
      .insert([{
        descricao: 'Teste manual do cron job',
      }]);
      
    if (erroLog) {
      console.error("Erro ao registrar log:", erroLog);
    } else {
      console.log("Log de teste registrado com sucesso");
    }
    
    // 2. Simular a chamada que o cron job faria
    console.log("Simulando execução do cron job...");
    
    // Simulando a função do api/cron/route.js
    const fetch = require('node-fetch');
    
    if (!process.env.API_SECRET_KEY) {
      console.error('ERRO CRÍTICO: A variável de ambiente API_SECRET_KEY não está configurada.');
      return res.status(500).json({ error: 'Configuração do servidor incompleta: API_SECRET_KEY não configurada' });
    }
    
    if (!process.env.BASE_URL) {
      console.error('ERRO CRÍTICO: A variável de ambiente BASE_URL não está configurada.');
      return res.status(500).json({ error: 'Configuração do servidor incompleta: BASE_URL não configurada' });
    }
    
    const baseUrl = process.env.BASE_URL;
    console.log(`URL base configurada: ${baseUrl}`);
    
    // Executar a requisição de sorteio (com flag de teste para não realizar sorteio real)
    const respostaSorteio = await fetch(`${baseUrl}/api/sorteio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.API_SECRET_KEY}`
      },
      body: JSON.stringify({ action: 'diagnostico', teste: true })
    });
    
    // Verificar a resposta
    if (!respostaSorteio.ok) {
      const erro = await respostaSorteio.text();
      console.log(`ERRO ao testar API: ${erro}`);
      return res.status(500).json({ 
        erro: "Falha na simulação", 
        detalhes: erro,
        status_http: respostaSorteio.status
      });
    }
    
    const resultadoTeste = await respostaSorteio.json();
    console.log(`Teste concluído com sucesso. Resposta: ${JSON.stringify(resultadoTeste)}`);
    
    // 3. Retornar resultado completo do teste
    return res.status(200).json({
      sucesso: true,
      timestamp: new Date().toISOString(),
      mensagem: "Teste do cron job executado com sucesso",
      resultados: {
        log_registrado: !erroLog,
        teste_api_sorteio: resultadoTeste
      },
      proximos_passos: [
        "Verifique os logs no banco de dados",
        "Confirme que a resposta da API está correta",
        "Verifique a execução agendada às 00:00 UTC"
      ]
    });
    
  } catch (error) {
    console.error("Erro crítico no teste:", error);
    return res.status(500).json({ 
      erro: "Erro inesperado", 
      detalhes: error.message, 
      stack: error.stack
    });
  }
} 