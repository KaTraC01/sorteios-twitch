-- Script para realizar um sorteio manual IMEDIATAMENTE
-- Este script usa os participantes atuais na lista

-- Parte 1: Verificar participantes disponíveis
SELECT 'VERIFICAÇÃO INICIAL' as "Etapa";

-- Verificar participantes ativos
SELECT 'Participantes disponíveis para sorteio:' as "Info";
SELECT COUNT(*) as total_participantes FROM participantes_ativos;

-- Listar alguns participantes para confirmar
SELECT 'Amostra de participantes disponíveis:' as "Info";
SELECT nome_twitch, streamer_escolhido 
FROM participantes_ativos 
LIMIT 5;

-- Parte 2: Preparar para o sorteio
SELECT 'PREPARANDO SORTEIO' as "Etapa";

-- Criar tabela de logs se não existir para registro detalhado
CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    descricao TEXT,
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Registrar início do processo
INSERT INTO logs (descricao) VALUES ('Iniciando processo de sorteio manual');

-- Congelar a lista para sorteio (se ainda não estiver congelada)
UPDATE configuracoes SET valor = 'true' WHERE chave = 'lista_congelada';
INSERT INTO logs (descricao) VALUES ('Lista de participantes congelada para sorteio');

-- Parte 3: Realizar o sorteio
SELECT 'REALIZANDO SORTEIO' as "Etapa";

DO $$
DECLARE
    sorteado_nome TEXT;
    sorteado_streamer TEXT;
    sorteio_id UUID;
    numero_sorteado INTEGER;
    total_participantes INTEGER;
BEGIN
    -- Verificar se há participantes
    SELECT COUNT(*) INTO total_participantes FROM participantes_ativos;
    
    IF total_participantes = 0 THEN
        INSERT INTO logs (descricao) VALUES ('ERRO: Não há participantes para realizar o sorteio');
        RAISE EXCEPTION 'Não há participantes para realizar o sorteio';
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
    VALUES ('Sorteio realizado com sucesso! Vencedor: ' || sorteado_nome || 
            ', Streamer: ' || sorteado_streamer || 
            ', Número: ' || numero_sorteado ||
            ', Total de participantes: ' || total_participantes);
    
    -- O trigger de reset deve executar automaticamente após a inserção
END $$;

-- Parte 4: Verificar resultados
SELECT 'VERIFICANDO RESULTADOS' as "Etapa";

-- 1. Verificar o sorteio realizado
SELECT 'Último sorteio realizado:' as "Info";
SELECT id, nome, streamer, numero, data 
FROM sorteios 
ORDER BY data DESC 
LIMIT 1;

-- 2. Verificar se a lista foi limpa (deve estar vazia se o trigger funcionou)
SELECT 'Status da lista de participantes após o sorteio:' as "Info";
SELECT COUNT(*) as total_participantes_restantes FROM participantes_ativos;

-- 3. Verificar participantes no histórico (deve ter todos que estavam na lista)
SELECT 'Histórico de participantes para o último sorteio:' as "Info";
WITH ultimo_sorteio AS (
    SELECT id FROM sorteios ORDER BY data DESC LIMIT 1
)
SELECT COUNT(*) as total_participantes_salvos 
FROM historico_participantes hp
JOIN ultimo_sorteio us ON hp.sorteio_id = us.id;

-- 4. Verificar logs
SELECT 'Logs do processo:' as "Info";
SELECT data_hora, descricao FROM logs ORDER BY data_hora DESC LIMIT 10;

-- 5. Verificar se a configuração foi resetada
SELECT 'Status da configuração após sorteio:' as "Info";
SELECT * FROM configuracoes WHERE chave = 'lista_congelada';

-- Mensagem para o usuário
SELECT 'RESULTADO FINAL' as "Etapa";
SELECT 'Se você está vendo um sorteio na primeira tabela e a contagem de participantes está zerada, o sorteio foi realizado com sucesso e o sistema está funcionando corretamente!' as "Mensagem"; 