import { supabase } from "../../lib/supabaseClient";
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  try {
    // Verificar método
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método não permitido' });
    }

    // Verificar senha de acesso (segurança)
    const { senha } = req.body;
    if (!senha || senha !== process.env.ADMIN_PASSWORD) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    // Registrar início da execução
    console.log('Iniciando atualização do trigger de limpeza de sorteios');

    // Executar a função RPC que atualiza o trigger
    const { data, error } = await supabase.rpc('atualizar_trigger_reset_participantes_ativos');
    
    if (error) {
      console.error('Erro ao atualizar o trigger:', error);
      return res.status(500).json({ 
        error: 'Erro ao atualizar o trigger', 
        details: error 
      });
    }
    
    console.log('Trigger atualizado com sucesso para incluir limpeza de sorteios antigos');

    // Executar limpeza manual para remover sorteios antigos imediatamente
    const { data: sorteiosRemovidos, error: errorLimpeza } = await supabase.rpc('limpar_sorteios_antigos');
    
    if (errorLimpeza) {
      console.error('Erro ao limpar sorteios antigos:', errorLimpeza);
      // Continue mesmo com erro na limpeza
    } else {
      console.log(`${sorteiosRemovidos || 0} sorteios antigos removidos imediatamente`);
    }

    // Retornar resposta de sucesso
    return res.status(200).json({
      success: true,
      message: 'Trigger de limpeza de sorteios atualizado com sucesso',
      sorteiosRemovidos: sorteiosRemovidos || 0
    });
  } catch (error) {
    console.error('Erro geral na atualização do trigger:', error);
    return res.status(500).json({ 
      error: 'Erro ao processar a solicitação', 
      details: error.message 
    });
  }
} 