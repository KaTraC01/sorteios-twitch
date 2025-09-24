/**
 * Utilitários para padronizar e sanitizar respostas de API
 */

const logger = require('./logger');

// Verificar se estamos em ambiente de produção
function isProduction() {
  const environment = process.env.NODE_ENV || process.env.VERCEL_ENV || 'development';
  return environment === 'production';
}

/**
 * Função para criar uma resposta de erro padronizada e segura
 * Em produção, as mensagens de erro são generalizadas para evitar vazamento de informações
 * 
 * @param {Object} res - Objeto de resposta do Next.js/Express
 * @param {number} statusCode - Código de status HTTP (ex: 400, 500)
 * @param {string} publicMessage - Mensagem segura para mostrar ao usuário
 * @param {Error|string} error - Erro original ou mensagem de erro detalhada (só será exposta em desenvolvimento)
 * @param {Object} additionalData - Dados adicionais seguros para incluir na resposta
 * @returns {Object} Resposta HTTP formatada
 */
function errorResponse(res, statusCode, publicMessage, error, additionalData = {}) {
  // Registrar o erro detalhado internamente (logs)
  if (error instanceof Error) {
    logger.error(`API Error (${statusCode}): ${publicMessage}`, error);
  } else {
    logger.error(`API Error (${statusCode}): ${publicMessage} - ${error || 'No additional details'}`);
  }

  // Formatar a resposta baseada no ambiente
  const errorDetail = error instanceof Error ? error.message : error;
  
  // Payload base da resposta
  const payload = {
    success: false,
    error: publicMessage,
    ...additionalData
  };
  
  // Em ambiente de desenvolvimento, incluir detalhes adicionais
  if (!isProduction()) {
    payload.detail = errorDetail || 'No detailed error message provided';
    
    // Incluir stack trace apenas em desenvolvimento e apenas se for um objeto Error
    if (error instanceof Error && error.stack) {
      payload.stack = error.stack;
    }
  }
  
  // Adicionar timestamp à resposta
  payload.timestamp = new Date().toISOString();
  
  return res.status(statusCode).json(payload);
}

/**
 * Função para criar uma resposta de sucesso padronizada
 * 
 * @param {Object} res - Objeto de resposta do Next.js/Express
 * @param {string} message - Mensagem de sucesso
 * @param {Object} data - Dados a serem retornados
 * @param {number} statusCode - Código de status HTTP (padrão: 200)
 * @returns {Object} Resposta HTTP formatada
 */
function successResponse(res, message, data = {}, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
}

/**
 * Função wrapper para lidar com exceções em handlers de API
 * 
 * @param {Function} handler - Função handler da API
 * @returns {Function} Handler envolvido com tratamento de erro
 */
function withErrorHandling(handler) {
  return async (req, res) => {
    try {
      return await handler(req, res);
    } catch (error) {
      return errorResponse(
        res,
        500,
        'Ocorreu um erro interno no servidor.',
        error
      );
    }
  };
}

module.exports = {
  errorResponse,
  successResponse,
  withErrorHandling,
  isProduction
}; 