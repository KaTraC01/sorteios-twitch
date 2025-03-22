-- Script para corrigir o SORTEIO AUTOMÁTICO
-- Este script corrige a função que deve ser chamada pelo cron job ou pelo frontend

-- Verificar função atual
SELECT 'DIAGNÓSTICO DO SORTEIO AUTOMÁTICO' as "Etapa";

-- Criar ou substituir a função de verificação e realização do sorteio
CREATE OR REPLACE FUNCTION verificar_e_realizar_sorteio()
RETURNS jsonb AS $$
DECLARE
    sorteado_nome TEXT;
    sorteado_streamer TEXT;
    sorteio_id UUID;
    numero_sorteado INTEGER;
    hora_atual TIME;
    hora_sorteio TIME;
    config_valor TEXT;
    lista_congelada BOOLEAN;
    resultado jsonb;
    total_participantes INTEGER;
    dia_atual INTEGER;
BEGIN
    -- Registrar início da verificação em logs
    INSERT INTO logs (descricao) VALUES ('Verificando condições para sorteio automático');
    
    -- Verificar dia da semana (1 = domingo, 7 = sábado)
    dia_atual := EXTRACT(DOW FROM CURRENT_TIMESTAMP) + 1;
    
    -- Verificar hora atual
    hora_atual := CURRENT_TIME;
    
    -- Obter hora configurada para sorteio (padrão: 21:00)
    SELECT valor INTO config_valor FROM configuracoes WHERE chave = 'hora_sorteio';
    hora_sorteio := COALESCE(config_valor, '21:00')::TIME;
    
    -- Obter status da lista congelada
    SELECT valor INTO config_valor FROM configuracoes WHERE chave = 'lista_congelada';
    lista_congelada := COALESCE(config_valor, 'false')::BOOLEAN;
    
    -- Contar participantes
    SELECT COUNT(*) INTO total_participantes FROM participantes_ativos;
    
    -- Registrar condições em logs
    INSERT INTO logs (descricao) 
    VALUES ('Condições: Dia=' || dia_atual || 
            ', Hora atual=' || hora_atual || 
            ', Hora sorteio=' || hora_sorteio || 
            ', Lista congelada=' || lista_congelada || 
            ', Total participantes=' || total_participantes);
    
    -- Se não estiver no horário (com 5 minutos de tolerância) - retorna sem sortear
    IF hora_atual < hora_sorteio OR hora_atual > (hora_sorteio + interval '5 minutes') THEN
        resultado := jsonb_build_object(
            'realizado', false,
            'mensagem', 'Não está no horário do sorteio',
            'hora_atual', hora_atual,
            'hora_sorteio', hora_sorteio
        );
        
        INSERT INTO logs (descricao) VALUES ('Sorteio não realizado: fora do horário');
        RETURN resultado;
    END IF;
    
    -- Se já estiver congelada, verifica se já foi sorteado nas últimas 24 horas
    IF lista_congelada THEN
        -- Verificar se já houve sorteio nas últimas 24 horas
        IF EXISTS (SELECT 1 FROM sorteios WHERE data > (CURRENT_TIMESTAMP - interval '24 hours')) THEN
            resultado := jsonb_build_object(
                'realizado', false,
                'mensagem', 'Já foi realizado um sorteio nas últimas 24 horas',
                'ultimo_sorteio', (SELECT data FROM sorteios ORDER BY data DESC LIMIT 1)
            );
            
            INSERT INTO logs (descricao) VALUES ('Sorteio não realizado: já houve sorteio nas últimas 24h');
            RETURN resultado;
        END IF;
    END IF;
    
    -- Congelar a lista se ainda não estiver congelada
    IF NOT lista_congelada THEN
        UPDATE configuracoes SET valor = 'true' WHERE chave = 'lista_congelada';
        INSERT INTO logs (descricao) VALUES ('Lista de participantes congelada para sorteio');
    END IF;
    
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
    
    -- Registrar sucesso nos logs
    INSERT INTO logs (descricao) 
    VALUES ('Sorteio automático realizado com sucesso! Vencedor: ' || sorteado_nome || 
            ', Streamer: ' || sorteado_streamer || 
            ', Número: ' || numero_sorteado ||
            ', Total participantes: ' || total_participantes);
    
    RETURN resultado;
    
EXCEPTION WHEN OTHERS THEN
    -- Em caso de erro, registrar nos logs e retornar erro
    INSERT INTO logs (descricao) VALUES ('ERRO durante o sorteio: ' || SQLERRM);
    
    resultado := jsonb_build_object(
        'realizado', false,
        'mensagem', 'Erro durante o sorteio: ' || SQLERRM
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que a função está acessível
GRANT EXECUTE ON FUNCTION verificar_e_realizar_sorteio() TO authenticated;
GRANT EXECUTE ON FUNCTION verificar_e_realizar_sorteio() TO anon;
GRANT EXECUTE ON FUNCTION verificar_e_realizar_sorteio() TO service_role;

-- Verificar se a função foi criada
SELECT 'VERIFICAÇÃO DA FUNÇÃO' as "Etapa";
SELECT proname, proargtypes, prosrc 
FROM pg_proc 
WHERE proname = 'verificar_e_realizar_sorteio';

-- Mensagem para o usuário
SELECT 'INSTRUÇÕES PARA O USUÁRIO' as "Etapa";
SELECT 'A função de sorteio automático foi corrigida!

Para garantir que o sorteio seja realizado automaticamente:

1. No front-end, adicione o seguinte código para verificar a cada 5 minutos:
   - Crie um componente que chama a função verificar_e_realizar_sorteio() a cada 5 minutos
   - Importe e use esse componente no seu arquivo principal

2. Se você já tem um componente de verificação, certifique-se de que está chamando a função
   a cada 5 minutos e não apenas uma vez

3. Corrija o trigger que limpa a lista executando o script de correção do trigger

O sorteio deve ser realizado automaticamente às 21h desde que:
- Tenha participantes na lista
- O componente de verificação esteja rodando
- O trigger esteja corretamente configurado' as "Mensagem";

-- Adicionar comando para corrigir o trigger do reset
SELECT 'CORREÇÃO DO TRIGGER DE RESET' as "Etapa";

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