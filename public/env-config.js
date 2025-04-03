// Este arquivo pode ser usado para injetar variáveis de ambiente no frontend
// Será carregado antes da aplicação React

// AVISO: Este arquivo não deve conter credenciais reais!
// As variáveis de ambiente devem ser injetadas pelo processo de build da Vercel

if (typeof window !== 'undefined') {
  // Apenas diagnóstico - verificar se as variáveis estão definidas
  console.log('Iniciando diagnóstico do ambiente...');
  
  const temURL = !!window.NEXT_PUBLIC_SUPABASE_URL;
  const temKey = !!window.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('Variáveis de ambiente: ' + 
    (temURL && temKey ? 'OK ✅' : 'FALTANDO ❌')
  );
  
  // Aviso se as variáveis não estiverem definidas
  if (!temURL || !temKey) {
    console.warn('⚠️ ALERTA: Variáveis de ambiente não encontradas! A aplicação pode não funcionar corretamente.');
    console.warn('Verifique a configuração das variáveis de ambiente na Vercel ou no arquivo .env.local');
  }
  
  // Para diagnóstico - imprimir se as variáveis estão disponíveis (sem mostrar valores)
  console.log('Status das variáveis:');
  console.log('NEXT_PUBLIC_SUPABASE_URL: ' + (temURL ? 'Definido ✓' : 'Não definido ✗'));
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY: ' + (temKey ? 'Definido ✓' : 'Não definido ✗'));
} 