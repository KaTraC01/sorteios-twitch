import { createClient } from "@supabase/supabase-js";

// Obter as variáveis de ambiente
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || "https://nsqiytflqwlyqhdmueki.supabase.co";
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zcWl5dGZscXdseXFoZG11ZWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5MTc5MDQsImV4cCI6MjA1NTQ5MzkwNH0.IyrTn7Hrz-ktNM6iC1Chk8Z-kWK9rhmWljb0n2XLpjo";

// Verificar se as variáveis estão definidas
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Erro: Variáveis de ambiente do Supabase não carregadas!");
} else {
    console.log("Supabase URL:", SUPABASE_URL);
    console.log("Supabase Key:", SUPABASE_ANON_KEY.substring(0, 10) + "...");
}

// Criando o cliente Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
