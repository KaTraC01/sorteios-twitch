import { createClient } from '@supabase/supabase-js'

// URL e chave anônima do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY

// Criar o cliente do Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey) 