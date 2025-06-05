// Este arquivo pode ser usado para injetar variáveis de ambiente no frontend
// Será carregado antes da aplicação React

// AVISO: Este arquivo não deve conter credenciais reais em produção!
// As variáveis de ambiente devem ser injetadas pelo processo de build da Vercel

// Definir window.__ENV__ apenas se não existir (evita expor a estrutura)
window.__ENV__ = window.__ENV__ || {};

// Função para verificar e configurar as variáveis de ambiente
function configurarVariaveisSupabase() {
  // Função auxiliar para obter valor de variável de diversas fontes
  function obterValor(metaName, envKey, placeholder) {
    // 1. Verificar meta tag
    const meta = document.querySelector(`meta[name="${metaName}"]`);
    if (meta) {
      const valor = meta.getAttribute('content');
      // Garantir que o valor não é um placeholder (mantendo a verificação exata como antes)
      if (valor && valor !== placeholder) {
        return valor;
      }
    }
    
    // 2. Verificar window.__ENV__
    return window.__ENV__ && window.__ENV__[envKey] ? window.__ENV__[envKey] : null;
  }
  
  // Obter valores das variáveis de ambiente
  const supabaseUrl = window.NEXT_PUBLIC_SUPABASE_URL || 
                      obterValor('supabase-url', 'SUPABASE_URL', '%NEXT_PUBLIC_SUPABASE_URL%');
  
  const supabaseAnonKey = window.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                          obterValor('supabase-anon-key', 'SUPABASE_ANON_KEY', '%NEXT_PUBLIC_SUPABASE_ANON_KEY%');
  
  // Atribuir valores encontrados às variáveis globais
  if (supabaseUrl) {
    window.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
  }
  
  if (supabaseAnonKey) {
    window.NEXT_PUBLIC_SUPABASE_ANON_KEY = supabaseAnonKey;
  }
  
  // Verificar configuração (sem expor as chaves)
  const urlConfigurada = !!window.NEXT_PUBLIC_SUPABASE_URL;
  const keyConfigurada = !!window.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (urlConfigurada && keyConfigurada) {
    console.log('✅ Variáveis do Supabase configuradas com sucesso no frontend!');
  } else {
    console.error('❌ ERRO: Falha ao configurar variáveis do Supabase no frontend!');
    console.error(`URL configurada: ${urlConfigurada ? 'Sim' : 'Não'}`);
    console.error(`Chave configurada: ${keyConfigurada ? 'Sim' : 'Não'}`);
  }
}

// Executar a configuração apenas no navegador
if (typeof window !== 'undefined') {
  configurarVariaveisSupabase();
} 