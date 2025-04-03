// Este arquivo pode ser usado para injetar variáveis de ambiente no frontend
// Será carregado antes da aplicação React

// AVISO: Este arquivo não deve conter credenciais reais em produção!
// As variáveis de ambiente devem ser injetadas pelo processo de build da Vercel

if (typeof window !== 'undefined') {
  // SOLUÇÃO TEMPORÁRIA:
  // Se as variáveis não estiverem definidas, verificar se estão disponíveis em outros formatos
  // que a Vercel possa estar injetando
  
  // Para variável de URL do Supabase
  if (!window.NEXT_PUBLIC_SUPABASE_URL) {
    // Tentar obter do atributo data no HTML (se a Vercel injetou lá)
    const urlMeta = document.querySelector('meta[name="supabase-url"]');
    if (urlMeta) {
      window.NEXT_PUBLIC_SUPABASE_URL = urlMeta.getAttribute('content');
      console.log('URL recuperada de meta tag:', !!window.NEXT_PUBLIC_SUPABASE_URL);
    } else {
      // Valores específicos para resolução temporária do problema
      // Isso garante o funcionamento até que o problema de injeção de variáveis seja resolvido
      console.warn('⚠️ Usando URL de fallback para o Supabase (solução temporária)');
      window.NEXT_PUBLIC_SUPABASE_URL = 'https://nsqiytflqwlyqhdmueki.supabase.co';
    }
  }
  
  // Para variável de chave anônima do Supabase
  if (!window.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // Tentar obter do atributo data no HTML (se a Vercel injetou lá)
    const keyMeta = document.querySelector('meta[name="supabase-anon-key"]');
    if (keyMeta) {
      window.NEXT_PUBLIC_SUPABASE_ANON_KEY = keyMeta.getAttribute('content');
      console.log('Chave recuperada de meta tag:', !!window.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    } else {
      // Indicação para contatar o administrador - não incluímos a chave diretamente
      console.warn('⚠️ Não foi encontrada a chave anônima do Supabase');
      console.warn('Contate o administrador para resolver este problema');
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