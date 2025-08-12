// CONFIGURAÇÃO SEGURA DE AMBIENTE - SEM INJEÇÃO DE CREDENCIAIS
// Este arquivo apenas verifica se as variáveis de ambiente da Vercel estão disponíveis
// Comentário de teste: .

// IMPORTANTE: Este arquivo NÃO deve ter credenciais hardcoded
// As variáveis vem exclusivamente via Next.js process.env

// Função para verificar ambiente
function isProduction() {
  return !(
    window.location.hostname.includes('localhost') || 
    window.location.hostname.includes('127.0.0.1')
  );
}

// Log seguro
function logSeguro(mensagem, ...args) {
  if (!isProduction()) {
    console.log(mensagem, ...args);
  }
}

// Log de erro
function logErro(mensagem, ...args) {
  if (isProduction()) {
    console.error("Erro de configuração. Verificar variáveis de ambiente na Vercel.");
  } else {
    console.error(mensagem, ...args);
  }
}

// Verificação de configuração (SEM FALLBACKS INSEGUROS)
function verificarConfiguracao() {
  // Verificar apenas se as variáveis do Next.js estão disponíveis
  const urlDisponivel = !!window.NEXT_PUBLIC_SUPABASE_URL;
  const keyDisponivel = !!window.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (urlDisponivel && keyDisponivel) {
    logSeguro('✅ Configuração Supabase OK via Next.js');
    logSeguro('✅ URL: ***supabase.co');
    logSeguro('✅ Key: ***' + (window.NEXT_PUBLIC_SUPABASE_ANON_KEY ? window.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(-4) : '????'));
  } else {
    logErro('❌ Configuração Supabase incompleta!');
    logErro(`URL: ${urlDisponivel ? 'OK' : 'FALTA'}`);
    logErro(`Key: ${keyDisponivel ? 'OK' : 'FALTA'}`);
    logErro('Verificar variáveis na Vercel: NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  
  return urlDisponivel && keyDisponivel;
}

// Executar verificação
if (typeof window !== 'undefined') {
  // Aguardar um pouco para as variáveis do Next.js estarem disponíveis
  setTimeout(verificarConfiguracao, 100);
}