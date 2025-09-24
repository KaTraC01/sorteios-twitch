/**
 * ENDPOINT CSP REPORT - PROCESSAMENTO DE VIOLAÇÕES CSP
 * ====================================================
 * 
 * Recebe e processa relatórios de violação do Content Security Policy
 * Ajuda a identificar e corrigir problemas de segurança
 * 
 * @author Sistema de Segurança v1.0
 * @date 2025-09-24
 */

const logger = require('../lib/logger');

async function handler(req, res) {
  try {
    // Aceitar apenas POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ 
        error: 'Método não permitido',
        allowed: ['POST'] 
      });
    }

    // Processar relatório CSP
    const cspReport = req.body;
    
    // Log básico (sem dados sensíveis)
    if (cspReport && cspReport['csp-report']) {
      const report = cspReport['csp-report'];
      
      logger.warn('Violação CSP detectada:', {
        directive: report['violated-directive'],
        blockedUri: report['blocked-uri']?.substring(0, 100), // Limitar tamanho
        documentUri: report['document-uri']?.substring(0, 100),
        lineNumber: report['line-number'],
        sourceFile: report['source-file']?.substring(0, 100)
      });
    } else {
      logger.debug('Relatório CSP recebido (formato não padrão)');
    }

    // Responder com sucesso (204 No Content é padrão para CSP reports)
    return res.status(204).end();

  } catch (error) {
    logger.error('Erro ao processar relatório CSP:', error.message);
    return res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  }
}

module.exports = handler;
