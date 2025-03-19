-- Script para testar manualmente o registro de um sorteio
-- Execute este script no SQL Editor do Supabase para simular um sorteio

-- 1. Verificar estado atual (lista congelada e participantes)
SELECT * FROM configuracoes WHERE chave = 'lista_congelada';
SELECT COUNT(*) as total_participantes FROM participantes_ativos;

-- 2. Inserir um sorteio de teste
INSERT INTO sorteios (data, numero, nome, streamer)
VALUES (NOW(), 999, 'TESTE_MANUAL', 'SORTEIO_TESTE')
RETURNING *;

-- 3. Verificar se o trigger funcionou corretamente
-- O trigger deve ter:
-- 1. Movido os participantes para histórico
-- 2. Limpo a tabela participantes_ativos
-- 3. Resetado a configuração lista_congelada para false

-- Verificar participantes
SELECT COUNT(*) as total_participantes FROM participantes_ativos;

-- Verificar histórico
SELECT * FROM historico_participantes
WHERE sorteio_id = (SELECT id FROM sorteios ORDER BY data DESC LIMIT 1);

-- Verificar configuração
SELECT * FROM configuracoes WHERE chave = 'lista_congelada'; 