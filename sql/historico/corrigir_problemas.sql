-- SCRIPT PARA CORREÇÃO DE PROBLEMAS
-- ----------------------------------

-- 1. Verificar o último sorteio realizado para diagnóstico
SELECT * FROM sorteios ORDER BY data DESC LIMIT 5;

-- 2. Verificar se existe algum problema de visibilidade dos sorteios
-- Adicionar qualquer sorteio que não esteja aparecendo na tela de ganhadores
INSERT INTO sorteios (ganhador, streamer, numero_sorteado, data)
SELECT 'KA', 'bron', 5, '2023-03-13'
WHERE NOT EXISTS (
    SELECT 1 FROM sorteios 
    WHERE ganhador = 'KA' AND streamer = 'bron' AND numero_sorteado = 5 AND data = '2023-03-13'
);

-- 3. Verificar participantes na lista atual que podem estar causando problemas
SELECT * FROM participantes_ativos;

-- 4. Remover entradas problemáticas na tabela de participantes ativos
DELETE FROM participantes_ativos 
WHERE nome_twitch = '13/03/2025' OR streamer_escolhido = '13/03/2025';

-- 5. Verificar configuração atual
SELECT * FROM configuracoes WHERE chave = 'lista_congelada';

-- 6. Garantir que a lista não está congelada (a menos que seja hora do sorteio)
UPDATE configuracoes SET valor = 'false' WHERE chave = 'lista_congelada'; 