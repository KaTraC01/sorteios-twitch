/**
 * CONFIGURAÇÃO DE DIAGNÓSTICO - AMBIENTE DE PRODUÇÃO
 * ==================================================
 * 
 * Script de diagnóstico para verificar configuração de variáveis de ambiente
 * SEM hardcode de credenciais (removido por motivos de segurança)
 */

if (typeof window !== 'undefined') {
  // Função de diagnóstico (SEM credenciais hardcoded)
  window.diagnosticarSupabase = function() {
    console.log('🔍 DIAGNÓSTICO SUPABASE - AMBIENTE PRODUÇÃO');
    console.log('==========================================');
    
    // Verificar process.env
    const processUrl = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL;
    const processKey = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('URL via process.env:', processUrl ? '✅ Configurada' : '❌ Não configurada');
    console.log('Key via process.env:', processKey ? '✅ Configurada' : '❌ Não configurada');
    
    if (!processUrl || !processKey) {
      console.error('❌ ERRO: Variáveis de ambiente não configuradas na Vercel!');
      console.log('📋 AÇÃO NECESSÁRIA: Configurar no Vercel Dashboard:');
      console.log('   - NEXT_PUBLIC_SUPABASE_URL');
      console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY');
    } else {
      console.log('✅ Status: Variáveis configuradas corretamente');
    }
    
    return {
      processEnvConfigured: !!(processUrl && processKey),
      nextSteps: !processUrl || !processKey ? 'Configure as variáveis na Vercel' : 'Configuração OK'
    };
  };
  
  console.log('🔧 Script de diagnóstico carregado (sem hardcode)');
  console.log('💡 Execute window.diagnosticarSupabase() para verificar');
}