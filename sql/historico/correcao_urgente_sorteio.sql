-- Script para diagnosticar e corrigir urgentemente os problemas do sorteio
-- 1. Verificar estrutura das tabelas
-- 2. Verificar/corrigir trigger de reset
-- 3. Testar manualmente o sorteio
-- 4. Garantir que a lista será limpada e os ganhadores registrados

-- Parte 1: Diagnóstico inicial
SELECT 'DIAGNÓSTICO DO SISTEMA DE SORTEIO' as "Etapa";

-- Verificar estrutura da tabela sorteios
SELECT 'Estrutura da tabela sorteios:' as "Info";
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sorteios' 
ORDER BY ordinal_position;

-- Verificar participantes ativos
SELECT 'Participantes ativos atualmente:' as "Info";
SELECT COUNT(*) as total_participantes FROM participantes_ativos;

-- Verificar configurações
SELECT 'Configurações do sistema:' as "Info";
SELECT * FROM configuracoes WHERE chave = 'lista_congelada';

-- Verificar se o trigger está presente
SELECT 'Status dos triggers do sistema:' as "Info";
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'sorteios';

-- Parte 2: Correção do Trigger de Reset
SELECT 'CORREÇÕES DO SISTEMA' as "Etapa";

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

-- Parte 3: Verificação após correções
SELECT 'VERIFICAÇÃO APÓS CORREÇÕES' as "Etapa";

-- Verificar novamente se o trigger está presente
SELECT 'Status do trigger após correção:' as "Info";
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'sorteios';

-- Parte 4: Teste Manual do Sorteio
SELECT 'TESTE MANUAL DO SORTEIO' as "Etapa";

-- Criar tabela de logs se não existir
CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    descricao TEXT,
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Verificar se há participantes para o sorteio
SELECT 'Verificando participantes para sorteio:' as "Info";
SELECT COUNT(*) as total_participantes FROM participantes_ativos;

-- Se não houver participantes, podemos adicionar alguns para teste
DO $$
BEGIN
    IF (SELECT COUNT(*) FROM participantes_ativos) = 0 THEN
        INSERT INTO logs (descricao) VALUES ('Adicionando participantes de teste');
        
        -- Inserir alguns participantes de teste se não houver nenhum
        INSERT INTO participantes_ativos (nome_twitch, streamer_escolhido)
        VALUES 
            ('Usuario_Teste1', 'Streamer1'),
            ('Usuario_Teste2', 'Streamer2'),
            ('Usuario_Teste3', 'Streamer1');
            
        -- Congelar a lista para o sorteio
        UPDATE configuracoes SET valor = 'true' WHERE chave = 'lista_congelada';
    END IF;
END $$;

-- Verificar status após possível inserção
SELECT 'Status após verificação/inserção:' as "Info";
SELECT COUNT(*) as total_participantes FROM participantes_ativos;
SELECT * FROM configuracoes WHERE chave = 'lista_congelada';

-- Executar sorteio manual de teste
SELECT 'Realizando sorteio manual:' as "Info";

DO $$
DECLARE
    sorteado_nome TEXT;
    sorteado_streamer TEXT;
    sorteio_id UUID;
    numero_sorteado INTEGER;
BEGIN
    -- Verificar se há participantes
    IF (SELECT COUNT(*) FROM participantes_ativos) = 0 THEN
        INSERT INTO logs (descricao) VALUES ('Não há participantes para o sorteio');
        RETURN;
    END IF;
    
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
    
    INSERT INTO logs (descricao) 
    VALUES ('Sorteio manual realizado. Vencedor: ' || sorteado_nome || 
            ', Streamer: ' || sorteado_streamer || 
            ', Número: ' || numero_sorteado);
END $$;

-- Verificação Final após o sorteio
SELECT 'VERIFICAÇÃO FINAL' as "Etapa";

-- Verificar se o sorteio foi registrado
SELECT 'Últimos sorteios registrados:' as "Info";
SELECT * FROM sorteios ORDER BY data DESC LIMIT 3;

-- Verificar se a lista foi limpa
SELECT 'Verificando se a lista foi limpa:' as "Info";
SELECT COUNT(*) as participantes_restantes FROM participantes_ativos;

-- Verificar se os participantes foram salvos no histórico
SELECT 'Verificando histórico de participantes:' as "Info";
SELECT sorteio_id, COUNT(*) as total_participantes 
FROM historico_participantes 
GROUP BY sorteio_id 
ORDER BY sorteio_id DESC 
LIMIT 3;

-- Verificar logs de execução
SELECT 'Logs de execução:' as "Info";
SELECT data_hora, descricao FROM logs ORDER BY data_hora DESC LIMIT 10;

-- Verificar se a configuração foi resetada
SELECT 'Status da configuração após sorteio:' as "Info";
SELECT * FROM configuracoes WHERE chave = 'lista_congelada';

-- Instrução para o usuário
SELECT 'INSTRUÇÕES PARA O USUÁRIO' as "Etapa";
SELECT 'Se tudo ocorreu corretamente, você verá:
1. Um novo sorteio registrado na tabela sorteios
2. Zero participantes na tabela participantes_ativos
3. Participantes salvos no histórico
4. Configuração "lista_congelada" como false

Se algum desses resultados não estiver correto, entre em contato para assistência adicional.' as "Mensagem"; 