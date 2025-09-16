/**
 * HOOK CONSOLIDADO DE REALTIME - OTIMIZAÇÃO DE PERFORMANCE
 * ======================================================
 * 
 * Unifica todos os channels realtime em um único canal para reduzir overhead
 * Especialmente benéfico para dispositivos antigos e conexões lentas
 * 
 * @author Sistema de Otimização v3.0
 * @date 2025-01-16
 */

import { useEffect, useRef, useCallback } from 'react';
import { getSupabaseClient } from '../lib/supabaseManager';

const supabase = getSupabaseClient();

export function useConsolidatedRealtime({
  onParticipantesChange,
  onSorteioInsert,
  onConfiguracoesUpdate,
  enabled = true
}) {
  const channelRef = useRef(null);
  const sessionId = useRef(Math.random().toString(36).substring(2, 15));

  /**
   * Configurar canal consolidado único
   */
  const setupConsolidatedChannel = useCallback(() => {
    // Limpar canal anterior se existir
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    if (!enabled) return;

    console.log('🔗 Configurando canal realtime consolidado...');

    // Criar canal único que monitora todas as tabelas necessárias
    const channel = supabase
      .channel(`consolidated-realtime-${sessionId.current}`)
      
      // 1. Monitorar participantes_ativos (para paginação e lista)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'participantes_ativos' }, 
        (payload) => {
          console.log('🔄 [CONSOLIDADO] Mudança em participantes_ativos:', payload.eventType);
          if (onParticipantesChange) {
            onParticipantesChange(payload);
          }
        }
      )
      
      // 2. Monitorar sorteios (para novo vencedor)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'sorteios' }, 
        (payload) => {
          console.log('🎉 [CONSOLIDADO] Novo sorteio inserido:', payload.new);
          if (onSorteioInsert) {
            onSorteioInsert(payload);
          }
        }
      )
      
      // 3. Monitorar configurações (para lista congelada, etc.)
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'configuracoes' }, 
        (payload) => {
          console.log('⚙️ [CONSOLIDADO] Configuração atualizada:', payload.new);
          if (onConfiguracoesUpdate) {
            onConfiguracoesUpdate(payload);
          }
        }
      )
      
      .subscribe((status) => {
        console.log('📡 [CONSOLIDADO] Status do canal:', status);
      });

    channelRef.current = channel;
    console.log('✅ Canal realtime consolidado configurado com sucesso');
    
  }, [enabled, onParticipantesChange, onSorteioInsert, onConfiguracoesUpdate]);

  /**
   * Limpar canal
   */
  const cleanup = useCallback(() => {
    if (channelRef.current) {
      console.log('🧹 Limpando canal realtime consolidado...');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  /**
   * Reconfigurar canal (útil para reconexão)
   */
  const reconnect = useCallback(() => {
    console.log('🔄 Reconectando canal realtime consolidado...');
    cleanup();
    setupConsolidatedChannel();
  }, [cleanup, setupConsolidatedChannel]);

  // Configurar na montagem e limpar na desmontagem
  useEffect(() => {
    setupConsolidatedChannel();
    return cleanup;
  }, [setupConsolidatedChannel, cleanup]);

  // Reconfigurar quando enabled muda
  useEffect(() => {
    if (enabled) {
      setupConsolidatedChannel();
    } else {
      cleanup();
    }
  }, [enabled, setupConsolidatedChannel, cleanup]);

  return {
    reconnect,
    cleanup,
    isConnected: channelRef.current !== null,
    sessionId: sessionId.current
  };
}

/**
 * Hook simplificado para casos básicos
 */
export function useBasicRealtime(callbacks, enabled = true) {
  return useConsolidatedRealtime({
    ...callbacks,
    enabled
  });
}

export default useConsolidatedRealtime;
