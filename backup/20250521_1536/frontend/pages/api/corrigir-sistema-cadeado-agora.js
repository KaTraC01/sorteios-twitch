import { createClient } from "@supabase/supabase-js";

// Configuração do Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Cliente Supabase com a chave de serviço para acesso total
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  try {
    console.log('Iniciando correção de emergência do sistema de cadeado');
    
    // Verificar se é uma requisição válida e autorizada
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método não permitido' });
    }
    
    // Verificação de segurança (adicional)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Erro de autorização - header inválido ou ausente');
      return res.status(401).json({ error: 'Não autorizado' });
    }
    
    const token = authHeader.split(' ')[1];
    if (token !== process.env.API_SECRET_KEY) {
      console.log('Erro de autorização - token inválido');
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    // Registrar nos logs
    await supabase
      .from('logs')
      .insert([{ descricao: 'Correção de emergência do sistema de cadeado iniciada' }]);
    
    // 1. Verificar se a coluna dados_disponiveis existe
    try {
      const { data: hasColumn, error: columnError } = await supabase.rpc('adicionar_coluna_dados_disponiveis');
      if (columnError) {
        console.error('Erro ao verificar coluna:', columnError);
        
        // Solução alternativa: tentar adicionar a coluna diretamente com SQL
        await supabase.rpc('executar_sql_seguro', {
          sql: "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sorteios' AND column_name = 'dados_disponiveis') THEN ALTER TABLE sorteios ADD COLUMN dados_disponiveis BOOLEAN DEFAULT true; END IF; END $$;"
        });
        
        console.log('Tentativa alternativa de adicionar coluna executada');
      } else {
        console.log('Coluna dados_disponiveis verificada/adicionada com sucesso');
      }
    } catch (e) {
      console.error('Erro ao verificar/adicionar coluna:', e);
    }
    
    // 2. Atualizar os dados_disponiveis diretamente via SQL
    const atualizarSQL = `
      UPDATE sorteios 
      SET dados_disponiveis = (data > CURRENT_TIMESTAMP - INTERVAL '7 days')
      WHERE dados_disponiveis IS NULL OR dados_disponiveis != (data > CURRENT_TIMESTAMP - INTERVAL '7 days')
      RETURNING id;
    `;
    
    const { data: atualizados, error: erroAtualizacao } = await supabase.rpc('executar_sql_seguro', {
      sql: atualizarSQL
    });
    
    if (erroAtualizacao) {
      // Método alternativo - usar a RPC específica
      const { data: rpcResult, error: rpcError } = await supabase.rpc('atualizar_disponibilidade_sorteios_todos');
      
      if (rpcError) {
        console.error('Erro ao atualizar sorteios:', rpcError);
        return res.status(500).json({ error: 'Erro ao atualizar sorteios', details: rpcError });
      }
      
      console.log('Sorteios atualizados com sucesso via RPC');
    } else {
      console.log('Sorteios atualizados com sucesso via SQL direto');
    }
    
    // 3. Verificar o resultado da atualização
    const { data: sorteiosRecentes, error: errorConsulta } = await supabase
      .from('sorteios')
      .select('id, data, dados_disponiveis')
      .order('data', { ascending: false })
      .limit(10);
    
    // Contar sorteios que deveriam estar bloqueados (mais de 7 dias)
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 7);
    
    const sorteiosAntigos = sorteiosRecentes?.filter(
      s => new Date(s.data) < dataLimite && s.dados_disponiveis !== false
    ) || [];
    
    // Registrar o resultado nos logs
    await supabase
      .from('logs')
      .insert([{ 
        descricao: `Correção de emergência concluída. ${sorteiosAntigos.length} sorteios podem ainda estar incorretos.` 
      }]);
    
    return res.status(200).json({
      success: true,
      message: 'Sistema de cadeado corrigido com sucesso',
      sorteiosRecentes: sorteiosRecentes || [],
      sorteiosAntigos: sorteiosAntigos.length
    });

  } catch (error) {
    console.error('Erro geral na correção do sistema de cadeado:', error);
    
    // Registrar o erro nos logs
    try {
      await supabase
        .from('logs')
        .insert([{ descricao: `ERRO na correção de emergência: ${error.message}` }]);
    } catch (logError) {
      console.error('Erro ao registrar log:', logError);
    }
    
    return res.status(500).json({ error: 'Erro ao processar a solicitação', details: error.message });
  }
} 