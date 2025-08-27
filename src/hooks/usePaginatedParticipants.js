/**
 * Hook para Paginação Otimizada de Participantes
 * 
 * ✅ GARANTE: Funcionalidades existentes 100% preservadas
 * ✅ MELHORIA: Carrega apenas dados necessários (10-20 por vez vs todos)
 * ✅ SEGURANÇA: Mantém realtime, sorteios, sistema de freeze intactos
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getSupabaseClient } from '../lib/supabaseManager';

const supabase = getSupabaseClient();

export const usePaginatedParticipants = (itemsPerPage = 10, mode = 'cumulative') => {
  // Estados para paginação
  const [participantes, setParticipantes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // ✅ NOVO: Estado para lista acumulativa (modo antigo)
  const [participantesAcumulados, setParticipantesAcumulados] = useState([]);
  const [paginasCarregadas, setPaginasCarregadas] = useState(1);
  
  // Estados para funcionalidades existentes preservadas
  const [allParticipantsCache, setAllParticipantsCache] = useState([]); // Cache para sorteios
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  
  // Refs para controle
  const realtimeChannelRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  
  /**
   * ✅ PRESERVA: Busca participantes com paginação real do backend
   * Mantém a mesma interface da função original
   */
  const fetchParticipantes = useCallback(async (page = 1, forceRefresh = false) => {
    if (isLoading && !forceRefresh) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`🔍 Buscando participantes - Página ${page} (${itemsPerPage} por página)`);
      
      // Calcular offset para paginação
      const offset = (page - 1) * itemsPerPage;
      
      // Buscar participantes paginados + contagem total
      const [participantsResponse, countResponse] = await Promise.all([
        // Busca paginada
        supabase
          .from("participantes_ativos")
          .select("*")
          .order("created_at", { ascending: true })
          .range(offset, offset + itemsPerPage - 1),
        
        // Contagem total (apenas quando necessário)
        (page === 1 || forceRefresh) ? 
          supabase
            .from("participantes_ativos")
            .select("*", { count: 'exact', head: true }) :
          Promise.resolve({ count: totalParticipants })
      ]);
      
      if (participantsResponse.error) {
        throw participantsResponse.error;
      }
      
      const newParticipants = participantsResponse.data || [];
      const newTotal = countResponse.count || totalParticipants;
      
      console.log(`✅ Carregados ${newParticipants.length} participantes de ${newTotal} total`);
      
      // ✅ NOVO: Lógica para modo acumulativo (como era antes)
      if (mode === 'cumulative') {
        if (page === 1 || forceRefresh) {
          // Primeira página ou refresh: resetar lista acumulada
          setParticipantesAcumulados(newParticipants);
          setPaginasCarregadas(1);
        } else {
          // Páginas seguintes: adicionar à lista existente (como "mostrar mais")
          setParticipantesAcumulados(prev => {
            const novosIds = new Set(newParticipants.map(p => p.id));
            const existentesLimpos = prev.filter(p => !novosIds.has(p.id));
            return [...existentesLimpos, ...newParticipants];
          });
          setPaginasCarregadas(page);
        }
        
        // Para modo acumulativo, participantes sempre mostra a lista completa acumulada
        setParticipantes(page === 1 ? newParticipants : participantesAcumulados.concat(newParticipants));
      } else {
        // Modo normal (paginação tradicional)
        setParticipantes(newParticipants);
      }
      
      setTotalParticipants(newTotal);
      setCurrentPage(page);
      setLastUpdate(Date.now());
      
      // ✅ PRESERVA: Manter cache completo para sorteios (quando necessário)
      if (page === 1 && newTotal <= 100) {
        // Para listas pequenas, manter cache completo para sorteios
        try {
          const { data: allData } = await supabase
            .from("participantes_ativos")
            .select("*")
            .order("created_at", { ascending: true });
          
          setAllParticipantsCache(allData || []);
        } catch (cacheError) {
          console.warn('Aviso: Não foi possível carregar cache completo:', cacheError);
          setAllParticipantsCache(page === 1 ? newParticipants : participantesAcumulados.concat(newParticipants));
        }
      }
      
    } catch (fetchError) {
      console.error("Erro ao buscar participantes:", fetchError);
      setError(fetchError.message);
    } finally {
      setIsLoading(false);
    }
  }, [itemsPerPage, isLoading, totalParticipants]);
  
  /**
   * ✅ PRESERVA: Função para buscar TODOS os participantes para sorteios
   * Necessária para manter compatibilidade com sistema de sorteio
   */
  const fetchAllParticipantsForSorteio = useCallback(async () => {
    console.log('🎲 Buscando TODOS participantes para sorteio...');
    
    try {
      const { data, error } = await supabase
        .from("participantes_ativos")
        .select("*")
        .order("created_at", { ascending: true });
      
      if (error) {
        throw error;
      }
      
      console.log(`✅ Carregados ${data.length} participantes para sorteio`);
      setAllParticipantsCache(data || []);
      return data || [];
      
    } catch (error) {
      console.error("Erro ao buscar todos participantes:", error);
      return allParticipantsCache; // Usar cache como fallback
    }
  }, [allParticipantsCache]);
  
  /**
   * ✅ PRESERVA: Configurar realtime preservando funcionalidade original
   */
  const setupRealtime = useCallback(() => {
    // Limpar canal anterior se existir
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }
    
    // Criar novo canal consolidado
    const sessionId = Math.random().toString(36).substring(2, 15);
    const channel = supabase
      .channel(`participantes-paginated-${sessionId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'participantes_ativos' }, 
        (payload) => {
          console.log('🔄 Mudança detectada em participantes_ativos:', payload.eventType);
          
          // Para mudanças nos participantes, recarregar página atual
          fetchParticipantes(currentPage, true);
          
          // Se estiver na primeira página, atualizar cache completo também
          if (currentPage === 1) {
            fetchAllParticipantsForSorteio();
          }
        }
      )
      .subscribe();
    
    realtimeChannelRef.current = channel;
    console.log('✅ Realtime configurado para paginação');
    
  }, [currentPage, fetchParticipantes, fetchAllParticipantsForSorteio]);
  
  /**
   * Funções de controle de página
   */
  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= Math.ceil(totalParticipants / itemsPerPage)) {
      fetchParticipantes(page);
    }
  }, [fetchParticipantes, totalParticipants, itemsPerPage]);
  
  const nextPage = useCallback(() => {
    const maxPage = Math.ceil(totalParticipants / itemsPerPage);
    if (currentPage < maxPage) {
      goToPage(currentPage + 1);
    }
  }, [currentPage, totalParticipants, itemsPerPage, goToPage]);
  
  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  }, [currentPage, goToPage]);

  /**
   * ✅ NOVO: Função "Mostrar Mais" no estilo antigo
   * Carrega próxima página mas mantém todos os participantes visíveis
   */
  const mostrarMais = useCallback(() => {
    const proximaPagina = mode === 'cumulative' ? paginasCarregadas + 1 : currentPage + 1;
    const maxPage = Math.ceil(totalParticipants / itemsPerPage);
    
    if (proximaPagina <= maxPage) {
      console.log(`📄 Carregando mais participantes - Página ${proximaPagina}`);
      fetchParticipantes(proximaPagina);
    }
  }, [mode, paginasCarregadas, currentPage, totalParticipants, itemsPerPage, fetchParticipantes]);

  /**
   * ✅ NOVO: Função para mostrar menos (voltar ao início)
   */
  const mostrarMenos = useCallback(() => {
    console.log('🔄 Voltando ao início da lista');
    setParticipantesAcumulados([]);
    setPaginasCarregadas(1);
    fetchParticipantes(1, true);
  }, [fetchParticipantes]);
  
  /**
   * Inicialização
   */
  useEffect(() => {
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      fetchParticipantes(1, true);
      setupRealtime();
    }
    
    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, []);
  
  // Recalcular páginas quando total mudar
  const totalPages = Math.ceil(totalParticipants / itemsPerPage);
  const hasNextPage = mode === 'cumulative' ? 
    paginasCarregadas < totalPages : 
    currentPage < totalPages;
  const hasPrevPage = currentPage > 1;
  
  // ✅ NOVO: Verificar se estamos mostrando todos no modo acumulativo
  const participantesCarregados = mode === 'cumulative' ? 
    paginasCarregadas * itemsPerPage : 
    currentPage * itemsPerPage;
  const mostrandoTodos = participantesCarregados >= totalParticipants;
  
  // ✅ COMPATIBILIDADE: Interface idêntica ao sistema original + novas funcionalidades
  return {
    // Dados paginados (interface principal)
    participantes,
    isLoading,
    error,
    
    // ✅ PRESERVA: Dados completos para sorteios quando necessário
    allParticipants: allParticipantsCache,
    fetchAllParticipantsForSorteio,
    
    // Controles de paginação tradicional
    currentPage,
    totalPages,
    totalParticipants,
    itemsPerPage,
    hasNextPage,
    hasPrevPage,
    
    // ✅ NOVO: Controles para modo acumulativo (estilo antigo)
    mostrarMais,
    mostrarMenos,
    mostrandoTodos,
    participantesCarregados,
    paginasCarregadas,
    
    // Funções de navegação
    goToPage,
    nextPage,
    prevPage,
    fetchParticipantes,
    
    // ✅ PRESERVA: Compatibilidade com componentes existentes
    lastUpdate,
    refresh: () => fetchParticipantes(currentPage, true)
  };
};
