-- Script para corrigir os problemas relacionados ao histórico de participantes e reset da lista

-- 1. Primeiro, verificamos se existem sorteios sem histórico de participantes
WITH sorteios_sem_historico AS (
    SELECT s.id, s.data, s.nome, COUNT(hp.id) as num_participantes
    FROM sorteios s
    LEFT JOIN historico_participantes hp ON s.id = hp.sorteio_id
    GROUP BY s.id, s.data, s.nome
    ORDER BY s.data DESC
)
SELECT * FROM sorteios_sem_historico;

-- 2. Recriar a função que é acionada quando um sorteio é inserido
CREATE OR REPLACE FUNCTION reset_participantes_ativos()
RETURNS TRIGGER AS $$
DECLARE
    sorteio_id UUID;
    total_participantes INT;
BEGIN
    -- Adicionar log
    INSERT INTO logs (descricao) VALUES ('Executando trigger de reset após sorteio');
    
    -- Obter o ID do sorteio recém-inserido
    sorteio_id := NEW.id;
    
    -- Salvar participantes no histórico antes de remover
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

-- 3. Recriar o trigger
DROP TRIGGER IF EXISTS trigger_reset_participantes_ativos ON sorteios;
CREATE TRIGGER trigger_reset_participantes_ativos
AFTER INSERT ON sorteios
FOR EACH ROW
EXECUTE FUNCTION reset_participantes_ativos();

-- 4. Verificar se o trigger foi criado corretamente
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'sorteios';

-- 5. Verificar os logs para entender melhor os problemas de execução
SELECT * FROM logs ORDER BY data_hora DESC LIMIT 20;

-- 6. Inserir um log para indicar que o script de correção foi executado
INSERT INTO logs (descricao) VALUES ('Script de correção do histórico e reset de participantes executado em ' || NOW()); 