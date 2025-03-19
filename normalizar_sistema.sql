-- Script para normalizar o sistema após testes
-- 1. Verificar e atualizar o estado da configuração
UPDATE configuracoes
SET valor = 'false'
WHERE chave = 'lista_congelada';

-- 2. Verificar se há participantes ativos (não deve haver após o sorteio)
SELECT COUNT(*) as total_participantes
FROM participantes_ativos;

-- 3. Verificar o último sorteio realizado
SELECT *
FROM sorteios
ORDER BY created_at DESC
LIMIT 1;

-- 4. Verificar se os participantes do último sorteio foram salvos no histórico
SELECT COUNT(*) as total_historico
FROM historico_participantes
WHERE sorteio_id = (
  SELECT id
  FROM sorteios
  ORDER BY created_at DESC
  LIMIT 1
);

-- 5. Verificar se os triggers estão ativos
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgrelid = 'participantes_ativos'::regclass;

-- 6. Limpar qualquer dado de teste se necessário
DELETE FROM participantes_ativos
WHERE EXISTS (
  SELECT 1
  FROM participantes_ativos
); 