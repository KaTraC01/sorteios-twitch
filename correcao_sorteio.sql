-- Script de correção para o problema de sorteios não sendo registrados no histórico

-- Recriar a função com melhor tratamento de erros
CREATE OR REPLACE FUNCTION reset_participantes_ativos()
RETURNS TRIGGER AS $$
DECLARE
    sorteio_id UUID;
    total_participantes INT;
BEGIN
    -- Registrar início da função
    INSERT INTO logs (descricao) VALUES ('Iniciando reset de participantes após sorteio');
    
    -- Obter ID do sorteio
    sorteio_id := NEW.id;
    
    -- Salvar participantes no histórico
    INSERT INTO historico_participantes (sorteio_id, nome_twitch, streamer_escolhido)
    SELECT sorteio_id, nome_twitch, streamer_escolhido
    FROM participantes_ativos;
    
    GET DIAGNOSTICS total_participantes = ROW_COUNT;
    INSERT INTO logs (descricao) VALUES ('Salvos ' || total_participantes || ' participantes no histórico');
    
    -- Limpar participantes ativos
    DELETE FROM participantes_ativos;
    INSERT INTO logs (descricao) VALUES ('Tabela de participantes ativos foi limpa');
    
    -- Resetar lista congelada
    UPDATE configuracoes SET valor = 'false' WHERE chave = 'lista_congelada';
    INSERT INTO logs (descricao) VALUES ('Lista foi descongelada');
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        INSERT INTO logs (descricao) VALUES ('ERRO no reset: ' || SQLERRM);
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar o trigger
DROP TRIGGER IF EXISTS trigger_reset_participantes_ativos ON sorteios;
CREATE TRIGGER trigger_reset_participantes_ativos
AFTER INSERT ON sorteios
FOR EACH ROW
EXECUTE FUNCTION reset_participantes_ativos();

-- Verificar status do trigger
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'sorteios';

-- Verificar sorteios sem participantes no histórico
SELECT s.id, s.data, s.nome, COALESCE(hp_count.count, 0) as participantes
FROM sorteios s
LEFT JOIN (
  SELECT sorteio_id, COUNT(*) as count 
  FROM historico_participantes 
  GROUP BY sorteio_id
) hp_count ON s.id = hp_count.sorteio_id
WHERE hp_count.count IS NULL OR hp_count.count = 0
ORDER BY s.data DESC; 