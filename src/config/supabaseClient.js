import { createClient } from '@supabase/supabase-js'

// URL e chave anônima do Supabase
// Tentamos usar variáveis de ambiente em diferentes formatos
// Se não estiverem disponíveis, usamos valores diretos como fallback
const supabaseUrl = 
  process.env.NEXT_PUBLIC_SUPABASE_URL || 
  process.env.REACT_APP_SUPABASE_URL || 
  window.NEXT_PUBLIC_SUPABASE_URL ||
  'https://nsqiytflqwlyqhdmueki.supabase.co'

const supabaseAnonKey = 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  process.env.REACT_APP_SUPABASE_ANON_KEY || 
  window.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zcWl5dGZscXdseXFoZG11ZWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5MTc5MDQsImV4cCI6MjA1NTQ5MzkwNH0.IyrTn7Hrz-ktNM6iC1Chk8Z-kWK9rhmWljb0n2XLpjo'

// Verificar no console se os valores estão disponíveis (só em desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  console.log('Supabase URL:', supabaseUrl)
  console.log('Supabase Key disponível:', !!supabaseAnonKey)
}

// Criar o cliente do Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey) 