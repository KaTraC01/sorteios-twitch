/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Garantir que as variáveis de ambiente sejam injetadas corretamente
  env: {
    // Essas variáveis serão substituídas durante o build com os valores reais
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  // SEGURANÇA: Configuração webpack removida para evitar vazamento de credenciais
  // As variáveis de ambiente são injetadas automaticamente pelo Next.js via 'env'
  // Configuração para suportar páginas HTML estáticas
  trailingSlash: true,
};

module.exports = nextConfig; 