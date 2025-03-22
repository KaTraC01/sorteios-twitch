-- CORREÇÃO DO TRIGGER DE RESET DOS PARTICIPANTES
-- Este script apenas corrige o trigger que limpa a lista após o sorteio

-- Recriar a função de reset
CREATE OR REPLACE FUNCTION reset_participantes_ativos()
RETURNS TRIGGER AS $$
DECLARE
    sorteio_id UUID;
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

-- Verificar se o trigger foi criado corretamente
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'sorteios'; 