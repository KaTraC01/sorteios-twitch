-- Função para atualizar as métricas resumidas diárias
-- Esta função deve ser executada uma vez por dia por um cron job
-- Ela irá calcular as métricas resumidas a partir dos eventos detalhados de anúncios

CREATE OR REPLACE FUNCTION atualizar_metricas_resumo()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    data_hoje date := current_date;
    registros_atualizados integer := 0;
    registros_inseridos integer := 0;
BEGIN
    -- Atualizar ou inserir métricas resumidas para o dia atual
    -- Esta instrução usa ON CONFLICT para fazer um "upsert"
    WITH eventos_sumarizados AS (
        SELECT 
            date_trunc('day', data_hora)::date AS data,
            anuncio_id,
            pagina_id,
            COUNT(CASE WHEN tipo_evento = 'impressao' THEN 1 END) AS contagem_impressoes,
            COUNT(CASE WHEN tipo_evento = 'clique' THEN 1 END) AS contagem_cliques,
            -- Correção: garantir que somente calcule tempo médio quando houver impressões
            CASE 
                WHEN COUNT(CASE WHEN tipo_evento = 'impressao' THEN 1 END) > 0 
                THEN AVG(CASE WHEN tipo_evento = 'impressao' THEN COALESCE(tempo_exposto, 0) ELSE NULL END)
                ELSE 0 
            END AS tempo_medio_exposicao,
            -- Correção: garantir que somente calcule visibilidade quando houver impressões
            CASE 
                WHEN COUNT(CASE WHEN tipo_evento = 'impressao' THEN 1 END) > 0 
                THEN AVG(CASE WHEN tipo_evento = 'impressao' THEN CASE WHEN visivel THEN 100 ELSE 0 END ELSE NULL END)
                ELSE 0 
            END AS taxa_visibilidade,
            -- Dividimos em grupos para calcular outros parâmetros
            COUNT(DISTINCT CASE WHEN tipo_evento = 'impressao' THEN 
                COALESCE(dispositivo_info->>'userAgent', '') || COALESCE(dispositivo_info->>'screenSize'->>'width', '') 
            END) AS dispositivos_unicos,
            COUNT(DISTINCT CASE WHEN tipo_evento = 'impressao' THEN origem_trafego ELSE NULL END) AS fontes_trafego_unicas,
            COUNT(DISTINCT user_session_id) AS sessoes_unicas,
            -- Correção: calcular CTR como uma proporção de cliques para impressões
            CASE 
                WHEN COUNT(CASE WHEN tipo_evento = 'impressao' THEN 1 END) > 0 
                THEN (COUNT(CASE WHEN tipo_evento = 'clique' THEN 1 END)::numeric / 
                      COUNT(CASE WHEN tipo_evento = 'impressao' THEN 1 END)::numeric) * 100
                ELSE 0 
            END AS ctr
        FROM 
            eventos_anuncios
        WHERE 
            data_hora >= data_hoje - INTERVAL '7 days'
        GROUP BY 
            date_trunc('day', data_hora)::date,
            anuncio_id,
            pagina_id
    )
    
    -- Insere ou atualiza os registros na tabela de métricas resumidas
    INSERT INTO metricas_resumo_diarias (
        data,
        anuncio_id,
        pagina_id,
        contagem_impressoes,
        contagem_cliques,
        tempo_medio_exposicao,
        taxa_visibilidade,
        ctr,
        dispositivos_unicos,
        fontes_trafego_unicas,
        sessoes_unicas,
        atualizado_em
    )
    SELECT
        es.data,
        es.anuncio_id,
        es.pagina_id,
        es.contagem_impressoes,
        es.contagem_cliques,
        ROUND(es.tempo_medio_exposicao::numeric, 2),
        ROUND(es.taxa_visibilidade::numeric, 2),
        ROUND(es.ctr::numeric, 2),
        es.dispositivos_unicos,
        es.fontes_trafego_unicas,
        es.sessoes_unicas,
        NOW()
    FROM 
        eventos_sumarizados es
    ON CONFLICT (data, anuncio_id, pagina_id) 
    DO UPDATE SET
        contagem_impressoes = EXCLUDED.contagem_impressoes,
        contagem_cliques = EXCLUDED.contagem_cliques,
        tempo_medio_exposicao = EXCLUDED.tempo_medio_exposicao,
        taxa_visibilidade = EXCLUDED.taxa_visibilidade,
        ctr = EXCLUDED.ctr,
        dispositivos_unicos = EXCLUDED.dispositivos_unicos,
        fontes_trafego_unicas = EXCLUDED.fontes_trafego_unicas,
        sessoes_unicas = EXCLUDED.sessoes_unicas,
        atualizado_em = NOW()
    RETURNING 1
    INTO registros_atualizados;
    
    -- Retornar número de linhas afetadas
    RETURN registros_atualizados;
END;
$$;

-- Permissões para a função
GRANT EXECUTE ON FUNCTION atualizar_metricas_resumo() TO anon, authenticated, service_role;

/*
Instruções para uso no Supabase:

1. Cole este SQL no Editor SQL do Supabase ou no painel de Funções do banco de dados
2. Execute para criar a função atualizar_metricas_resumo
3. A função será chamada pelo cron job existente do sorteio
4. Não é necessário criar um novo cron job separado, economizando recursos da Vercel
*/ 