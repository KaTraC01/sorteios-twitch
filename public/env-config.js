// Este arquivo pode ser usado para injetar variáveis de ambiente no frontend
// Será carregado antes da aplicação React
//.
// AVISO: Este arquivo não deve conter credenciais reais em produção!
// As variáveis de ambiente devem ser injetadas pelo processo de build da Vercel

// Definir window.__ENV__ apenas se não existir (evita expor a estrutura)
window.__ENV__ = window.__ENV__ || {};

// Função para verificar se estamos em ambiente de produção
function isProduction() {
  // Verificar se a URL atual contém 'localhost' ou é um ambiente de desenvolvimento
  return !(
    window.location.hostname.includes('localhost') || 
    window.location.hostname.includes('127.0.0.1') ||
    window.location.hostname.includes('.vercel.app') // ambientes de preview
  );
}

// Função para log seguro (só mostra em desenvolvimento)
function logSeguro(mensagem, ...args) {
  if (!isProduction()) {
    console.log(mensagem, ...args);
  }
}

// Função para log de erro (mostrar versão simplificada em produção)
function logErro(mensagem, ...args) {
  if (isProduction()) {
    console.error("Erro de configuração. Verifique as variáveis de ambiente.");
  } else {
    console.error(mensagem, ...args);
  }
}

// Função para verificar e configurar as variáveis de ambiente
function configurarVariaveisSupabase() {
  // SEGURANÇA APRIMORADA: Verificar apenas variáveis já injetadas durante o build
  
  // Verificar se as variáveis já estão disponíveis (injetadas pela Vercel)
  let supabaseUrl = window.NEXT_PUBLIC_SUPABASE_URL;
  let supabaseAnonKey = window.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Fallback para window.__ENV__ se necessário (apenas se injetado de forma segura)
  if (!supabaseUrl && window.__ENV__ && window.__ENV__.SUPABASE_URL) {
    supabaseUrl = window.__ENV__.SUPABASE_URL;
    window.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
  }
  
  if (!supabaseAnonKey && window.__ENV__ && window.__ENV__.SUPABASE_ANON_KEY) {
    supabaseAnonKey = window.__ENV__.SUPABASE_ANON_KEY;
    window.NEXT_PUBLIC_SUPABASE_ANON_KEY = supabaseAnonKey;
  }
  
  // Verificar configuração (sem expor as chaves)
  const urlConfigurada = !!supabaseUrl;
  const keyConfigurada = !!supabaseAnonKey;
  
  if (urlConfigurada && keyConfigurada) {
    logSeguro('✅ Variáveis do Supabase configuradas com sucesso no frontend!');
    logSeguro(`✅ URL detectada: ${supabaseUrl ? '***.' + supabaseUrl.split('.').slice(-2).join('.') : 'Não'}`);
    logSeguro(`✅ Chave detectada: ${supabaseAnonKey ? `***${supabaseAnonKey.slice(-4)}` : 'Não'}`);
  } else {
    logErro('❌ ERRO: Falha ao configurar variáveis do Supabase no frontend!');
    logErro(`URL configurada: ${urlConfigurada ? 'Sim' : 'Não'}`);
    logErro(`Chave configurada: ${keyConfigurada ? 'Sim' : 'Não'}`);
    logErro('🔧 Verifique as variáveis de ambiente na Vercel:');
    logErro('   - NEXT_PUBLIC_SUPABASE_URL');
    logErro('   - NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
}

// Executar a configuração apenas no navegador
if (typeof window !== 'undefined') {
  configurarVariaveisSupabase();
} 