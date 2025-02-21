import { createClient } from "@supabase/supabase-js";

// Pegando as variáveis corretamente da Vercel
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("❌ ERRO: SUPABASE_URL ou SUPABASE_ANON_KEY não estão definidas.");
    throw new Error("Variáveis de ambiente do Supabase não carregadas!");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
