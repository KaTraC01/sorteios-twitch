import { createClient } from "@supabase/supabase-js";

// Pegando as variáveis corretamente da Vercel
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("SUPABASE_URL:", SUPABASE_URL);
console.log("SUPABASE_ANON_KEY:", SUPABASE_ANON_KEY ? "Carregada ✅" : "❌ Não carregada");

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("❌ ERRO: Variáveis de ambiente do Supabase não carregadas!");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
