/**
 * DIAGNÓSTICO DE VARIÁVEIS DE AMBIENTE
 * ====================================
 * 
 * Utilitário para diagnosticar problemas de configuração
 * no frontend e backend
 */

export function diagnosticarConfiguracao() {
    const diagnosticos = {
        frontend: {},
        backend: {},
        problemas: [],
        solucoes: []
    };

    // Verificar se estamos no browser
    const isBrowser = typeof window !== 'undefined';
    
    if (isBrowser) {
        // Diagnóstico Frontend
        diagnosticos.frontend = {
            supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            nodeEnv: process.env.NODE_ENV,
            urlValue: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Configurada' : 'NÃO CONFIGURADA',
            keyValue: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Configurada' : 'NÃO CONFIGURADA'
        };

        // Identificar problemas
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
            diagnosticos.problemas.push('NEXT_PUBLIC_SUPABASE_URL não configurada');
            diagnosticos.solucoes.push('Configure NEXT_PUBLIC_SUPABASE_URL na Vercel');
        }

        if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            diagnosticos.problemas.push('NEXT_PUBLIC_SUPABASE_ANON_KEY não configurada');
            diagnosticos.solucoes.push('Configure NEXT_PUBLIC_SUPABASE_ANON_KEY na Vercel');
        }

    } else {
        // Diagnóstico Backend
        diagnosticos.backend = {
            supabaseUrl: !!process.env.SUPABASE_URL,
            supabaseAnonKey: !!process.env.SUPABASE_ANON_KEY,
            supabaseServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
            nodeEnv: process.env.NODE_ENV
        };
    }

    return diagnosticos;
}

export function exibirDiagnostico() {
    const diag = diagnosticarConfiguracao();
    
    console.log('🔍 DIAGNÓSTICO DE CONFIGURAÇÃO SUPABASE');
    console.log('=====================================');
    
    if (diag.frontend.supabaseUrl !== undefined) {
        console.log('🌐 FRONTEND (Browser):');
        console.log('  NEXT_PUBLIC_SUPABASE_URL:', diag.frontend.urlValue);
        console.log('  NEXT_PUBLIC_SUPABASE_ANON_KEY:', diag.frontend.keyValue);
        console.log('  NODE_ENV:', diag.frontend.nodeEnv);
    }
    
    if (diag.backend.supabaseUrl !== undefined) {
        console.log('🖥️  BACKEND (Node.js):');
        console.log('  SUPABASE_URL:', diag.backend.supabaseUrl ? 'Configurada' : 'NÃO CONFIGURADA');
        console.log('  SUPABASE_ANON_KEY:', diag.backend.supabaseAnonKey ? 'Configurada' : 'NÃO CONFIGURADA');
        console.log('  SUPABASE_SERVICE_KEY:', diag.backend.supabaseServiceKey ? 'Configurada' : 'NÃO CONFIGURADA');
    }
    
    if (diag.problemas.length > 0) {
        console.log('\n❌ PROBLEMAS IDENTIFICADOS:');
        diag.problemas.forEach((problema, i) => {
            console.log(`  ${i + 1}. ${problema}`);
        });
        
        console.log('\n✅ SOLUÇÕES:');
        diag.solucoes.forEach((solucao, i) => {
            console.log(`  ${i + 1}. ${solucao}`);
        });
    } else {
        console.log('\n✅ CONFIGURAÇÃO OK!');
    }
    
    return diag;
}

// Auto-executar se estiver no browser
if (typeof window !== 'undefined') {
    window.diagnosticarSupabase = exibirDiagnostico;
    console.log('💡 Execute window.diagnosticarSupabase() no console para ver o diagnóstico');
}
