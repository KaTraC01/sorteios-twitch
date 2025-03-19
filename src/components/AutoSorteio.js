'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';

/**
 * Componente invisível que verifica periodicamente se é hora do sorteio
 * e realiza o sorteio automaticamente quando necessário.
 * 
 * Uso: Adicione este componente no layout principal da aplicação.
 */
export default function AutoSorteio() {
  const [lastCheck, setLastCheck] = useState(null);
  const [status, setStatus] = useState('inicializando');

  // Função para verificar se é hora do sorteio
  const verificarSorteio = async () => {
    try {
      setStatus('verificando');
      
      // Chamar a função do Supabase para verificar e realizar o sorteio
      const { data, error } = await supabase.rpc('verificar_e_realizar_sorteio');
      
      if (error) {
        console.error('Erro ao verificar sorteio:', error);
        setStatus(`erro: ${error.message}`);
        return;
      }

      // Atualizar o status baseado no resultado
      if (data.realizado) {
        setStatus(`Sorteio realizado! Vencedor: ${data.vencedor}`);
        
        // Recarregar a página para mostrar o novo vencedor
        window.location.reload();
      } else {
        setStatus(`Verificação: ${data.mensagem}`);
      }

      // Atualizar o timestamp da última verificação
      setLastCheck(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Erro ao executar verificação:', error);
      setStatus(`erro de execução: ${error.message}`);
    }
  };

  // Executar a verificação quando o componente for montado e a cada 5 minutos
  useEffect(() => {
    // Verificar imediatamente ao carregar
    verificarSorteio();
    
    // Configurar verificação a cada 5 minutos
    const intervalId = setInterval(verificarSorteio, 5 * 60 * 1000);
    
    // Limpar o intervalo quando o componente for desmontado
    return () => clearInterval(intervalId);
  }, []);

  // Este componente não renderiza nada visível
  return null;
} 