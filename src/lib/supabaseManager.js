/**
 * SUPABASE MANAGER - CONFIGURAÇÃO LIMPA E SEGURA
 * ==============================================
 * 
 * Sistema de conexão otimizado com Supabase
 * 
 * ✅ SEGURANÇA: Apenas variáveis de ambiente da Vercel
 * ✅ PERFORMANCE: Padrão Singleton
 * ✅ COMPATIBILIDADE: Frontend e Backend
 * 
 * @author Sistema de Otimização v2.0
 * @date 2025-01-13
 */

import { createClient } from '@supabase/supabase-js';
import logger from '../utils/logger';

// ===================================================================
// CONFIGURAÇÃO LIMPA - APENAS VERCEL ENVIRONMENT VARIABLES
// ===================================================================

// Obter credenciais (prioritário: NEXT_PUBLIC para frontend)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Verificar ambiente
const isBrowser = typeof window !== 'undefined';
const isDevelopment = process.env.NODE_ENV === 'development';

// ===================================================================
// VALIDAÇÃO RIGOROSA (SEM FALLBACKS INSEGUROS)
// ===================================================================

if (!supabaseUrl) {
  const error = 'ERRO CRÍTICO: NEXT_PUBLIC_SUPABASE_URL não configurada na Vercel.';
  logger.error(error);
  
  if (isBrowser) {
    console.error('🚨 CONFIGURAÇÃO AUSENTE:', error);
    console.error('💡 Configure na Vercel: NEXT_PUBLIC_SUPABASE_URL');
    console.error('📖 Veja: GUIA_CONFIGURACAO_VERCEL.md');
  } else {
    throw new Error(error);
  }
}

if (!supabaseAnonKey) {
  const error = 'ERRO CRÍTICO: NEXT_PUBLIC_SUPABASE_ANON_KEY não configurada na Vercel.';
  logger.error(error);
  
  if (isBrowser) {
    console.error('🚨 CONFIGURAÇÃO AUSENTE:', error);
    console.error('💡 Configure na Vercel: NEXT_PUBLIC_SUPABASE_ANON_KEY');
    console.error('📖 Veja: GUIA_CONFIGURACAO_VERCEL.md');
  } else {
    throw new Error(error);
  }
}

// ===================================================================
// SISTEMA DE CONEXÃO - PADRÃO SINGLETON
// ===================================================================

let supabaseClient = null;
let supabaseServiceClient = null;

/**
 * Obter cliente Supabase anônimo (frontend/público)
 * @returns {Object} Cliente Supabase
 */
export function getSupabaseClient() {
  if (!supabaseClient && supabaseUrl && supabaseAnonKey) {
    try {
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: isBrowser,
          autoRefreshToken: isBrowser,
        },
        global: {
          headers: {
            'x-client-info': 'sorteio-system/1.0'
          }
        }
      });
      
      if (isDevelopment) {
        logger.info('✅ Cliente Supabase anônimo inicializado');
      }
    } catch (error) {
      logger.error('❌ Erro ao inicializar cliente Supabase:', error);
      throw error;
    }
  }
  
  return supabaseClient;
}

/**
 * Obter cliente Supabase com privilégios de serviço (backend/admin)
 * @returns {Object} Cliente Supabase Service
 */
export function getSupabaseServiceClient() {
  if (!isBrowser && supabaseServiceKey && supabaseUrl) {
    if (!supabaseServiceClient) {
      try {
        supabaseServiceClient = createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            persistSession: false,
          },
          global: {
            headers: {
              'x-client-info': 'sorteio-system-service/1.0'
            }
          }
        });
        
        if (isDevelopment) {
          logger.info('✅ Cliente Supabase Service inicializado');
        }
      } catch (error) {
        logger.error('❌ Erro ao inicializar cliente Supabase Service:', error);
        throw error;
      }
    }
    return supabaseServiceClient;
  }
  
  // No frontend ou sem service key, retornar cliente anônimo
  return getSupabaseClient();
}

// ===================================================================
// FUNÇÕES DE DIAGNÓSTICO E STATUS
// ===================================================================

/**
 * Verificar status da conexão
 * @returns {Object} Status da conexão
 */
export function getConnectionStatus() {
  const status = {
    configured: !!supabaseUrl && !!supabaseAnonKey,
    url: supabaseUrl ? '✅ Configurada' : '❌ Ausente',
    anonKey: supabaseAnonKey ? '✅ Configurada' : '❌ Ausente',
    serviceKey: supabaseServiceKey ? '✅ Configurada' : '❌ Ausente',
    environment: isBrowser ? 'Frontend' : 'Backend',
    clientInitialized: !!supabaseClient,
    serviceClientInitialized: !!supabaseServiceClient
  };
  
  if (isDevelopment) {
    console.log('🔍 Status da Conexão Supabase:', status);
  }
  
  return status;
}

/**
 * Testar conexão com Supabase
 * @returns {Promise<boolean>} Sucesso da conexão
 */
export async function testSupabaseConnection() {
  try {
    const client = getSupabaseClient();
    
    // Teste simples de conectividade
    const { data, error } = await client
      .from('configuracoes')
      .select('*')
      .limit(1);
    
    if (error) {
      logger.error('❌ Erro no teste de conexão:', error);
      return false;
    }
    
    logger.info('✅ Conexão com Supabase funcionando');
    return true;
  } catch (error) {
    logger.error('❌ Falha no teste de conexão:', error);
    return false;
  }
}

// ===================================================================
// EXPORTAÇÕES PRINCIPAIS
// ===================================================================

// Cliente padrão (anônimo)
export const supabase = getSupabaseClient();

// Função para reset (útil em testes)
export function resetConnections() {
  supabaseClient = null;
  supabaseServiceClient = null;
  if (isDevelopment) {
    logger.info('🔄 Conexões Supabase resetadas');
  }
}

// ===================================================================
// EXPOSIÇÃO GLOBAL PARA DIAGNÓSTICO (APENAS DESENVOLVIMENTO)
// ===================================================================

if (isBrowser && isDevelopment && typeof window !== 'undefined') {
  window.supabaseManager = {
    getStatus: getConnectionStatus,
    testConnection: testSupabaseConnection,
    reset: resetConnections
  };
  
  console.log('🔧 SupabaseManager disponível em window.supabaseManager');
}

export default supabase;