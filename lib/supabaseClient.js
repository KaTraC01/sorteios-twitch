import { createClient } from '@supabase/supabase-js';

// Usar variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// Verificar se as variáveis de ambiente estão configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERRO: Variáveis de ambiente do Supabase não configuradas corretamente.');
  console.error('Por favor, configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no ambiente.');
}

// Adicionar logs para depuração (apenas na inicialização)
console.log(`SUPABASE CLIENT DEBUG: URL configurada: ${supabaseUrl ? 'Sim' : 'Não'}`);
console.log(`SUPABASE CLIENT DEBUG: ANON_KEY configurada: ${supabaseAnonKey ? 'Sim (últimos 4 caracteres: ' + (supabaseAnonKey ? supabaseAnonKey.slice(-4) : 'N/A') + ')' : 'Não'}`);

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