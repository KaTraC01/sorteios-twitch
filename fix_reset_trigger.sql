-- Script para corrigir o trigger de reset da tabela participantes_ativos

-- 1. Verificar se o trigger existe
SELECT EXISTS (
    SELECT 1 
    FROM pg_trigger 
    WHERE tgname = 'trigger_reset_participantes_ativos'
) AS trigger_exists;

-- 2. Recriar a função de reset para garantir que está funcionando corretamente
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

-- 3. Recriar o trigger
DROP TRIGGER IF EXISTS trigger_reset_participantes_ativos ON sorteios;

CREATE TRIGGER trigger_reset_participantes_ativos
AFTER INSERT ON sorteios
FOR EACH ROW
EXECUTE FUNCTION reset_participantes_ativos();

-- 4. Verificar se o trigger foi criado corretamente
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'trigger_reset_participantes_ativos';

-- 5. Limpar manualmente a tabela participantes_ativos para resolver o problema imediato
DELETE FROM participantes_ativos;

-- 6. Confirmar que a tabela está vazia
SELECT COUNT(*) FROM participantes_ativos; 