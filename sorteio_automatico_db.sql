-- SOLUÇÃO DEFINITIVA: SORTEIO AUTOMÁTICO NO BANCO DE DADOS
-- Este script configura um job PostgreSQL para executar o sorteio diariamente às 21h
-- sem depender de usuários ativos no site

-- 1. Primeiro, criar a extensão pgcron (precisa ser superusuário)
-- IMPORTANTE: Esta linha precisa ser executada por um superusuário no PostgreSQL
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Criar ou atualizar a função de realização do sorteio
CREATE OR REPLACE FUNCTION realizar_sorteio_automatico()
RETURNS jsonb AS $$
DECLARE
    sorteado_nome TEXT;
    sorteado_streamer TEXT;
    sorteio_id UUID;
    numero_sorteado INTEGER;
    resultado jsonb;
    total_participantes INTEGER;
BEGIN
    -- Criar tabela de logs se não existir
    CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        descricao TEXT,
        data_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Registrar início da execução
    INSERT INTO logs (descricao) VALUES ('Iniciando sorteio automático agendado pelo banco de dados');
    
    -- Contar participantes
    SELECT COUNT(*) INTO total_participantes FROM participantes_ativos;
    
    -- Verificar se há participantes
    IF total_participantes = 0 THEN
        resultado := jsonb_build_object(
            'realizado', false,
            'mensagem', 'Não há participantes para o sorteio'
        );
        
        INSERT INTO logs (descricao) VALUES ('Sorteio não realizado: lista de participantes vazia');
        RETURN resultado;
    END IF;
    
    -- Congelar a lista (se ainda não estiver)
    UPDATE configuracoes SET valor = 'true' WHERE chave = 'lista_congelada';
    INSERT INTO logs (descricao) VALUES ('Lista congelada para sorteio automático');
    
    -- REALIZAR O SORTEIO
    -- Selecionar vencedor aleatoriamente
    SELECT nome_twitch, streamer_escolhido 
    INTO sorteado_nome, sorteado_streamer
    FROM participantes_ativos
    ORDER BY RANDOM()
    LIMIT 1;
    
    -- Gerar número aleatório para o sorteio (1-100)
    numero_sorteado := floor(random() * 100 + 1)::integer;
    
    -- Registrar o sorteio
    INSERT INTO sorteios (nome, streamer, numero, data)
    VALUES (sorteado_nome, sorteado_streamer, numero_sorteado, CURRENT_TIMESTAMP)
    RETURNING id INTO sorteio_id;
    
    -- O trigger de reset_participantes_ativos deve executar automaticamente
    
    -- Registrar sucesso
    INSERT INTO logs (descricao) 
    VALUES ('Sorteio automático realizado com sucesso pelo job do banco! Vencedor: ' || sorteado_nome || 
            ', Streamer: ' || sorteado_streamer || 
            ', Número: ' || numero_sorteado ||
            ', Total participantes: ' || total_participantes);
    
    -- Montar resultado
    resultado := jsonb_build_object(
        'realizado', true,
        'mensagem', 'Sorteio realizado com sucesso',
        'vencedor', jsonb_build_object(
            'nome', sorteado_nome,
            'streamer', sorteado_streamer,
            'numero', numero_sorteado,
            'id', sorteio_id,
            'data', CURRENT_TIMESTAMP,
            'total_participantes', total_participantes
        )
    );
    
    RETURN resultado;
    
EXCEPTION WHEN OTHERS THEN
    -- Em caso de erro, registrar e retornar erro
    INSERT INTO logs (descricao) VALUES ('ERRO durante o sorteio automático: ' || SQLERRM);
    
    resultado := jsonb_build_object(
        'realizado', false,
        'mensagem', 'Erro durante o sorteio: ' || SQLERRM
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recriar a função de reset (para garantir)
CREATE OR REPLACE FUNCTION reset_participantes_ativos()
RETURNS TRIGGER AS $$
DECLARE
    sorteio_id UUID;
    registros_removidos INTEGER;
BEGIN
    -- Adicionar log
    INSERT INTO logs (descricao) VALUES ('Executando trigger de reset após sorteio');
    
    -- Obter o ID do sorteio recém-inserido
    sorteio_id := NEW.id;
    
    -- Salvar participantes no histórico antes de remover
    INSERT INTO historico_participantes (sorteio_id, nome_twitch, streamer_escolhido)
    SELECT sorteio_id, nome_twitch, streamer_escolhido
    FROM participantes_ativos;
    
    -- Contar quantos foram salvos
    INSERT INTO logs (descricao) 
    VALUES ('Salvos ' || (SELECT COUNT(*) FROM participantes_ativos) || ' participantes no histórico');
    
    -- Remover todos os participantes ativos
    DELETE FROM participantes_ativos;
    
    -- Resetar configuração de lista congelada
    UPDATE configuracoes SET valor = 'false' WHERE chave = 'lista_congelada';
    
    -- NOVA FUNCIONALIDADE: Limpar histórico de participantes mais antigo que 7 dias
    -- Isso mantém os registros dos sorteios (ganhadores), removendo apenas as listas detalhadas de participantes
    DELETE FROM historico_participantes 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '7 days'
    RETURNING COUNT(*) INTO registros_removidos;
    
    -- Registrar a limpeza no log
    INSERT INTO logs (descricao) 
    VALUES ('Limpeza automática: ' || registros_removidos || ' registros de participantes antigos (>7 dias) foram removidos');
    
    -- Adicionar log final
    INSERT INTO logs (descricao) VALUES ('Reset de participantes concluído com sucesso');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar o trigger
DROP TRIGGER IF EXISTS trigger_reset_participantes_ativos ON sorteios;
CREATE TRIGGER trigger_reset_participantes_ativos
AFTER INSERT ON sorteios
FOR EACH ROW
EXECUTE FUNCTION reset_participantes_ativos();

-- 4. Instruções para configurar o job usando pg_cron
/*
IMPORTANTE: Estas linhas precisam ser executadas pelo administrador do banco de dados.
Se você estiver usando Supabase, precisará contatar o suporte e solicitar que eles
configurem este job para você (planos pagos). Ou alternativamente, usar um serviço
externo como Upstash para programar a chamada da API.

-- Programar execução diária às 21h (horário do servidor)
SELECT cron.schedule('sorteio-diario', '0 21 * * *', 'SELECT realizar_sorteio_automatico()');
*/

-- 5. Testes e verificações
-- Você pode testar a função manualmente executando:
SELECT 'INSTRUÇÕES PARA CONFIGURAR O SORTEIO AUTOMÁTICO' as "Mensagem";
SELECT '
-----------------------------------------------------------------------
ATENÇÃO: PARA SUPABASE GRATUITO OU SEM ACESSO A PG_CRON
-----------------------------------------------------------------------

Como o Supabase no plano gratuito não permite configurar pg_cron, 
você tem as seguintes opções:

1. Use o componente Agendador.jsx (atual)
   - Já está funcionando e agendando o sorteio
   - Requer que pelo menos um usuário esteja com o site aberto às 21h
   - Não precisa de login, apenas que o site esteja aberto

2. Use um serviço externo gratuito (melhor opção):
   - Crie uma conta em https://cron-job.org
   - Configure um job para acessar sua API às 21h
   - URL a configurar: https://SEU-SITE/api/executar-sorteio
   
3. Crie um endpoint de API em sua aplicação:

```javascript
// pages/api/executar-sorteio.js
import { supabase } from "../../lib/supabaseClient";

export default async function handler(req, res) {
  try {
    const { data, error } = await supabase.rpc("realizar_sorteio_automatico");
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
```

Essa solução garante que o sorteio ocorre mesmo sem usuários ativos no site.
O site continuará mostrando o último vencedor e a lista será limpa conforme esperado.
' as "Solução para Supabase Gratuito";

SELECT 'Você pode testar o sorteio manualmente com o comando:' as "Teste Manual";
SELECT 'SELECT realizar_sorteio_automatico();' as "Comando para teste"; 