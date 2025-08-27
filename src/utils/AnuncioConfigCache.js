/**
 * Cache Inteligente para Configuração de Anúncios
 * 
 * ✅ GARANTE: Sistema de métricas permanece 100% intacto
 * ✅ MELHORIA: Reduz requisições ao config.json de múltiplas para uma única
 * ✅ SEGURANÇA: Cache automático com invalidação inteligente
 */

class AnuncioConfigCache {
  static cache = null;
  static lastFetch = 0;
  static isLoading = false;
  static CACHE_DURATION = 5 * 60 * 1000; // 5 minutos - cache curto para atualizações rápidas
  static pendingRequests = []; // Fila para requisições simultâneas

  /**
   * Busca a configuração de anúncios com cache inteligente
   * @returns {Promise<Object>} Configuração dos anúncios
   */
  static async getConfig() {
    const now = Date.now();
    
    // Se o cache está válido, retorna imediatamente
    if (this.cache && (now - this.lastFetch < this.CACHE_DURATION)) {
      console.log('%c[AnuncioCache] ✅ Cache HIT - Usando dados em cache', 'color: #4CAF50');
      return this.cache;
    }
    
    // Se já está carregando, adicionar à fila de espera
    if (this.isLoading) {
      console.log('%c[AnuncioCache] ⏳ Aguardando carregamento em andamento...', 'color: #FF9800');
      return new Promise((resolve, reject) => {
        this.pendingRequests.push({ resolve, reject });
      });
    }
    
    // Iniciar carregamento
    this.isLoading = true;
    console.log('%c[AnuncioCache] 📡 Cache MISS - Buscando nova configuração', 'color: #2196F3');
    
    try {
      const response = await fetch('/anuncios/config.json', {
        // Headers para otimização sem afetar funcionalidade
        headers: {
          'Cache-Control': 'no-cache', // Sempre buscar versão mais recente
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Validar estrutura dos dados para garantir compatibilidade
      if (!data || typeof data !== 'object') {
        throw new Error('Configuração de anúncios inválida');
      }
      
      // Atualizar cache
      this.cache = data;
      this.lastFetch = now;
      
      console.log('%c[AnuncioCache] ✅ Configuração carregada e cacheada com sucesso', 'color: #4CAF50');
      
      // Resolver todas as requisições pendentes
      this.pendingRequests.forEach(({ resolve }) => resolve(data));
      this.pendingRequests = [];
      
      return data;
      
    } catch (error) {
      console.error('%c[AnuncioCache] ❌ Erro ao carregar configuração:', 'color: #F44336', error);
      
      // Rejeitar todas as requisições pendentes
      this.pendingRequests.forEach(({ reject }) => reject(error));
      this.pendingRequests = [];
      
      // Se há cache antigo, usar como fallback (melhor que falhar)
      if (this.cache) {
        console.log('%c[AnuncioCache] 🔄 Usando cache antigo como fallback', 'color: #FF9800');
        return this.cache;
      }
      
      throw error;
    } finally {
      this.isLoading = false;
    }
  }
  
  /**
   * Força a invalidação do cache
   * Útil para atualizações administrativas
   */
  static invalidateCache() {
    console.log('%c[AnuncioCache] 🔄 Cache invalidado manualmente', 'color: #9C27B0');
    this.cache = null;
    this.lastFetch = 0;
  }
  
  /**
   * Verifica se o cache está válido
   * @returns {boolean}
   */
  static isCacheValid() {
    if (!this.cache) return false;
    const now = Date.now();
    return (now - this.lastFetch < this.CACHE_DURATION);
  }
  
  /**
   * Busca anúncios de um tipo específico com cache
   * @param {string} tipo - Tipo do anúncio (lateral, banner, etc.)
   * @returns {Promise<Array>} Lista de anúncios do tipo especificado
   */
  static async getAnunciosByTipo(tipo) {
    try {
      const config = await this.getConfig();
      const anuncios = config[tipo] || [];
      
      // Filtrar apenas anúncios ativos
      const anunciosAtivos = anuncios.filter(anuncio => anuncio.ativo === true);
      
      console.log(`%c[AnuncioCache] 📋 Retornando ${anunciosAtivos.length} anúncios ativos do tipo "${tipo}"`, 'color: #673AB7');
      
      return anunciosAtivos;
    } catch (error) {
      console.error(`%c[AnuncioCache] ❌ Erro ao buscar anúncios do tipo "${tipo}":`, 'color: #F44336', error);
      return []; // Retorna array vazio em caso de erro
    }
  }
  
  /**
   * Pré-carrega a configuração em background
   * Útil para inicialização da aplicação
   */
  static async preload() {
    try {
      console.log('%c[AnuncioCache] 🚀 Pré-carregando configuração de anúncios...', 'color: #3F51B5');
      await this.getConfig();
    } catch (error) {
      console.warn('%c[AnuncioCache] ⚠️ Falha no pré-carregamento:', 'color: #FF9800', error);
    }
  }
  
  /**
   * Estatísticas do cache para debugging
   * @returns {Object}
   */
  static getStats() {
    return {
      temCache: !!this.cache,
      ultimoCarregamento: this.lastFetch ? new Date(this.lastFetch).toISOString() : 'Nunca',
      cacheValido: this.isCacheValid(),
      requisicoesPendentes: this.pendingRequests.length,
      carregando: this.isLoading
    };
  }
}

// Pré-carregar configuração quando o módulo for importado
if (typeof window !== 'undefined') {
  // Delay pequeno para não bloquear o carregamento inicial
  setTimeout(() => {
    AnuncioConfigCache.preload();
  }, 100);
  
  // Expor no console para debugging em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    window.AnuncioConfigCache = AnuncioConfigCache;
    console.log('%c[AnuncioCache] 🔧 Cache disponível no console: window.AnuncioConfigCache', 'color: #9C27B0');
  }
}

export default AnuncioConfigCache;
