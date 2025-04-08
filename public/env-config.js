// Este arquivo pode ser usado para injetar variáveis de ambiente no frontend
// Será carregado antes da aplicação React

// AVISO: Este arquivo não deve conter credenciais reais em produção!
// As variáveis de ambiente devem ser injetadas pelo processo de build da Vercel

// Os valores abaixo serão substituídos automaticamente durante o build
// Esta é uma abordagem segura que funciona com o sistema da Vercel
window.__ENV__ = {
  SUPABASE_URL: "%%SUPABASE_URL_PLACEHOLDER%%",
  SUPABASE_ANON_KEY: "%%SUPABASE_ANON_KEY_PLACEHOLDER%%"
};

if (typeof window !== 'undefined') {
  // Variáveis de ambiente da Vercel (adicionadas durante o build)
  // Verificação e recuperação de valores
  
  // Para variável de URL do Supabase
  if (!window.NEXT_PUBLIC_SUPABASE_URL) {
    // Tentar obter do atributo data no HTML
    const urlMeta = document.querySelector('meta[name="supabase-url"]');
    if (urlMeta) {
      window.NEXT_PUBLIC_SUPABASE_URL = urlMeta.getAttribute('content');
    } else if (window.__ENV__ && window.__ENV__.SUPABASE_URL && 
               window.__ENV__.SUPABASE_URL !== "%%SUPABASE_URL_PLACEHOLDER%%") {
      // Usar valor substituído durante o build
      window.NEXT_PUBLIC_SUPABASE_URL = window.__ENV__.SUPABASE_URL;
    }
  }
  
  // Para variável de chave anônima do Supabase
  if (!window.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // Tentar obter do atributo data no HTML
    const keyMeta = document.querySelector('meta[name="supabase-anon-key"]');
    if (keyMeta) {
      window.NEXT_PUBLIC_SUPABASE_ANON_KEY = keyMeta.getAttribute('content');
    } else if (window.__ENV__ && window.__ENV__.SUPABASE_ANON_KEY && 
               window.__ENV__.SUPABASE_ANON_KEY !== "%%SUPABASE_ANON_KEY_PLACEHOLDER%%") {
      // Usar valor substituído durante o build
      window.NEXT_PUBLIC_SUPABASE_ANON_KEY = window.__ENV__.SUPABASE_ANON_KEY;
    }
  }
  
  // Verificar silenciosamente se as variáveis foram configuradas corretamente
  // Removida exibição de logs para aumentar a segurança
  const temURL = !!window.NEXT_PUBLIC_SUPABASE_URL;
  const temKey = !!window.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Aviso somente em ambiente de desenvolvimento
  if ((!temURL || !temKey) && window.location.hostname === 'localhost') {
    console.error('❌ ERRO: Uma ou mais variáveis de ambiente não puderam ser recuperadas.');
    console.error('A aplicação pode não funcionar corretamente.');
  }
} 