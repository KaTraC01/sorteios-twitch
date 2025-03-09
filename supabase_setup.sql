-- Script de configuração do banco de dados Supabase para o sistema de sorteio

-- 1. Criação da tabela de participantes ativos
CREATE TABLE IF NOT EXISTS participantes_ativos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_twitch TEXT NOT NULL,
    streamer_escolhido TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criação da tabela de histórico de sorteios
CREATE TABLE IF NOT EXISTS sorteios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    numero INTEGER NOT NULL,
    nome TEXT NOT NULL,
    streamer TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilitar Row Level Security (RLS) para ambas as tabelas
ALTER TABLE participantes_ativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sorteios ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para a tabela participantes_ativos

-- Permitir leitura para todos (anônimos e autenticados)
CREATE POLICY "Permitir leitura para todos" ON participantes_ativos
    FOR SELECT USING (true);

-- Permitir inserção para todos
CREATE POLICY "Permitir inserção para todos" ON participantes_ativos
    FOR INSERT WITH CHECK (true);

-- Permitir exclusão para todos (necessário para o reset da lista)
CREATE POLICY "Permitir exclusão para todos" ON participantes_ativos
    FOR DELETE USING (true);

-- 5. Políticas para a tabela sorteios

-- Permitir leitura para todos (anônimos e autenticados)
CREATE POLICY "Permitir leitura para todos" ON sorteios
    FOR SELECT USING (true);

-- Permitir inserção para todos
CREATE POLICY "Permitir inserção para todos" ON sorteios
    FOR INSERT WITH CHECK (true);

-- 6. Criar índices para melhorar a performance

-- Índice para ordenação por data de criação na tabela participantes_ativos
CREATE INDEX IF NOT EXISTS idx_participantes_created_at ON participantes_ativos (created_at);

-- Índice para ordenação por data na tabela sorteios
CREATE INDEX IF NOT EXISTS idx_sorteios_data ON sorteios (data);

-- 7. Adicionar gatilho para atualizar o campo updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_participantes_updated_at
BEFORE UPDATE ON participantes_ativos
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 8. Comentários para documentação
COMMENT ON TABLE participantes_ativos IS 'Armazena os participantes ativos para o sorteio atual';
COMMENT ON TABLE sorteios IS 'Armazena o histórico de todos os sorteios realizados';

-- Criar tabela para histórico de participantes de cada sorteio
CREATE TABLE IF NOT EXISTS historico_participantes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sorteio_id UUID REFERENCES sorteios(id),
    nome_twitch TEXT NOT NULL,
    streamer_escolhido TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para a tabela de histórico
ALTER TABLE historico_participantes ENABLE ROW LEVEL SECURITY;

-- Criar políticas para a tabela de histórico
CREATE POLICY "Permitir leitura para todos" ON historico_participantes
    FOR SELECT USING (true);

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_historico_sorteio_id ON historico_participantes (sorteio_id);

-- Adicionar comentários
COMMENT ON TABLE historico_participantes IS 'Armazena o histórico de participantes de cada sorteio';

-- Tabela para armazenar configurações do sistema
CREATE TABLE IF NOT EXISTS configuracoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chave TEXT NOT NULL UNIQUE,
    valor TEXT NOT NULL,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

-- Políticas para configuracoes
CREATE POLICY IF NOT EXISTS "Permitir leitura pública de configuracoes" 
    ON configuracoes FOR SELECT 
    USING (true);

CREATE POLICY IF NOT EXISTS "Permitir inserção e atualização em configuracoes via API" 
    ON configuracoes FOR ALL
    USING (true)
    WITH CHECK (true);

-- Inserir configurações iniciais
INSERT INTO configuracoes (chave, valor) 
VALUES ('lista_congelada', 'false')
ON CONFLICT (chave) DO UPDATE SET valor = 'false', atualizado_em = NOW();

-- Função para limpar a tabela de participantes_ativos às 21:05
CREATE OR REPLACE FUNCTION reset_participantes_ativos()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM participantes_ativos;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para resetar a lista após um sorteio
DROP TRIGGER IF EXISTS trigger_reset_participantes_ativos ON sorteios;
CREATE TRIGGER trigger_reset_participantes_ativos
AFTER INSERT ON sorteios
FOR EACH ROW
EXECUTE FUNCTION reset_participantes_ativos(); 