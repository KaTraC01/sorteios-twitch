// Endpoint para diagnosticar problemas com o cron job
// Acesse: https://seu-site.vercel.app/api/diagnostico-cron

async function handler(req, res) {
  try {
    // Cabeçalho para facilitar leitura nos logs
    console.log("===== DIAGNÓSTICO CRON JOB =====");
    
    // Verificar horário exato
    const agora = new Date();
    const horaBrasilia = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    console.log(`Horário UTC: ${agora.toISOString()}`);
    console.log(`Horário Brasil: ${horaBrasilia.toISOString()}`);
    
    // 1. Verificar variáveis de ambiente para o cron job
    const diagnostico = {
      variaveis: {
        api_secret_key: !!process.env.API_SECRET_KEY,
        base_url: !!process.env.BASE_URL,
        base_url_valor: process.env.BASE_URL || 'Não definido',
        supabase_url: !!process.env.SUPABASE_URL,
        supabase_service_key: !!process.env.SUPABASE_SERVICE_KEY
      },
      // Outras informações importantes
      ambiente: {
        vercel_env: process.env.VERCEL_ENV || 'local',
        node_env: process.env.NODE_ENV,
        region: process.env.VERCEL_REGION
      },
      // Headers da requisição
      headers: {
        host: req.headers.host,
        user_agent: req.headers['user-agent'],
        origem: req.headers.origin || 'Sem origem'
      }
    };
    
    // 2. Verificar configuração do cron
    // Não podemos acessar diretamente o arquivo vercel.json, então log manual
    console.log("Configuração esperada do cron: { path: '/api/cron/route', schedule: '0 0 * * *' }");
    
    // 3. Simular parte do fluxo do cron para diagnosticar problemas
    console.log("Simulando requisição para a API de sorteio...");
    
    // Construir a URL completa
    const baseUrl = process.env.BASE_URL || `https://${req.headers.host}`;
    console.log(`URL base usada: ${baseUrl}`);
    
    try {
      // Importar fetch
      const fetch = require('node-fetch');
      
      // Fazer uma requisição de diagnóstico (sem realizar o sorteio)
      const resposta = await fetch(`${baseUrl}/api/sorteio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.API_SECRET_KEY || 'undefined'}`
        },
        body: JSON.stringify({ action: 'diagnostico' })
      });
      
      // Adicionar resultado ao diagnóstico
      diagnostico.teste_api = {
        status: resposta.status,
        ok: resposta.ok
      };
      
      if (resposta.ok) {
        const dados = await resposta.json();
        diagnostico.teste_api.resposta = dados;
      } else {
        const erro = await resposta.text();
        diagnostico.teste_api.erro = erro;
      }
    } catch (error) {
      console.error("Erro ao testar API:", error.message);
      diagnostico.teste_api = {
        erro: error.message
      };
    }
    
    // 4. Verificar logs e últimas execuções
    console.log("Recomendação: Verifique os logs do cron job no painel da Vercel");
    console.log("Procure erros como: 'API_SECRET_KEY não configurada' ou 'Erro crítico'");
    
    // Resultado final
    console.log("Diagnóstico concluído. Resultado:");
    console.log(JSON.stringify(diagnostico, null, 2));
    
    return res.status(200).json({
      timestamp: new Date().toISOString(),
      diagnostico: diagnostico,
      proximos_passos: [
        "Verifique os logs da função /api/cron/route na Vercel",
        "Compare o horário UTC com o horário programado no cron",
        "Confirme se BASE_URL está correto e acessível",
        "Verifique se a API responde corretamente à ação 'sorteio'"
      ]
    });
    
  } catch (error) {
    console.error("Erro no diagnóstico:", error);
    return res.status(500).json({ erro: error.message });
  }
}

module.exports = handler; 