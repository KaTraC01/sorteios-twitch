import { createClient } from "@supabase/supabase-js";

// 🔍 Log para depuração: Verifica se as variáveis de ambiente estão sendo lidas
console.log("🔍 SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log("🔍 SUPABASE_ANON_KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Pegando as variáveis corretamente da Vercel
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Mensagem de depuração para saber se as variáveis estão carregadas corretamente
console.log("✅ SUPABASE_URL:", SUPABASE_URL ? "Carregada ✅" : "❌ Não carregada");
console.log("✅ SUPABASE_ANON_KEY:", SUPABASE_ANON_KEY ? "Carregada ✅" : "❌ Não carregada");

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("❌ ERRO: Variáveis de ambiente do Supabase não carregadas!");
}

// Criando o cliente Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
