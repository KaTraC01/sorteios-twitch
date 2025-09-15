/**
 * CONFIGURAÇÃO DE HEADERS DE SEGURANÇA
 * ====================================
 * 
 * Headers de segurança para proteção contra:
 * - XSS (Cross-Site Scripting)
 * - Clickjacking
 * - MIME sniffing
 * - Protocol downgrade attacks
 * 
 * @author Security Team
 * @date 2025-01-15
 */

// ===================================================================
// CONTENT SECURITY POLICY (CSP)
// ===================================================================

/**
 * Configuração de CSP para produção
 */
export const productionCSP = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Necessário para React inline scripts
    "https://vercel.live", // Vercel analytics
    "https://vitals.vercel-analytics.com" // Vercel web vitals
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'" // Necessário para CSS-in-JS do React
  ],
  'img-src': [
    "'self'",
    "data:", // Base64 images
    "https:", // External images
    "https://static-cdn.jtvnw.net", // Twitch avatars
    "https://yt3.ggpht.com" // YouTube avatars
  ],
  'connect-src': [
    "'self'",
    "https://nsqiytflqwlyqhdmueki.supabase.co", // Supabase API
    "wss://nsqiytflqwlyqhdmueki.supabase.co", // Supabase Realtime
    "https://vercel.live", // Vercel analytics
    "https://vitals.vercel-analytics.com" // Vercel web vitals
  ],
  'font-src': [
    "'self'",
    "data:", // Inline fonts
    "https://fonts.gstatic.com" // Google Fonts
  ],
  'object-src': ["'none'"], // Bloquear plugins
  'media-src': ["'self'"],
  'child-src': ["'none'"], // Bloquear iframes
  'worker-src': ["'self'"],
  'manifest-src': ["'self'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"]
};

/**
 * Configuração de CSP para desenvolvimento
 */
export const developmentCSP = {
  ...productionCSP,
  'script-src': [
    ...productionCSP['script-src'],
    "'unsafe-eval'", // Necessário para HMR
    "http://localhost:*", // Dev server
    "ws://localhost:*" // WebSocket HMR
  ],
  'connect-src': [
    ...productionCSP['connect-src'],
    "http://localhost:*", // Dev server
    "ws://localhost:*", // WebSocket HMR
    "wss://localhost:*" // Secure WebSocket
  ]
};

/**
 * Gerar string CSP
 * @param {Object} csp - Configuração CSP
 * @returns {string} - CSP string
 */
export function generateCSP(csp) {
  return Object.entries(csp)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

// ===================================================================
// SECURITY HEADERS COMPLETOS
// ===================================================================

/**
 * Headers de segurança para produção
 */
export const securityHeaders = {
  // Content Security Policy
  'Content-Security-Policy': generateCSP(productionCSP),
  
  // Prevent XSS attacks
  'X-XSS-Protection': '1; mode=block',
  
  // Prevent MIME sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  
  // Strict Transport Security (HTTPS only)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // Referrer Policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions Policy (Feature Policy)
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'interest-cohort=()',
    'payment=()',
    'usb=()'
  ].join(', '),
  
  // Cross-Origin Policies
  'Cross-Origin-Embedder-Policy': 'unsafe-none',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin'
};

/**
 * Headers de segurança para desenvolvimento
 */
export const developmentSecurityHeaders = {
  ...securityHeaders,
  'Content-Security-Policy': generateCSP(developmentCSP),
  // Relaxar algumas políticas para desenvolvimento
  'Cross-Origin-Resource-Policy': 'cross-origin'
};

// ===================================================================
// FUNÇÃO PARA APLICAR HEADERS
// ===================================================================

/**
 * Aplicar headers de segurança em responses
 * @param {Object} res - Response object
 * @param {boolean} isDevelopment - Se é ambiente de desenvolvimento
 */
export function applySecurityHeaders(res, isDevelopment = false) {
  const headers = isDevelopment ? developmentSecurityHeaders : securityHeaders;
  
  Object.entries(headers).forEach(([header, value]) => {
    res.setHeader(header, value);
  });
}

// ===================================================================
// VALIDAÇÃO DE ORIGEM (CORS)
// ===================================================================

/**
 * Domínios permitidos para CORS
 */
export const allowedOrigins = [
  'https://sorteios-twitch.vercel.app',
  'https://sorteios-twitch-git-main-leonardo-santiagos-projects-5168f40a.vercel.app',
  ...(process.env.NODE_ENV === 'development' ? [
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ] : [])
];

/**
 * Validar origem da requisição
 * @param {string} origin - Origem da requisição
 * @returns {boolean} - Se a origem é permitida
 */
export function isOriginAllowed(origin) {
  if (!origin && process.env.NODE_ENV === 'development') {
    return true; // Permitir requests sem origin em dev
  }
  
  return allowedOrigins.includes(origin);
}

/**
 * Configurar CORS de forma segura
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {boolean} - Se deve prosseguir
 */
export function configureCORS(req, res) {
  const origin = req.headers.origin;
  
  if (isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 horas
    return true;
  }
  
  return false;
}

// ===================================================================
// EXPORTAÇÃO DEFAULT
// ===================================================================

export default {
  productionCSP,
  developmentCSP,
  generateCSP,
  securityHeaders,
  developmentSecurityHeaders,
  applySecurityHeaders,
  allowedOrigins,
  isOriginAllowed,
  configureCORS
};
