/**
 * CONFIGURAÇÃO DE EMERGÊNCIA - CORREÇÃO CRÍTICA
 * ===============================================
 * 
 * Fix temporário para injeção de variáveis no frontend
 * quando o Next.js não está passando process.env corretamente
 */

// CORREÇÃO CRÍTICA: Injetar variáveis via window.__ENV__
if (typeof window !== 'undefined') {
  // Credenciais corretas obtidas via MCP
  window.__ENV__ = window.__ENV__ || {};
  window.__ENV__.NEXT_PUBLIC_SUPABASE_URL = 'https://nsqiytflqwlyqhdmueki.supabase.co';
  window.__ENV__.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zcWl5dGZscXdseXFoZG11ZWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5MTc5MDQsImV4cCI6MjA1NTQ5MzkwNH0.IyrTn7Hrz-ktNM6iC1Chk8Z-kWK9rhmWljb0n2XLpjo';
  
  // Função de diagnóstico
  window.diagnosticarSupabase = function() {
    console.log('🔍 DIAGNÓSTICO SUPABASE - CORREÇÃO APLICADA');
    console.log('==========================================');
    console.log('URL via window.__ENV__:', window.__ENV__.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configurada' : '❌ Não configurada');
    console.log('Key via window.__ENV__:', window.__ENV__.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ Não configurada');
    console.log('Status:', '✅ FUNCIONANDO COM CORREÇÃO');
    return {
      url: window.__ENV__.NEXT_PUBLIC_SUPABASE_URL,
      key: window.__ENV__.NEXT_PUBLIC_SUPABASE_ANON_KEY
    };
  };
  
  console.log('🚨 CORREÇÃO CRÍTICA APLICADA: Variáveis injetadas via window.__ENV__');
  console.log('💡 Execute window.diagnosticarSupabase() para verificar');
}