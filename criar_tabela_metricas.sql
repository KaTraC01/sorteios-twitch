-- Script para criar a tabela de métricas de anúncios caso ela não exista
-- Este script também configura os índices e permissões necessários

-- Verificar se a tabela já existe antes de criar
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'metricas_resumo_diarias') THEN
        -- Criar a tabela de métricas resumidas
        CREATE TABLE metricas_resumo_diarias (
            anuncio_id UUID REFERENCES anuncios(id),
            pagina_id UUID REFERENCES paginas(id),
            data DATE NOT NULL,
            contagem_impressoes BIGINT DEFAULT 0,
            contagem_cliques BIGINT DEFAULT 0,
            tempo_medio_exposicao NUMERIC DEFAULT 0,
            taxa_visibilidade NUMERIC DEFAULT 0,
            ctr NUMERIC DEFAULT 0,
            dispositivos_unicos INTEGER DEFAULT 0,
            fontes_trafego_unicas INTEGER DEFAULT 0,
            sessoes_unicas INTEGER DEFAULT 0,
            atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            PRIMARY KEY (data, anuncio_id, pagina_id)
        );

        -- Adicionar índices para melhorar performance
        CREATE INDEX idx_metricas_resumo_diarias_data ON metricas_resumo_diarias(data);
        CREATE INDEX idx_metricas_resumo_diarias_anuncio ON metricas_resumo_diarias(anuncio_id);
        CREATE INDEX idx_metricas_resumo_diarias_pagina ON metricas_resumo_diarias(pagina_id);

        -- Adicionar permissões
        GRANT SELECT, INSERT, UPDATE ON metricas_resumo_diarias TO anon, authenticated, service_role;
        
        -- Registrar a criação da tabela no log
        INSERT INTO logs (descricao) 
        VALUES ('Tabela metricas_resumo_diarias criada com sucesso');
    ELSE
        -- Registrar no log que a tabela já existe
        INSERT INTO logs (descricao) 
        VALUES ('Tabela metricas_resumo_diarias já existe, nenhuma ação necessária');
    END IF;
END $$; 