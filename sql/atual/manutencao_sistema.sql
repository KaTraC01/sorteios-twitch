-- =============================================
-- SCRIPT CONSOLIDADO DE MANUTENÇÃO DO SISTEMA
-- =============================================
-- Este arquivo contém todas as funções e triggers necessários
-- para o funcionamento correto do sistema de sorteio.
-- Última atualização: 21/03/2025

-- =============================================
-- 1. FUNÇÕES PARA RESET DE PARTICIPANTES E HISTÓRICO
-- =============================================

-- Função principal que é acionada quando um sorteio é realizado
CREATE OR REPLACE FUNCTION reset_participantes_ativos()
RETURNS TRIGGER AS $$
DECLARE
    sorteio_id UUID;
    total_participantes INT;
BEGIN
    -- Adicionar log de execução
    INSERT INTO logs (descricao) VALUES ('Executando trigger de reset após sorteio');
    
    -- Obter o ID do sorteio recém-inserido
    sorteio_id := NEW.id;
    
    -- Salvar participantes no histórico antes de removê-los
    INSERT INTO historico_participantes (sorteio_id, nome_twitch, streamer_escolhido)
    SELECT sorteio_id, nome_twitch, streamer_escolhido
    FROM participantes_ativos;
    
    -- Obter o número de participantes salvos no histórico
    GET DIAGNOSTICS total_participantes = ROW_COUNT;
    
    -- Adicionar log com o total de participantes salvos
    INSERT INTO logs (descricao) 
    VALUES ('Salvos ' || total_participantes || ' participantes no histórico para o sorteio ID: ' || sorteio_id);
    
    -- Remover todos os participantes ativos
    DELETE FROM participantes_ativos;
    
    -- Resetar configuração de lista congelada
    UPDATE configuracoes SET valor = 'false' WHERE chave = 'lista_congelada';
    
    -- Adicionar log final
    INSERT INTO logs (descricao) VALUES ('Reset de participantes concluído com sucesso');
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de erro, registrar o erro
        INSERT INTO logs (descricao) VALUES ('ERRO no reset após sorteio: ' || SQLERRM);
        RETURN NEW; -- Não interrompe a operação, apenas registra o erro
END;
$$ LANGUAGE plpgsql;

-- Recriar o trigger
DROP TRIGGER IF EXISTS trigger_reset_participantes_ativos ON sorteios;
CREATE TRIGGER trigger_reset_participantes_ativos
AFTER INSERT ON sorteios
FOR EACH ROW
EXECUTE FUNCTION reset_participantes_ativos();

-- =============================================
-- 2. FUNÇÃO PARA REALIZAR SORTEIO AUTOMATICAMENTE
-- =============================================

-- Função que realiza o sorteio automaticamente no banco de dados
CREATE OR REPLACE FUNCTION realizar_sorteio_automatico()
RETURNS JSONB AS $$
DECLARE
    vencedor_record RECORD;
    vencedor_index INTEGER;
    total_participantes INTEGER;
    sorteio_id UUID;
    resultado JSONB;
BEGIN
    -- Verificar se a lista está congelada
    PERFORM 1 FROM configuracoes 
    WHERE chave = 'lista_congelada' AND valor = 'true';
    
    IF NOT FOUND THEN
        -- Congelar a lista para sorteio
        UPDATE configuracoes 
        SET valor = 'true', 
            atualizado_em = NOW() 
        WHERE chave = 'lista_congelada';
        
        INSERT INTO logs (descricao) 
        VALUES ('Lista congelada automaticamente para sorteio às ' || NOW());
    END IF;
    
    -- Contar participantes
    SELECT COUNT(*) INTO total_participantes FROM participantes_ativos;
    
    IF total_participantes = 0 THEN
        INSERT INTO logs (descricao) 
        VALUES ('Sorteio cancelado: Nenhum participante na lista');
        
        RETURN jsonb_build_object(
            'sucesso', false,
            'mensagem', 'Nenhum participante na lista. O sorteio foi cancelado.',
            'data', NOW()
        );
    END IF;
    
    -- Selecionar um vencedor aleatório
    vencedor_index := floor(random() * total_participantes) + 1;
    
    -- Buscar o participante vencedor
    SELECT * INTO vencedor_record 
    FROM participantes_ativos 
    LIMIT 1 OFFSET vencedor_index - 1;
    
    -- Inserir o resultado do sorteio
    INSERT INTO sorteios (data, numero, nome, streamer)
    VALUES (NOW(), vencedor_index, vencedor_record.nome_twitch, vencedor_record.streamer_escolhido)
    RETURNING id INTO sorteio_id;
    
    -- Preparar resultado
    resultado := jsonb_build_object(
        'sucesso', true,
        'sorteio_id', sorteio_id,
        'data', NOW(),
        'vencedor', jsonb_build_object(
            'nome', vencedor_record.nome_twitch,
            'streamer', vencedor_record.streamer_escolhido,
            'numero', vencedor_index
        ),
        'total_participantes', total_participantes
    );
    
    -- Log de sucesso
    INSERT INTO logs (descricao) 
    VALUES ('Sorteio realizado com sucesso. Vencedor: ' || vencedor_record.nome_twitch);
    
    RETURN resultado;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log de erro
        INSERT INTO logs (descricao) 
        VALUES ('ERRO no sorteio automático: ' || SQLERRM);
        
        RETURN jsonb_build_object(
            'sucesso', false,
            'erro', SQLERRM,
            'data', NOW()
        );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 3. VERIFICAÇÕES E MANUTENÇÃO DO SISTEMA
-- =============================================

-- Identificar sorteios sem participantes no histórico
WITH sorteios_sem_historico AS (
    SELECT s.id, s.data, s.nome, COUNT(hp.id) as num_participantes
    FROM sorteios s
    LEFT JOIN historico_participantes hp ON s.id = hp.sorteio_id
    GROUP BY s.id, s.data, s.nome
    HAVING COUNT(hp.id) = 0
    ORDER BY s.data DESC
)
SELECT * FROM sorteios_sem_historico;

-- Verificar se o trigger está ativo
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'sorteios';

-- Verificar configurações atuais
SELECT * FROM configuracoes;

-- Verificar últimos logs do sistema
SELECT * FROM logs 
ORDER BY data_hora DESC 
LIMIT 20;

-- =============================================
-- 4. INSTRUÇÕES PARA MANUTENÇÃO
-- =============================================
/*
  Para realizar um sorteio manual:
  
  SELECT realizar_sorteio_automatico();
  
  Para limpar a lista de participantes:
  
  DELETE FROM participantes_ativos;
  UPDATE configuracoes SET valor = 'false' WHERE chave = 'lista_congelada';
  
  Para congelar a lista manualmente:
  
  UPDATE configuracoes SET valor = 'true' WHERE chave = 'lista_congelada';
*/

-- Registrar execução deste script
INSERT INTO logs (descricao) 
VALUES ('Script de manutenção consolidado executado em ' || NOW()); 