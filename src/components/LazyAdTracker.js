/**
 * Wrapper para Lazy Loading do AdTracker
 * 
 * ✅ GARANTE: Sistema de métricas 100% preservado
 * ✅ MELHORIA: Carrega AdTracker apenas quando necessário para anúncios não críticos
 * ✅ SEGURANÇA: Fallback imediato para não perder métricas
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';

// ✅ CRÍTICO: Lazy loading apenas para anúncios não críticos
// Anúncios principais mantêm carregamento imediato
const AdTracker = lazy(() => import('./AdTracker'));

const LazyAdTracker = ({ 
  children, 
  anuncioId, 
  tipoAnuncio, 
  paginaId, 
  preservarLayout = true,
  priority = false // Se true, carrega imediatamente
}) => {
  const [shouldLoadTracker, setShouldLoadTracker] = useState(false);
  const [isIntersecting, setIsIntersecting] = useState(false);

  // ✅ PRESERVA: Anúncios prioritários carregam imediatamente
  useEffect(() => {
    if (priority || 
        tipoAnuncio === 'fixo-superior' || 
        tipoAnuncio === 'fixo-inferior' || 
        tipoAnuncio === 'tela-inteira') {
      setShouldLoadTracker(true);
      return;
    }

    // Para anúncios não críticos, usar Intersection Observer
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          setShouldLoadTracker(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '100px', // Carregar quando estiver próximo da visualização
        threshold: 0.1
      }
    );

    // Observar o próprio componente
    const element = document.getElementById(`lazy-tracker-${anuncioId}`);
    if (element) {
      observer.observe(element);
    }

    // Timeout de segurança - garantir que sempre carregue
    const safetyTimeout = setTimeout(() => {
      if (!shouldLoadTracker) {
        console.log(`%c[LazyAdTracker] Timeout de segurança: carregando ${tipoAnuncio} (${anuncioId})`, 'color: #FF9800');
        setShouldLoadTracker(true);
      }
    }, 3000); // 3 segundos

    return () => {
      observer.disconnect();
      clearTimeout(safetyTimeout);
    };
  }, [priority, tipoAnuncio, anuncioId, shouldLoadTracker]);

  // ✅ PRESERVA: Se deve carregar imediatamente, usar AdTracker normal
  if (shouldLoadTracker) {
    return (
      <Suspense fallback={
        <div 
          id={`lazy-tracker-${anuncioId}`}
          style={{ 
            minHeight: preservarLayout ? '100px' : 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(100, 65, 165, 0.1)',
            borderRadius: '8px',
            margin: '10px 0'
          }}
        >
          {children}
        </div>
      }>
        <AdTracker
          anuncioId={anuncioId}
          tipoAnuncio={tipoAnuncio}
          paginaId={paginaId}
          preservarLayout={preservarLayout}
        >
          {children}
        </AdTracker>
      </Suspense>
    );
  }

  // ✅ OTIMIZAÇÃO: Renderizar placeholder até estar visível
  return (
    <div 
      id={`lazy-tracker-${anuncioId}`}
      style={{ 
        minHeight: preservarLayout ? '100px' : 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(100, 65, 165, 0.05)',
        borderRadius: '8px',
        margin: '10px 0',
        border: '1px dashed rgba(100, 65, 165, 0.3)'
      }}
    >
      {children}
    </div>
  );
};

export default LazyAdTracker;
