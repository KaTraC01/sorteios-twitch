/**
 * DIAGNÓSTICO DE CONFIGURAÇÃO - VARIÁVEIS DE AMBIENTE
 * ===================================================
 * 
 * Este script testa se as variáveis de ambiente estão sendo
 * carregadas corretamente no frontend
 */

console.log('🔍 DIAGNÓSTICO DE CONFIGURAÇÃO SUPABASE');
console.log('=====================================');

// Verificar variáveis de ambiente disponíveis
console.log('📋 Variáveis de ambiente detectadas:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ CONFIGURADA' : '❌ NÃO CONFIGURADA');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ CONFIGURADA' : '❌ NÃO CONFIGURADA');
console.log('NODE_ENV:', process.env.NODE_ENV);

// Verificar se estamos no browser
console.log('\n🌐 Ambiente de execução:');
console.log('Browser:', typeof window !== 'undefined' ? '✅ SIM' : '❌ NÃO');
console.log('Node.js:', typeof process !== 'undefined' ? '✅ SIM' : '❌ NÃO');

// Testar conexão se variáveis estiverem configuradas
if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.log('\n🧪 Testando conexão Supabase...');
    
    try {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );
        
        console.log('✅ Cliente Supabase criado com sucesso');
        
        // Teste de conexão
        supabase.from('configuracoes').select('*').limit(1)
            .then(({ data, error }) => {
                if (error) {
                    console.log('❌ Erro na conexão:', error.message);
                } else {
                    console.log('✅ Conexão com Supabase funcionando');
                }
            });
            
    } catch (error) {
        console.log('❌ Erro ao criar cliente Supabase:', error.message);
    }
} else {
    console.log('\n⚠️  ATENÇÃO: Variáveis de ambiente não configuradas');
    console.log('Configure na Vercel:');
    console.log('- NEXT_PUBLIC_SUPABASE_URL');
    console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

console.log('\n📝 Para executar este diagnóstico:');
console.log('node test-env-config.js');
