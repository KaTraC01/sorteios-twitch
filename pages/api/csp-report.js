/**
 * CSP VIOLATION REPORTER
 * =====================
 * 
 * Endpoint para coletar violações de CSP em modo Report-Only
 * Ajuda a identificar recursos externos não mapeados
 * 
 * @date 2025-09-23
 */

export default async function handler(req, res) {
  // Aceitar apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const violation = req.body;
    
    // Log estruturado das violações CSP
    console.log('🚨 CSP VIOLATION DETECTED:', {
      timestamp: new Date().toISOString(),
      directive: violation['violated-directive'],
      blockedURI: violation['blocked-uri'],
      sourceFile: violation['source-file'],
      lineNumber: violation['line-number'],
      originalPolicy: violation['original-policy']?.substring(0, 100) + '...'
    });

    // Resposta rápida
    res.status(204).end();
  } catch (error) {
    console.error('❌ Erro ao processar violation report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
