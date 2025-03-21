-- SCRIPT DE DIAGNÓSTICO E CORREÇÃO DO SISTEMA DE SORTEIO
-- Execute este script para identificar e resolver problemas no sorteio automático

-- =============================================
-- 1. DIAGNÓSTICO DO SISTEMA
-- =============================================

-- Verificar logs recentes
SELECT id, descricao, data_hora 
FROM logs 
ORDER BY data_hora DESC 
LIMIT 20;

-- Verificar sorteios recentes
SELECT id, nome, streamer, numero, data 
FROM sorteios 
ORDER BY data DESC 
LIMIT 5;

-- Verificar status da configuração
SELECT * FROM configuracoes WHERE chave IN ('lista_congelada', 'hora_sorteio');

-- Verificar total de participantes ativos
SELECT COUNT(*) AS total_participantes_ativos FROM participantes_ativos;

-- =============================================
-- 2. VERIFICAÇÃO DAS FUNÇÕES E TRIGGERS
-- =============================================

-- Verificar existência da função de sorteio automático
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'realizar_sorteio_automatico';

-- Verificar se o trigger de reset está funcionando corretamente
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'sorteios';

-- =============================================
-- 3. CORREÇÃO DO SISTEMA
-- =============================================

-- 3.1 Corrigir a função de sorteio automático se necessário
CREATE OR REPLACE FUNCTION realizar_sorteio_automatico()
RETURNS jsonb AS $$
DECLARE
    sorteado_nome TEXT;
    sorteado_streamer TEXT;
    sorteio_id UUID;
    numero_sorteado INTEGER;
    resultado jsonb;
    total_participantes INTEGER;
BEGIN
    -- Adicionar log de início
    INSERT INTO logs (descricao) VALUES ('Iniciando tentativa de sorteio automático');
    
    -- Verificar se já houve sorteio nas últimas 15 horas
    IF EXISTS (SELECT 1 FROM sorteios WHERE data > (CURRENT_TIMESTAMP - interval '15 hours')) THEN
        resultado := jsonb_build_object(
            'realizado', false,
            'mensagem', 'Já foi realizado um sorteio recentemente',
            'ultimo_sorteio', (SELECT data FROM sorteios ORDER BY data DESC LIMIT 1)
        );
        
        INSERT INTO logs (descricao) VALUES ('Sorteio não realizado: já houve sorteio recente');
        RETURN resultado;
    END IF;
    
    -- Contar participantes
    SELECT COUNT(*) INTO total_participantes FROM participantes_ativos;
    
    -- Verificar se há participantes
    IF total_participantes = 0 THEN
        resultado := jsonb_build_object(
            'realizado', false,
            'mensagem', 'Não há participantes para o sorteio'
        );
        
        -- Resetar lista congelada já que não teve sorteio
        UPDATE configuracoes SET valor = 'false' WHERE chave = 'lista_congelada';
        INSERT INTO logs (descricao) VALUES ('Sorteio não realizado: lista de participantes vazia');
        RETURN resultado;
    END IF;
    
    -- Congelar a lista (se ainda não estiver)
    UPDATE configuracoes SET valor = 'true' WHERE chave = 'lista_congelada';
    INSERT INTO logs (descricao) VALUES ('Lista congelada para sorteio automático');
    
    -- REALIZAR O SORTEIO
    -- Selecionar vencedor aleatoriamente
    SELECT nome_twitch, streamer_escolhido 
    INTO sorteado_nome, sorteado_streamer
    FROM participantes_ativos
    ORDER BY RANDOM()
    LIMIT 1;
    
    -- Gerar número aleatório para o sorteio (1-100)
    numero_sorteado := floor(random() * 100 + 1)::integer;
    
    -- Registrar o sorteio
    INSERT INTO sorteios (nome, streamer, numero, data)
    VALUES (sorteado_nome, sorteado_streamer, numero_sorteado, CURRENT_TIMESTAMP)
    RETURNING id INTO sorteio_id;
    
    -- O trigger de reset_participantes_ativos deve executar automaticamente
    
    -- Registrar sucesso nos logs
    INSERT INTO logs (descricao) 
    VALUES ('Sorteio automático realizado com sucesso! Vencedor: ' || sorteado_nome || 
            ', Streamer: ' || sorteado_streamer || 
            ', Número: ' || numero_sorteado ||
            ', Total participantes: ' || total_participantes);
    
    -- Montar resultado
    resultado := jsonb_build_object(
        'realizado', true,
        'mensagem', 'Sorteio realizado com sucesso',
        'vencedor', jsonb_build_object(
            'nome', sorteado_nome,
            'streamer', sorteado_streamer,
            'numero', numero_sorteado,
            'id', sorteio_id,
            'data', CURRENT_TIMESTAMP,
            'total_participantes', total_participantes
        )
    );
    
    RETURN resultado;
    
EXCEPTION WHEN OTHERS THEN
    -- Em caso de erro, registrar e retornar erro
    INSERT INTO logs (descricao) VALUES ('ERRO durante o sorteio automático: ' || SQLERRM);
    
    resultado := jsonb_build_object(
        'realizado', false,
        'mensagem', 'Erro durante o sorteio: ' || SQLERRM
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.2 Corrigir o trigger de reset 
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

-- Recriar o trigger
DROP TRIGGER IF EXISTS trigger_reset_participantes_ativos ON sorteios;
CREATE TRIGGER trigger_reset_participantes_ativos
AFTER INSERT ON sorteios
FOR EACH ROW
EXECUTE FUNCTION reset_participantes_ativos();

-- =============================================
-- 4. TESTE MANUAL DO SORTEIO
-- =============================================

-- Para testar o sorteio manualmente, descomente e execute o comando abaixo:
-- SELECT * FROM realizar_sorteio_automatico();

-- =============================================
-- 5. INSTRUÇÕES ADICIONAIS
-- =============================================

SELECT 'INSTRUÇÕES PARA RESOLVER PROBLEMAS COMUNS' AS "AJUDA";

SELECT '1. Se o sorteio não estiver sendo realizado automaticamente:
- Verifique se o cron job está configurado corretamente no arquivo vercel.json
- Confirme que a variável CRON_SECRET está definida no painel da Vercel
- Verifique se o arquivo api/cron.js existe e está configurado para chamar a função de sorteio

2. Se o sorteio está sendo realizado, mas não está limpando a lista:
- O trigger reset_participantes_ativos pode não estar funcionando
- Use a correção automática acima para restaurar o trigger

3. Se não há participantes para o sorteio:
- Verifique se os participantes estão sendo registrados corretamente
- Confirme se não há sorteios anteriores que deixaram a lista vazia

4. Para testar todo o sistema manualmente:
- Execute "SELECT * FROM realizar_sorteio_automatico();"' AS "INSTRUÇÕES";

-- =============================================
-- FIM DO SCRIPT
-- ============================================= 