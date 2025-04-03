/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Garantir que as variáveis de ambiente sejam injetadas corretamente
  env: {
    // Essas variáveis serão substituídas durante o build com os valores reais
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  // Configurações para o processamento de HTML
  webpack: (config, { isServer, dev }) => {
    // Adicionar regra para substituir placeholders nos arquivos HTML
    config.module.rules.push({
      test: /\.html$/,
      use: [
        {
          loader: 'html-loader',
          options: {
            minimize: !dev,
            preprocessor: (content) => {
              // Substituir placeholders de variáveis de ambiente
              return content
                .replace(/%NEXT_PUBLIC_SUPABASE_URL%/g, process.env.NEXT_PUBLIC_SUPABASE_URL || '')
                .replace(/%NEXT_PUBLIC_SUPABASE_ANON_KEY%/g, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''); // Exposição controlada da chave
            },
          },
        },
      ],
    });
    return config;
  },
  // Configuração para suportar páginas HTML estáticas
  trailingSlash: true,
};

module.exports = nextConfig; 