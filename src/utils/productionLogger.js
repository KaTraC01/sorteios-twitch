/**
 * PRODUCTION LOGGER - SISTEMA DE LOG SEGURO
 * =========================================
 * 
 * Sistema que remove automaticamente logs detalhados em produção
 * Mantém apenas logs essenciais de erro
 * 
 * @date 2025-09-21
 */

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Logger seguro para produção
 */
export const logger = {
  // Logs críticos - sempre mostrar
  error: (...args) => {
    console.error(...args);
  },
  
  // Logs de desenvolvimento - apenas em dev
  dev: (...args) => {
    if (isDevelopment) {
      console.log('[DEV]', ...args);
    }
  },
  
  // Logs de info - apenas em dev
  info: (...args) => {
    if (isDevelopment) {
      console.info('[INFO]', ...args);
    }
  },
  
  // Logs de debug - apenas em dev
  debug: (...args) => {
    if (isDevelopment) {
      console.debug('[DEBUG]', ...args);
    }
  },
  
  // Warnings importantes - sempre mostrar mas sem detalhes em prod
  warn: (...args) => {
    if (isProduction) {
      console.warn('Sistema: Operação com aviso');
    } else {
      console.warn('[WARN]', ...args);
    }
  },
  
  // Tabelas - apenas em dev
  table: (data) => {
    if (isDevelopment && console.table) {
      console.table(data);
    }
  },
  
  // Log de operação bem-sucedida - simplificado em prod
  success: (message, details = null) => {
    if (isProduction) {
      // Em produção: apenas confirmar sucesso sem detalhes
      if (message.includes('sucesso') || message.includes('✅')) {
        // Silencioso em produção
        return;
      }
    } else {
      console.log('✅', message, details || '');
    }
  }
};

/**
 * Substituir console padrão em produção
 */
if (isProduction && typeof window !== 'undefined') {
  // Sobrescrever métodos do console em produção
  const originalLog = console.log;
  const originalInfo = console.info;
  const originalDebug = console.debug;
  const originalTable = console.table;
  
  // Manter apenas error e warn
  console.log = () => {}; // Silenciar logs normais
  console.info = () => {}; // Silenciar infos
  console.debug = () => {}; // Silenciar debugs
  console.table = () => {}; // Silenciar tabelas
  
  // Manter warnings mas sem detalhes
  const originalWarn = console.warn;
  console.warn = (message, ...args) => {
    if (typeof message === 'string' && (
      message.includes('⚠️') || 
      message.includes('WARN') || 
      message.includes('aviso')
    )) {
      originalWarn('Sistema: Operação com aviso');
    }
  };
}

export default logger;
