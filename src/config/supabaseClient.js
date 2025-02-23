import { createClient } from "@supabase/supabase-js";

// 🔍 Depuração: Verificando se as variáveis de ambiente estão carregando na Vercel
console.log("🔍 SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log("🔍 SUPABASE_ANON_KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Pegando as variáveis da Vercel
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("❌ ERRO: Variáveis de ambiente do Supabase não carregadas!");
}

// Criando o cliente Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
