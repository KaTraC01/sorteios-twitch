/**
 * SUPABASE CONNECTION MANAGER
 * ===========================
 * 
 * Gerenciador centralizado de conexões com Supabase
 * Implementa padrão Singleton para otimizar o pool de conexões
 * 
 * ANTES: 46 instâncias de createClient espalhadas pelo projeto
 * DEPOIS: 2 instâncias controladas (anônima + serviço)
 * 
 * @author Sistema de Otimização
 * @date $(new Date().toISOString())
 */

import { createClient } from '@supabase/supabase-js';
import logger from '../utils/logger';

// ===================================================================
// CONFIGURAÇÃO DE VARIÁVEIS DE AMBIENTE
// ===================================================================

// ✅ SEGURANÇA: Credenciais apenas via variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Debug: verificar variáveis disponíveis (SEGURO - apenas em desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  if (typeof window !== 'undefined') {
    console.log('🔍 [DEBUG] Configuração Supabase frontend verificada');
    console.log('URL configurada:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Key configurada:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  } else {
    console.log('🔍 [DEBUG] Configuração Supabase backend verificada');
    console.log('URL configurada:', !!process.env.SUPABASE_URL);
    console.log('Key configurada:', !!process.env.SUPABASE_ANON_KEY);
    console.log('Service Key configurada:', !!process.env.SUPABASE_SERVICE_KEY);
  }
}

// Verificar se estamos no browser ou servidor
const isBrowser = typeof window !== 'undefined';

// ✅ SEGURANÇA: Validação rigorosa de configuração
if (!supabaseUrl) {
  const error = 'ERRO CRÍTICO: SUPABASE_URL não configurada. Configure as variáveis de ambiente.';
  logger.error(error);
  throw new Error(error);
}

if (!supabaseAnonKey) {
  const error = 'ERRO CRÍTICO: SUPABASE_ANON_KEY não configurada. Configure as variáveis de ambiente.';
  logger.error(error);
  throw new Error(error);
}

// ===================================================================
// SINGLETON CLIENTS - OTIMIZAÇÃO DE POOL DE CONEXÕES
// ===================================================================

let anonClient = null;
let serviceClient = null;

/**
 * Cliente Supabase para operações anônimas (frontend)
 * Usado por: componentes React, páginas públicas
 * Pool: Conexões anônimas limitadas
 */
export function getSupabaseClient() {
  // ✅ SEGURANÇA: Validação foi movida para o topo do arquivo
  
  if (!anonClient) {
    if (!isBrowser) {
      logger.debug('Inicializando cliente Supabase anônimo (singleton)');
    }
    
    anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: isBrowser,
        persistSession: isBrowser,
        detectSessionInUrl: isBrowser
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
    
    if (!isBrowser) {
      logger.info('Cliente Supabase anônimo inicializado com sucesso');
    }
  }
  
  return anonClient;
}

/**
 * Cliente Supabase para operações de serviço (backend)
 * Usado por: APIs, cron jobs, operações administrativas
 * Pool: Conexões privilegiadas
 */
export function getSupabaseServiceClient() {
  if (!serviceClient) {
    if (!supabaseServiceKey) {
      const error = 'ERRO: Chave de serviço do Supabase não configurada para operações administrativas';
      logger.error(error);
      throw new Error(error);
    }
    
    logger.debug('Inicializando cliente Supabase de serviço (singleton)');
    
    serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      realtime: {
        params: {
          eventsPerSecond: 50 // Maior throughput para operações administrativas
        }
      }
    });
    
    logger.info('Cliente Supabase de serviço inicializado com sucesso');
  }
  
  return serviceClient;
}

/**
 * Cliente otimizado para funções serverless e cron jobs
 * Configuração específica para reduzir overhead de conexão
 */
export function getSupabaseServerlessClient() {
  // Para serverless, sempre criar uma nova instância otimizada
  // Não usar singleton pois o contexto é efêmero
  
  if (!supabaseServiceKey) {
    const error = 'ERRO: Chave de serviço necessária para operações serverless';
    logger.error(error);
    throw new Error(error);
  }
  
  logger.debug('Criando cliente Supabase serverless otimizado');
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    realtime: {
      params: {
        eventsPerSecond: 100 // Alta performance para operações batch
      }
    },
    db: {
      schema: 'public'
    }
  });
}

// ===================================================================
// UTILITÁRIOS E DIAGNÓSTICOS
// ===================================================================

// ✅ SEGURANÇA: Proteção rigorosa contra manipulação via console em produção
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  // Bloquear acesso global ao Supabase
  Object.defineProperty(window, 'supabase', {
    get: () => undefined,
    set: () => false,
    configurable: false,
    enumerable: false
  });
  
  // Lista completa de funções debug a remover
  const debugFunctions = [
    'adTrackerDiagnostico',
    'limparLogsAdTracker', 
    'verEventosAdTracker',
    'getConnectionStatus',
    'testSupabaseConnection',
    'resetConnections'
  ];
  
  // Remover TODAS as funções de debug imediatamente
  debugFunctions.forEach(func => {
    if (window[func]) {
      delete window[func];
    }
    // Prevenir redefinição
    Object.defineProperty(window, func, {
      get: () => undefined,
      set: () => false,
      configurable: false,
      enumerable: false
    });
  });
  
  // Bloquear console.log em produção (opcional)
  if (process.env.REACT_APP_BLOCK_CONSOLE === 'true') {
    console.log = () => {};
    console.warn = () => {};
    console.error = () => {};
  }
}

/**
 * Testa a conexão com o Supabase
 * Função mantida para compatibilidade com código existente
 */
export async function testSupabaseConnection() {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.from('configuracoes').select('*').limit(1);
    
    if (error) {
      logger.error('TESTE CONEXÃO: Erro ao conectar', error);
      return {
        success: false,
        error: error.message
      };
    }
    
    logger.info('TESTE CONEXÃO: Conexão bem-sucedida');
    return {
      success: true,
      data
    };
  } catch (err) {
    logger.critical('TESTE CONEXÃO: Erro crítico', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Função de diagnóstico para verificar status dos clientes
 */
export function getConnectionStatus() {
  return {
    anonClientInitialized: anonClient !== null,
    serviceClientInitialized: serviceClient !== null,
    environment: {
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
      hasServiceKey: !!supabaseServiceKey
    }
  };
}

/**
 * Função para resetar conexões (útil para testes)
 * ATENÇÃO: Use apenas em desenvolvimento
 */
export function resetConnections() {
  if (process.env.NODE_ENV === 'production') {
    logger.warn('Reset de conexões ignorado em produção');
    return;
  }
  
  logger.debug('Resetando conexões Supabase');
  anonClient = null;
  serviceClient = null;
}

// ===================================================================
// EXPORTAÇÕES PARA COMPATIBILIDADE COM CÓDIGO EXISTENTE
// ===================================================================

// Exportação padrão para compatibilidade
export const supabase = getSupabaseClient();

// Função de sanitização mantida para compatibilidade
export function sanitizarEntrada(entrada) {
  if (typeof entrada !== 'string') {
    return entrada;
  }
  
  return entrada
    .trim()
    .replace(/[<>]/g, '') // Remove tags HTML básicas
    .substring(0, 255); // Limita tamanho
}

// ===================================================================
// LOG DE INICIALIZAÇÃO
// ===================================================================

logger.info('Supabase Manager carregado - Pool de conexões otimizado');
logger.debug(`Configuração: URL=${!!supabaseUrl}, AnonKey=${!!supabaseAnonKey}, ServiceKey=${!!supabaseServiceKey}`);
