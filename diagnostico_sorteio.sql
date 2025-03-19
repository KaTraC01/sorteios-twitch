-- Script de diagnóstico para problema de sorteios não registrados

-- 1. Verificar se há erros no registro de logs
-- Esta consulta verifica registros recentes na tabela de logs (se existir)
SELECT * FROM pg_catalog.pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'logs';

-- 2. Verificar o último sorteio registrado
SELECT * FROM sorteios
ORDER BY data DESC
LIMIT 5;

-- 3. Verificar a configuração de lista congelada atual
SELECT * FROM configuracoes
WHERE chave = 'lista_congelada';

-- 4. Verificar se o trigger ainda existe e está ativo
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table, 
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'sorteios'
AND trigger_schema = 'public';

-- 5. Verificar se há algum registro de atividade recente
SELECT 
    table_name,
    (xmin::text::int8 > (SELECT COALESCE(MAX(id), 0) FROM sorteios)) as has_recent_activity
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('sorteios', 'participantes_ativos', 'historico_participantes');

-- 6. CORREÇÃO: Testar inserção manual de sorteio para verificar problemas
-- Usado apenas para teste (comentado por segurança)
-- INSERT INTO sorteios (data, numero, nome, streamer)
-- VALUES (NOW(), 999, 'TESTE_DIAGNOSTICO', 'TESTE_STREAMER');

-- 7. CORREÇÃO: Recriar o trigger para garantir que está funcionando corretamente
DROP TRIGGER IF EXISTS trigger_reset_participantes_ativos ON sorteios;

CREATE OR REPLACE FUNCTION reset_participantes_ativos()
RETURNS TRIGGER AS $$
BEGIN
  -- Salvar histórico (se já não foi salvo pela aplicação)
  INSERT INTO historico_participantes (sorteio_id, nome_twitch, streamer_escolhido)
  SELECT NEW.id, nome_twitch, streamer_escolhido
  FROM participantes_ativos
  WHERE NOT EXISTS (
    SELECT 1 FROM historico_participantes WHERE sorteio_id = NEW.id
  );
  
  -- Limpar a tabela de participantes ativos
  DELETE FROM participantes_ativos;
  
  -- Resetar a configuração da lista congelada
  UPDATE configuracoes
  SET valor = 'false', atualizado_em = NOW()
  WHERE chave = 'lista_congelada';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reset_participantes_ativos
AFTER INSERT ON sorteios
FOR EACH ROW
EXECUTE FUNCTION reset_participantes_ativos();

-- 8. Verificar permissões nas tabelas
SELECT 
    table_name,
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name IN ('sorteios', 'participantes_ativos', 'historico_participantes')
ORDER BY table_name, grantee; 