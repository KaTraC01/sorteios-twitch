import { createClient } from '@supabase/supabase-js';

// Usar variáveis de ambiente 
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                    process.env.SUPABASE_URL || 
                    process.env.REACT_APP_SUPABASE_URL;

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                        process.env.SUPABASE_ANON_KEY || 
                        process.env.REACT_APP_SUPABASE_ANON_KEY;

// Verificar se as variáveis de ambiente estão configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERRO: Variáveis de ambiente do Supabase não configuradas corretamente.');
  console.error('Por favor, configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no ambiente.');
}

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

// Função utilitária para sanitizar entradas (defesa contra SQL Injection e XSS)
export function sanitizarEntrada(texto) {
  if (!texto) return "";
  let sanitizado = texto
    // Remove apenas caracteres realmente perigosos, mas permite letras e números de qualquer idioma
    .replace(/[<>'"\\/\{\}\[\];]/g, '') // Remove caracteres potencialmente perigosos
    .replace(/--/g, '_')                // Remove possíveis injeções SQL
    .replace(/script/gi, '')            // Remove tentativas de XSS
    .trim();                            // Remove espaços extras
  // Limitar comprimento
  return sanitizado.substring(0, 25);
} 