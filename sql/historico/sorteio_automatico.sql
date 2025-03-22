-- Arquivo consolidado para implementação do sorteio automático
-- Esta versão é robusta para lidar com diferentes estruturas de tabela

-- Criação da tabela de logs, se ainda não existir
CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    descricao TEXT,
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Função para verificar se já passou das 21:00 no horário de Brasília
CREATE OR REPLACE FUNCTION passou_das_21h()
RETURNS BOOLEAN AS $$
DECLARE
    hora_atual TIME;
BEGIN
    -- Obtém a hora atual no fuso horário de Brasília
    hora_atual := (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::TIME;
    
    -- Verifica se a hora atual é maior ou igual a 21:00
    RETURN hora_atual >= '21:00:00'::TIME;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar se já houve sorteio hoje
CREATE OR REPLACE FUNCTION houve_sorteio_hoje()
RETURNS BOOLEAN AS $$
DECLARE
    quantidade INTEGER;
BEGIN
    -- Verifica na tabela sorteios usando a data de hoje
    -- Tentando as possíveis colunas de data que podem existir
    BEGIN
        SELECT COUNT(*) INTO quantidade 
        FROM sorteios 
        WHERE DATE(data_sorteio AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') = 
              DATE(CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo');
        RETURN quantidade > 0;
    EXCEPTION WHEN undefined_column THEN
        -- Tenta outra coluna possível
        BEGIN
            SELECT COUNT(*) INTO quantidade 
            FROM sorteios 
            WHERE DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') = 
                DATE(CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo');
            RETURN quantidade > 0;
        EXCEPTION WHEN undefined_column THEN
            -- Como último recurso, tenta a coluna updated_at
            BEGIN
                SELECT COUNT(*) INTO quantidade 
                FROM sorteios 
                WHERE DATE(updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') = 
                    DATE(CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo');
                RETURN quantidade > 0;
            EXCEPTION WHEN undefined_column THEN
                -- Se nenhuma coluna funcionar, verifica de uma forma mais genérica
                SELECT COUNT(*) INTO quantidade 
                FROM sorteios 
                WHERE vencedor IS NOT NULL 
                AND id IN (
                    SELECT MAX(id) FROM sorteios
                );
                RETURN quantidade > 0;
            END;
        END;
    END;
END;
$$ LANGUAGE plpgsql;

-- Função principal para verificar e realizar o sorteio automaticamente
CREATE OR REPLACE FUNCTION verificar_e_realizar_sorteio()
RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    vencedor TEXT;
    lista_congelada BOOLEAN;
    quantidade_participantes INTEGER;
    sorteio_id INTEGER;
BEGIN
    -- Adiciona log de verificação
    INSERT INTO logs (descricao) VALUES ('Verificando condições para sorteio');
    
    -- Verifica se já passou das 21h
    IF NOT passou_das_21h() THEN
        RETURN jsonb_build_object(
            'realizado', FALSE,
            'mensagem', 'Ainda não chegou o horário do sorteio (21h)',
            'vencedor', NULL
        );
    END IF;
    
    -- Verifica se já houve sorteio hoje
    IF houve_sorteio_hoje() THEN
        RETURN jsonb_build_object(
            'realizado', FALSE,
            'mensagem', 'Já foi realizado um sorteio hoje',
            'vencedor', NULL
        );
    END IF;
    
    -- Verifica se a lista está congelada (obrigatório para sortear)
    SELECT valor::BOOLEAN INTO lista_congelada FROM configuracoes WHERE chave = 'lista_congelada';
    IF NOT lista_congelada THEN
        -- Congela a lista automaticamente
        UPDATE configuracoes SET valor = 'true' WHERE chave = 'lista_congelada';
        INSERT INTO logs (descricao) VALUES ('Lista de participantes congelada automaticamente');
    END IF;
    
    -- Verifica se há participantes ativos
    SELECT COUNT(*) INTO quantidade_participantes FROM participantes_ativos;
    IF quantidade_participantes = 0 THEN
        RETURN jsonb_build_object(
            'realizado', FALSE,
            'mensagem', 'Não há participantes para realizar o sorteio',
            'vencedor', NULL
        );
    END IF;
    
    -- Realiza o sorteio
    INSERT INTO logs (descricao) VALUES ('Iniciando sorteio automático');
    
    -- Seleciona um vencedor aleatoriamente
    SELECT nome_twitch INTO vencedor 
    FROM participantes_ativos 
    ORDER BY RANDOM() 
    LIMIT 1;
    
    -- Registra o resultado do sorteio
    INSERT INTO sorteios (vencedor) 
    VALUES (vencedor)
    RETURNING id INTO sorteio_id;
    
    -- Log do resultado
    INSERT INTO logs (descricao) VALUES ('Sorteio realizado. Vencedor: ' || vencedor);
    
    -- O trigger deve limpar a tabela participantes_ativos e resetar a configuração lista_congelada
    -- Mas vamos garantir que isso ocorra
    UPDATE configuracoes SET valor = 'false' WHERE chave = 'lista_congelada';
    
    -- Retorna o resultado
    RETURN jsonb_build_object(
        'realizado', TRUE,
        'mensagem', 'Sorteio realizado com sucesso',
        'vencedor', vencedor
    );
END;
$$ LANGUAGE plpgsql;

-- Criar ou substituir a função para testar manualmente
CREATE OR REPLACE FUNCTION testar_sorteio_manual()
RETURNS JSONB AS $$
DECLARE
    resultado TEXT;
    vencedor TEXT;
BEGIN
    -- Força a lista a ser congelada
    UPDATE configuracoes SET valor = 'true' WHERE chave = 'lista_congelada';
    
    -- Executa o sorteio manualmente ignorando as verificações de horário
    SELECT nome_twitch INTO vencedor 
    FROM participantes_ativos 
    ORDER BY RANDOM() 
    LIMIT 1;
    
    IF vencedor IS NULL THEN
        RETURN jsonb_build_object(
            'realizado', FALSE,
            'mensagem', 'Não há participantes para realizar o sorteio',
            'vencedor', NULL
        );
    END IF;
    
    -- Registra o resultado do sorteio
    INSERT INTO sorteios (vencedor) 
    VALUES (vencedor);
    
    -- Retorna o resultado
    RETURN jsonb_build_object(
        'realizado', TRUE,
        'mensagem', 'Sorteio manual realizado com sucesso',
        'vencedor', vencedor
    );
END;
$$ LANGUAGE plpgsql;

-- Comentários para documentação
COMMENT ON FUNCTION verificar_e_realizar_sorteio() IS 'Verifica se é hora de realizar o sorteio (21h) e se ainda não houve sorteio hoje. Se as condições forem atendidas, realiza o sorteio.';
COMMENT ON FUNCTION testar_sorteio_manual() IS 'Permite realizar um sorteio manualmente, ignorando verificações de horário. Útil para testes.';
COMMENT ON FUNCTION houve_sorteio_hoje() IS 'Verifica se já houve sorteio hoje, tentando diferentes campos de data que podem existir na tabela sorteios.';
COMMENT ON FUNCTION passou_das_21h() IS 'Verifica se a hora atual já passou das 21h no horário de Brasília.'; 