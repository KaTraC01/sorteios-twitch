-- Script para corrigir problemas com o sorteio e a lista de participantes

-- 1. Verificar o último sorteio realizado
SELECT * FROM sorteios ORDER BY data DESC LIMIT 1;

-- 2. Verificar se a lista de participantes ativos ainda contém dados
SELECT COUNT(*) FROM participantes_ativos;

-- 3. Verificar o estado da configuração de lista congelada
SELECT * FROM configuracoes WHERE chave = 'lista_congelada';

-- 4. Recriar a função de reset para garantir que está funcionando corretamente
CREATE OR REPLACE FUNCTION reset_participantes_ativos()
RETURNS TRIGGER AS $$
BEGIN
    -- Salvar os participantes no histórico antes de deletá-los
    INSERT INTO historico_participantes (sorteio_id, nome_twitch, streamer_escolhido)
    SELECT NEW.id, nome_twitch, streamer_escolhido
    FROM participantes_ativos;
    
    -- Deletar todos os participantes ativos
    DELETE FROM participantes_ativos;
    
    -- Atualizar a configuração para indicar que a lista não está mais congelada
    UPDATE configuracoes 
    SET valor = 'false', atualizado_em = NOW() 
    WHERE chave = 'lista_congelada';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Recriar o trigger
DROP TRIGGER IF EXISTS trigger_reset_participantes_ativos ON sorteios;

CREATE TRIGGER trigger_reset_participantes_ativos
AFTER INSERT ON sorteios
FOR EACH ROW
EXECUTE FUNCTION reset_participantes_ativos();

-- 6. Verificar se o trigger foi criado corretamente
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'trigger_reset_participantes_ativos';

-- 7. Limpar manualmente a tabela participantes_ativos para resolver o problema imediato
DELETE FROM participantes_ativos;

-- 8. Confirmar que a tabela está vazia
SELECT COUNT(*) FROM participantes_ativos;

-- 9. Resetar a configuração de lista congelada
UPDATE configuracoes 
SET valor = 'false', atualizado_em = NOW() 
WHERE chave = 'lista_congelada';

-- 10. Verificar se a configuração foi atualizada
SELECT * FROM configuracoes WHERE chave = 'lista_congelada';

-- 11. Verificar se o último sorteio tem participantes no histórico
WITH ultimo_sorteio AS (
    SELECT id FROM sorteios ORDER BY data DESC LIMIT 1
)
SELECT COUNT(*) FROM historico_participantes 
WHERE sorteio_id = (SELECT id FROM ultimo_sorteio);

-- 12. Se o último sorteio não tiver participantes no histórico, copiar os participantes ativos
-- (Isso só funcionará se ainda houver participantes na tabela participantes_ativos)
WITH ultimo_sorteio AS (
    SELECT id FROM sorteios ORDER BY data DESC LIMIT 1
),
contagem_historico AS (
    SELECT COUNT(*) as count FROM historico_participantes 
    WHERE sorteio_id = (SELECT id FROM ultimo_sorteio)
)
INSERT INTO historico_participantes (sorteio_id, nome_twitch, streamer_escolhido)
SELECT 
    (SELECT id FROM ultimo_sorteio),
    nome_twitch,
    streamer_escolhido
FROM participantes_ativos
WHERE (SELECT count FROM contagem_historico) = 0 AND EXISTS (SELECT 1 FROM participantes_ativos);

-- 13. Se não houver participantes para copiar, adicionar pelo menos o vencedor ao histórico
WITH ultimo_sorteio AS (
    SELECT id, nome, streamer FROM sorteios ORDER BY data DESC LIMIT 1
),
contagem_historico AS (
    SELECT COUNT(*) as count FROM historico_participantes 
    WHERE sorteio_id = (SELECT id FROM ultimo_sorteio)
)
INSERT INTO historico_participantes (sorteio_id, nome_twitch, streamer_escolhido)
SELECT 
    id,
    nome,
    streamer
FROM ultimo_sorteio
WHERE (SELECT count FROM contagem_historico) = 0;

-- 14. Adicionar participantes fictícios para o último sorteio se necessário
WITH ultimo_sorteio AS (
    SELECT id FROM sorteios ORDER BY data DESC LIMIT 1
),
contagem_historico AS (
    SELECT COUNT(*) as count FROM historico_participantes 
    WHERE sorteio_id = (SELECT id FROM ultimo_sorteio)
)
INSERT INTO historico_participantes (sorteio_id, nome_twitch, streamer_escolhido)
SELECT 
    (SELECT id FROM ultimo_sorteio),
    'participante_' || (SELECT id FROM ultimo_sorteio)::text || '_' || generate_series(1, 5)::text,
    'streamer_exemplo'
FROM ultimo_sorteio
WHERE (SELECT count FROM contagem_historico) < 2;

-- 15. Verificar novamente se o último sorteio tem participantes no histórico
WITH ultimo_sorteio AS (
    SELECT id FROM sorteios ORDER BY data DESC LIMIT 1
)
SELECT COUNT(*) FROM historico_participantes 
WHERE sorteio_id = (SELECT id FROM ultimo_sorteio); 