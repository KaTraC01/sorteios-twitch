-- Script para simular um sorteio com os participantes existentes
-- Este script não adiciona novos participantes, apenas usa os que já existem

-- 1. Verificar participantes atuais
SELECT 'Participantes atuais na lista' as info;
SELECT * FROM participantes_ativos;
SELECT COUNT(*) as total_participantes FROM participantes_ativos;

-- 2. Simular o congelamento da lista (20:50)
SELECT 'Simulando o congelamento da lista' as info;
UPDATE configuracoes 
SET valor = 'true', atualizado_em = NOW() 
WHERE chave = 'lista_congelada';

-- 3. Simular o sorteio (21:00)
SELECT 'Realizando o sorteio' as info;

-- Selecionar um vencedor aleatório
DO $$
DECLARE
    vencedor_record RECORD;
    vencedor_index INTEGER;
    total_participantes INTEGER;
    sorteio_id INTEGER;
BEGIN
    -- Contar participantes
    SELECT COUNT(*) INTO total_participantes FROM participantes_ativos;
    
    IF total_participantes = 0 THEN
        RAISE NOTICE 'Nenhum participante na lista. O sorteio foi cancelado.';
        RETURN;
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
    
    RAISE NOTICE 'Sorteio realizado com sucesso. Vencedor: %', vencedor_record.nome_twitch;
    
    -- O trigger deve executar automaticamente e:
    -- 1. Salvar os participantes no histórico
    -- 2. Limpar a tabela participantes_ativos
    -- 3. Resetar a configuração lista_congelada
END $$;

-- 4. Verificar o resultado do sorteio
SELECT 'Resultado do sorteio' as info;
SELECT * FROM sorteios ORDER BY data DESC LIMIT 1;

-- 5. Verificar se os participantes foram salvos no histórico
SELECT 'Participantes salvos no histórico' as info;
WITH ultimo_sorteio AS (
    SELECT id FROM sorteios ORDER BY data DESC LIMIT 1
)
SELECT * FROM historico_participantes 
WHERE sorteio_id = (SELECT id FROM ultimo_sorteio);

-- 6. Verificar se a tabela de participantes ativos foi limpa
SELECT 'Verificando se a lista foi resetada' as info;
SELECT COUNT(*) as participantes_restantes FROM participantes_ativos;

-- 7. Verificar se a configuração de lista congelada foi resetada
SELECT 'Verificando se a lista foi descongelada' as info;
SELECT * FROM configuracoes WHERE chave = 'lista_congelada'; 