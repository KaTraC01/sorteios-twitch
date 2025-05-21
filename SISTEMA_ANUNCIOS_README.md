# Sistema de Anúncios - Documentação

## Visão Geral

O sistema de anúncios foi **completamente limpo** de todas as funcionalidades de rastreamento e métricas. Esta limpeza foi feita para permitir uma nova implementação do zero.

## O que foi Removido

### Tabelas do Banco de Dados
- `anuncios`
- `eventos_anuncios`
- `metricas_anuncios`
- `metricas_resumo_diarias`

### Funções SQL
- `inserir_eventos_anuncios_lote()`
- `atualizar_metricas_resumo()`
- `obter_ou_criar_anuncio()`
- `obter_ou_criar_pagina()`

### Componentes React
- Componente `AdTracker` (completamente removido)
- Toda a lógica de rastreamento do componente `Anuncio`

### Arquivos SQL
- `criar_tabela_metricas.sql`
- `atualizar_funcao_metricas.sql`
- `converter_metricas_resumo_diarias.sql`
- `consultas_metricas.sql`
- `supabase_functions/atualizar_metricas_resumo.sql`

### Outros Arquivos
- `verificar-metricas-banner.js`
- `check-banners.js`

## Como Funciona Agora

O componente `Anuncio` foi simplificado para apenas exibir os anúncios sem nenhuma lógica de rastreamento:

1. Carrega configurações de `/anuncios/config.json` (se disponível)
2. Seleciona anúncios aleatórios ou específicos por tipo/posição
3. Renderiza o anúncio visualmente de acordo com o tipo
4. Não realiza nenhum rastreamento de visibilidade, cliques ou métricas

## Tipos de Anúncios Suportados

- banner
- tela-inteira
- fixo-superior
- lateral
- fixo-inferior
- (padrão)

## Como Usar o Componente Anuncio

```jsx
import Anuncio from '../components/Anuncio';

// Exemplo básico
<Anuncio 
  tipo="banner" 
  posicao="direita" 
  titulo="Título do Anúncio" 
  descricao="Descrição do anúncio aqui" 
  urlDestino="https://exemplo.com" 
/>

// Com imagem
<Anuncio 
  tipo="banner" 
  posicao="superior" 
  imagemSrc="/caminho/para/imagem.jpg" 
  urlDestino="https://exemplo.com" 
/>

// Com conteúdo personalizado
<Anuncio 
  tipo="lateral" 
  posicao="direita" 
  conteudoPersonalizado={<div>Conteúdo personalizado aqui</div>} 
/>
```

## Preparação para Nova Implementação

Para implementar um novo sistema de rastreamento de anúncios, você precisará:

1. Projetar e criar novas tabelas no banco de dados
2. Implementar novas funções SQL conforme necessário
3. Desenvolver um novo componente de rastreamento
4. Integrar o rastreamento ao componente `Anuncio` existente

## Execução do Script de Limpeza

Para completar a remoção no banco de dados, execute o script SQL `remover_sistema_metricas_anuncios.sql` que foi criado durante este processo de limpeza. Este script removerá com segurança todas as tabelas e funções relacionadas ao sistema de métricas de anúncios.

```sql
-- Execute no Console SQL do Supabase
\i remover_sistema_metricas_anuncios.sql
```

Observação: Cópias de segurança automáticas são mantidas pelo Supabase, mas é recomendável fazer um backup manual antes de executar o script de remoção. 