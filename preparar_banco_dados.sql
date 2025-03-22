-- SCRIPT DE PREPARAÇÃO E CORREÇÃO DO BANCO DE DADOS
-- Execute este script para garantir que todas as tabelas e funções necessárias existam

-- =============================================
-- 1. TABELAS PRINCIPAIS
-- =============================================

-- Tabela de participantes ativos (lista atual)
CREATE TABLE IF NOT EXISTS participantes_ativos (
    id SERIAL PRIMARY KEY,
    nome_twitch TEXT NOT NULL,
    streamer_escolhido TEXT NOT NULL,
    data_inscricao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de sorteios realizados
CREATE TABLE IF NOT EXISTS sorteios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    streamer TEXT NOT NULL,
    numero INTEGER NOT NULL,
    data TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de histórico de participantes por sorteio
CREATE TABLE IF NOT EXISTS historico_participantes (
    id SERIAL PRIMARY KEY,
    sorteio_id UUID REFERENCES sorteios(id),
    nome_twitch TEXT NOT NULL,
    streamer_escolhido TEXT NOT NULL,
    data_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de configurações
CREATE TABLE IF NOT EXISTS configuracoes (
    id SERIAL PRIMARY KEY,
    chave TEXT UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de logs
CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    descricao TEXT NOT NULL,
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 2. ÍNDICES
-- =============================================

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_sorteios_data ON sorteios(data);
CREATE INDEX IF NOT EXISTS idx_historico_sorteio_id ON historico_participantes(sorteio_id);
CREATE INDEX IF NOT EXISTS idx_logs_data_hora ON logs(data_hora);

-- =============================================
-- 3. CONFIGURAÇÕES INICIAIS
-- =============================================

-- Inserir configurações se não existirem
INSERT INTO configuracoes (chave, valor)
VALUES 
    ('lista_congelada', 'false'),
    ('hora_sorteio', '21:00')
ON CONFLICT (chave) DO NOTHING;

-- =============================================
-- 4. FUNÇÃO DE SORTEIO AUTOMÁTICO
-- =============================================

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

-- =============================================
-- 5. TRIGGER PARA RESET APÓS SORTEIO
-- =============================================

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
-- 6. RELATÓRIO DE VERIFICAÇÃO
-- =============================================

SELECT 'VERIFICAÇÃO DE ESTRUTURA DO BANCO DE DADOS' AS "INFO";

-- Verificar se todas as tabelas existem
SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'participantes_ativos') AS "Tabela participantes_ativos existe";
SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sorteios') AS "Tabela sorteios existe";
SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'historico_participantes') AS "Tabela historico_participantes existe";
SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'configuracoes') AS "Tabela configuracoes existe";
SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'logs') AS "Tabela logs existe";

-- Verificar se as funções existem
SELECT EXISTS (SELECT FROM pg_proc WHERE proname = 'realizar_sorteio_automatico') AS "Função realizar_sorteio_automatico existe";
SELECT EXISTS (SELECT FROM pg_proc WHERE proname = 'reset_participantes_ativos') AS "Função reset_participantes_ativos existe";

-- Verificar se o trigger existe
SELECT EXISTS (
    SELECT FROM information_schema.triggers 
    WHERE trigger_name = 'trigger_reset_participantes_ativos'
) AS "Trigger reset_participantes_ativos existe";

-- Mostrar configurações atuais
SELECT 'CONFIGURAÇÕES ATUAIS DO SISTEMA' AS "INFO";
SELECT * FROM configuracoes; 