/**
 * CONFIGURAÇÃO SIMPLIFICADA E SEGURA
 * ===================================
 * 
 * Este arquivo verifica se as variáveis de ambiente estão configuradas
 * EXCLUSIVAMENTE via Vercel Environment Variables
 * 
 * NUNCA adicione credenciais hardcoded aqui!
 */

// Aguardar DOM carregado
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', function() {
    // Verificar se as variáveis de ambiente do Next.js estão disponíveis
    const config = {
      supabaseUrl: process?.env?.NEXT_PUBLIC_SUPABASE_URL || null,
      supabaseKey: process?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || null
    };
    
    // Log apenas em desenvolvimento
    const isDev = window.location.hostname.includes('localhost') || 
                  window.location.hostname.includes('127.0.0.1');
    
    if (isDev) {
      console.log('🔧 Verificação de configuração:');
      console.log('URL Supabase:', config.supabaseUrl ? '✅ Configurada' : '❌ Não configurada');
      console.log('Chave Supabase:', config.supabaseKey ? '✅ Configurada' : '❌ Não configurada');
      
      if (!config.supabaseUrl || !config.supabaseKey) {
        console.error('⚠️ Configure as variáveis na Vercel:');
        console.error('- NEXT_PUBLIC_SUPABASE_URL');
        console.error('- NEXT_PUBLIC_SUPABASE_ANON_KEY');
      }
    }
    
    // Disponibilizar função de diagnóstico global
    window.diagnosticarSupabase = function() {
      console.log('🔍 DIAGNÓSTICO SUPABASE');
      console.log('=======================');
      console.log('URL:', config.supabaseUrl ? '✅ Configurada' : '❌ Não configurada');
      console.log('Key:', config.supabaseKey ? '✅ Configurada' : '❌ Não configurada');
      console.log('Status:', (config.supabaseUrl && config.supabaseKey) ? '✅ OK' : '❌ ERRO');
      return config;
    };
  });
}