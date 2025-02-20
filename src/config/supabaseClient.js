import { createClient } from "@supabase/supabase-js";

// Pegando as variáveis de ambiente da Vercel ou do `.env.local`
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Erro: SUPABASE_URL ou SUPABASE_ANON_KEY não estão definidas.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
