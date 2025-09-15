// Endpoint de diagnóstico para verificar variáveis de ambiente
// Acesse /api/debug-env para ver o status

export default function handler(req, res) {
  // SEGURANÇA: Endpoint protegido - apenas com autenticação válida
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(404).json({ error: 'Endpoint não encontrado' });
  }
  
  const token = authHeader.split(' ')[1];
  if (token !== process.env.API_SECRET_KEY) {
    return res.status(404).json({ error: 'Endpoint não encontrado' });
  }
  // Verificar apenas se as variáveis existem, sem mostrar valores completos
  const diagnostico = {
    variaveisConfiguradas: {
      // Frontend (navegador)
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      
      // Backend (API routes)
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
      API_SECRET_KEY: !!process.env.API_SECRET_KEY,
      CRON_SECRET: !!process.env.CRON_SECRET,
      BASE_URL: !!process.env.BASE_URL
    },
    
    // Mostrar apenas os primeiros caracteres das URLs para diagnóstico
    partialValues: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 
        process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 15) + '...' : 'não configurado',
      SUPABASE_URL: process.env.SUPABASE_URL ? 
        process.env.SUPABASE_URL.substring(0, 15) + '...' : 'não configurado',
      BASE_URL: process.env.BASE_URL ? 
        process.env.BASE_URL.substring(0, 15) + '...' : 'não configurado'
    }
  };
  
  res.status(200).json(diagnostico);
} 