import { createClient } from '@supabase/supabase-js'

// URL e chave anônima do Supabase
// Tentamos usar variáveis de ambiente em diferentes formatos
const supabaseUrl = 
  process.env.NEXT_PUBLIC_SUPABASE_URL || 
  process.env.REACT_APP_SUPABASE_URL || 
  window.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKey = 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  process.env.REACT_APP_SUPABASE_ANON_KEY || 
  window.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Verificar se as chaves estão configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERRO: Configuração do Supabase incompleta - variáveis de ambiente não definidas.');
  console.error('Por favor, configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no ambiente.');
}

// Verificar no console se os valores estão disponíveis
// console.log('Supabase URL configurada:', !!supabaseUrl);
// console.log('Supabase Key configurada:', !!supabaseAnonKey);

// Criar o cliente do Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey) 