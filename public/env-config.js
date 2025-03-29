// Este arquivo pode ser usado para injetar variáveis de ambiente no frontend
// Será carregado antes da aplicação React

// Verificar se as variáveis já estão definidas para não sobrescrever
if (typeof window !== 'undefined') {
  // Estas definições serão substituídas na build da Vercel
  // No ambiente de desenvolvimento, podemos definir valores padrão
  if (!window.NEXT_PUBLIC_SUPABASE_URL) {
    window.NEXT_PUBLIC_SUPABASE_URL = 'https://nsqiytflqwlyqhdmueki.supabase.co';
  }
  
  if (!window.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    window.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zcWl5dGZscXdseXFoZG11ZWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5MTc5MDQsImV4cCI6MjA1NTQ5MzkwNH0.IyrTn7Hrz-ktNM6iC1Chk8Z-kWK9rhmWljb0n2XLpjo';
  }
  
  console.log('Ambiente configurado via env-config.js');
} 