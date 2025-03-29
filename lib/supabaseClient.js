import { createClient } from '@supabase/supabase-js';

// Usar variáveis de ambiente ou valores padrão como fallback
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.SUPABASE_URL || 
                     "https://nsqiytflqwlyqhdmueki.supabase.co";

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                         process.env.SUPABASE_ANON_KEY || 
                         "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zcWl5dGZscXdseXFoZG11ZWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5MTc5MDQsImV4cCI6MjA1NTQ5MzkwNH0.IyrTn7Hrz-ktNM6iC1Chk8Z-kWK9rhmWljb0n2XLpjo";

// Verificar se as variáveis de ambiente estão configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERRO: Variáveis de ambiente do Supabase não configuradas corretamente.');
  console.error('Por favor, configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no ambiente.');
}

// Adicionar logs para depuração (apenas na inicialização)
console.log(`SUPABASE CLIENT DEBUG: URL configurada: ${supabaseUrl}`);
console.log(`SUPABASE CLIENT DEBUG: ANON_KEY configurada: ${supabaseAnonKey ? 'Sim (últimos 4 caracteres: ' + supabaseAnonKey.slice(-4) + ')' : 'Não'}`);

// Criar e exportar o cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Função de teste para verificar a conexão
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('configuracoes').select('*').limit(1);
    
    if (error) {
      console.error('SUPABASE TESTE CONEXÃO: Erro ao conectar', error);
      return {
        success: false,
        error: error.message
      };
    }
    
    console.log('SUPABASE TESTE CONEXÃO: Conexão bem sucedida');
    return {
      success: true,
      data
    };
  } catch (err) {
    console.error('SUPABASE TESTE CONEXÃO: Erro crítico', err);
    return {
      success: false,
      error: err.message
    };
  }
} 