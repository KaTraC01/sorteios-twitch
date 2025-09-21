/**
 * MIDDLEWARE CORS SEGURO
 * ======================
 * 
 * Middleware para configuração segura de CORS em todas as APIs
 * Permite apenas origins específicos e métodos seguros
 * 
 * @date 2025-09-21
 */

import { NextResponse } from 'next/server';

// Lista de origins permitidos
const ALLOWED_ORIGINS = [
  'https://sorteios-twitch.vercel.app',
  'https://sorteios-twitch-git-main-katrac01.vercel.app',
  // Permitir localhost apenas em desenvolvimento
  ...(process.env.NODE_ENV === 'development' ? [
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ] : [])
];

// Métodos HTTP permitidos
const ALLOWED_METHODS = ['GET', 'POST', 'OPTIONS'];

// Headers permitidos
const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'Accept',
  'Origin'
];

/**
 * Verificar se origin é permitido
 */
function isOriginAllowed(origin) {
  // Se não há origin (requisições same-origin), permitir
  if (!origin) return true;
  
  // Verificar se está na lista de permitidos
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Middleware CORS
 */
export function middleware(request) {
  const origin = request.headers.get('origin');
  const method = request.method;
  
  // Headers de resposta
  const headers = new Headers();
  
  // Configurar CORS baseado no origin
  if (isOriginAllowed(origin)) {
    headers.set('Access-Control-Allow-Origin', origin || '*');
  } else {
    // Origin não permitido - negar acesso
    console.warn(`🚫 CORS: Origin não permitido: ${origin}`);
    return new Response('CORS: Origin não permitido', { 
      status: 403,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
  
  // Configurar métodos permitidos
  headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS.join(', '));
  
  // Configurar headers permitidos
  headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS.join(', '));
  
  // Cache do preflight
  headers.set('Access-Control-Max-Age', '86400'); // 24 horas
  
  // Headers de segurança adicionais
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Lidar com requisições OPTIONS (preflight)
  if (method === 'OPTIONS') {
    return new Response(null, { 
      status: 200, 
      headers 
    });
  }
  
  // Verificar se método é permitido
  if (!ALLOWED_METHODS.includes(method)) {
    console.warn(`🚫 CORS: Método não permitido: ${method}`);
    return new Response('Método não permitido', { 
      status: 405,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
  
  // Log de acesso permitido (apenas em desenvolvimento)
  if (process.env.NODE_ENV === 'development') {
    console.log(`✅ CORS: Acesso permitido - Origin: ${origin}, Method: ${method}`);
  }
  
  // Continuar para o próximo middleware/handler
  return NextResponse.next({
    headers
  });
}

/**
 * Configuração do middleware
 */
export const config = {
  matcher: '/api/:path*'
};
