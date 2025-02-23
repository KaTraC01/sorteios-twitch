import { createClient } from "@supabase/supabase-js";

// 🔍 Log para depuração: Verifica se as variáveis de ambiente estão sendo lidas
console.log("🔍 SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log("🔍 SUPABASE_ANON_KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// 🔥 Teste forçando as credenciais diretamente no código (Substitua pelos valores reais do Supabase)
const SUPABASE_URL = "https://nsqiytflqwlyqhdmueki.supabase.co"; // Exemplo: "https://xyzcompany.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zcWl5dGZscXdseXFoZG11ZWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5MTc5MDQsImV4cCI6MjA1NTQ5MzkwNH0.IyrTn7Hrz-ktNM6iC1Chk8Z-kWK9rhmWljb0n2XLpjo"; // Exemplo: "eyJh..."

// Mensagem de depuração para saber se as variáveis estão carregadas corretamente
console.log("✅ SUPABASE_URL:", SUPABASE_URL ? "Carregada ✅" : "❌ Não carregada");
console.log("✅ SUPABASE_ANON_KEY:", SUPABASE_ANON_KEY ? "Carregada ✅" : "❌ Não carregada");

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("❌ ERRO: Variáveis de ambiente do Supabase não carregadas!");
}

// Criando o cliente Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
