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
      console.log('URL recuperada de meta tag:', !!window.NEXT_PUBLIC_SUPABASE_URL);
    } else if (window.__ENV__ && window.__ENV__.SUPABASE_URL && 
               window.__ENV__.SUPABASE_URL !== "%%SUPABASE_URL_PLACEHOLDER%%") {
      // Usar valor substituído durante o build
      window.NEXT_PUBLIC_SUPABASE_URL = window.__ENV__.SUPABASE_URL;
      console.log('URL recuperada de __ENV__');
    } else {
      console.warn('⚠️ URL do Supabase não encontrada');
    }
  }
  
  // Para variável de chave anônima do Supabase
  if (!window.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // Tentar obter do atributo data no HTML
    const keyMeta = document.querySelector('meta[name="supabase-anon-key"]');
    if (keyMeta) {
      window.NEXT_PUBLIC_SUPABASE_ANON_KEY = keyMeta.getAttribute('content');
      console.log('Chave recuperada de meta tag:', !!window.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    } else if (window.__ENV__ && window.__ENV__.SUPABASE_ANON_KEY && 
               window.__ENV__.SUPABASE_ANON_KEY !== "%%SUPABASE_ANON_KEY_PLACEHOLDER%%") {
      // Usar valor substituído durante o build
      window.NEXT_PUBLIC_SUPABASE_ANON_KEY = window.__ENV__.SUPABASE_ANON_KEY;
      console.log('Chave recuperada de __ENV__');
    } else {
      console.warn('⚠️ Chave anônima do Supabase não encontrada');
    }
  }
  
  // Exibir status após a tentativa de recuperação
  const temURL = !!window.NEXT_PUBLIC_SUPABASE_URL;
  const temKey = !!window.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('Status final das variáveis:');
  console.log('NEXT_PUBLIC_SUPABASE_URL: ' + (temURL ? 'Definido ✓' : 'Não definido ✗'));
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY: ' + (temKey ? 'Definido ✓' : 'Não definido ✗'));
  
  // Aviso se ainda houver problemas
  if (!temURL || !temKey) {
    console.error('❌ ERRO: Uma ou mais variáveis de ambiente não puderam ser recuperadas.');
    console.error('A aplicação pode não funcionar corretamente.');
  } else {
    console.log('✅ Variáveis de ambiente configuradas com sucesso!');
  }
} 