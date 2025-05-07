# Documentação e Análise do Sistema de Sorteios

**Versão:** 1.0  
**Data:** Maio/2025  
**Status:** Documento Inicial

## Índice
1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Mapa Completo das Funções Existentes](#2-mapa-completo-das-funções-existentes)
   - [Funções de Sorteio](#21-funções-de-sorteio)
   - [Funções de Participantes](#22-funções-de-participantes)
   - [Funções de Reset e Limpeza](#23-funções-de-reset-e-limpeza)
   - [Funções de Manutenção e Diagnóstico](#24-funções-de-manutenção-e-diagnóstico)
3. [Endpoints de API](#3-endpoints-de-api)
4. [Fluxos de Dados](#4-fluxos-de-dados)
   - [Cadastro de Participantes](#41-fluxo-de-cadastro-de-participantes)
   - [Sorteio Automático](#42-fluxo-de-sorteio-automático)
   - [Visualização de Histórico](#43-fluxo-de-visualização-de-histórico)
   - [Congelamento da Lista](#44-fluxo-de-congelamento-da-lista)
5. [Estrutura do Banco de Dados](#5-estrutura-do-banco-de-dados)
6. [Dependências e Interações Críticas](#6-dependências-e-interações-críticas)
7. [Funções Ativas vs. Legadas](#7-funções-ativas-vs-legadas)
8. [Recomendações de Melhorias](#8-recomendações-de-melhorias)

## 1. Visão Geral do Sistema

O sistema de sorteios é uma plataforma inspirada na Twitch que permite:
- Cadastro de participantes para sorteios diários
- Realização de sorteios automáticos às 21h
- Congelamento da lista 10 minutos antes do sorteio
- Visualização de histórico de vencedores e participantes

A arquitetura do sistema é baseada em:
- **Frontend**: React.js com componentes modulares
- **Backend**: Funções serverless hospedadas na Vercel
- **Banco de Dados**: PostgreSQL via Supabase
- **Tempo Real**: Supabase Realtime para atualizações instantâneas
- **Automação**: Cron jobs para sorteios programados

## 2. Mapa Completo das Funções Existentes

### 2.1 Funções de Sorteio

| Função | Propósito | Status |
|--------|-----------|--------|
| `realizar_sorteio_seguro_v2()` | Implementação atual principal com validação aprimorada e tratamento robusto de erros. Foca na integridade dos dados durante o sorteio. | **Ativo** - Principal função usada pelo endpoint de API. |
| `realizar_sorteio_automatico()` | Versão original do sorteio, referencia esquema antigo (`participantes` com campo `ativo`). | **Legado** - Usado apenas como fallback. |
| `realizar_sorteio_manual()` | Permite realizar sorteio administrativo via interface específica. | **Ativo** - Usado para sorteios manuais. |
| `realizar_sorteio_com_historico_manual()` | Versão do sorteio manual que mantém histórico explícito. | **Ativo** - Usado em sorteios administrativos. |
| `executar_sorteio_simples()` | Versão simplificada do sorteio sem validações extensivas. | **Legado** - Provavelmente não usado. |
| `executar_sorteio_api()` | Adaptador para chamadas de API externas realizarem sorteios. | **Ativo** - Usado por APIs externas. |
| `executar_sorteio_cron()` | Adaptador para chamadas de cron job realizarem sorteios automatizados. | **Ativo** - Usado pelo cron job. |
| `executar_cron_sorteio()` | Entry point para cron jobs, com verificações adicionais. | **Ativo** - Usado pelo cron job da Vercel. |
| `verificar_horario_sorteio()` | Verifica se está no horário apropriado para sorteio automático. | **Ativo** - Utilizado por outras funções. |
| `executar_verificacao_sorteio()` | Verifica se as condições para sorteio estão satisfeitas. | **Ativo** - Usado pelas funções de sorteio. |

### 2.2 Funções de Participantes

| Função | Propósito | Status |
|--------|-----------|--------|
| `validar_corrigir_participantes_ativos()` | Valida e corrige inconsistências nos participantes ativos antes do sorteio. | **Ativo** - Usado pela função de sorteio seguro. |
| `inserir_participante_historico()` | Insere participante no histórico com sanitização e validação. | **Ativo** - Usado durante o sorteio. |
| `inserir_participantes_sem_numero()` | Insere múltiplos participantes de uma vez sem número específico. | **Ativo** - Usado para inserções em lote. |
| `inserir_participantes_lote()` | Mecanismo para inserir lotes de participantes com validação. | **Ativo** - Usado pelo frontend para inserções em massa. |
| `adicionar_participante_ficticio()` | Adiciona participante para testes/demonstração. | **Ativo** - Usado por funções administrativas. |

### 2.3 Funções de Reset e Limpeza

| Função | Propósito | Status |
|--------|-----------|--------|
| `limpar_participantes_seguro()` | Remove participantes ativos de forma segura (com cláusula WHERE). | **Ativo** - Usado após sorteios e para limpeza manual. |
| `resetar_participantes_ativos()` | Reseta participantes ativos com verificações adicionais. | **Ativo** - Usado administrativamente. |
| `reset_participantes_ativos()` | Trigger function que é executada após um sorteio. | **Ativo** - Trigger automático. |
| `reset_apos_sorteio()` | Função wrapper para reset seguro após sorteio. | **Ativo** - Usado como alternativa ao trigger. |
| `limpar_historico_participantes_antigos()` | Remove dados antigos do histórico (mais de 7 dias). | **Ativo** - Usado automaticamente. |

### 2.4 Funções de Manutenção e Diagnóstico

| Função | Propósito | Status |
|--------|-----------|--------|
| `reparar_historico_participantes()` | Corrige inconsistências no histórico de participantes. | **Ativo** - Usado pelo endpoint de reparo. |
| `atualizar_trigger_reset()` | Atualiza a definição do trigger de reset. | **Ativo** - Usado para manutenção. |
| `atualizar_trigger_reset_participantes_ativos()` | Versão específica para atualizar o trigger. | **Ativo** - Usado para manutenção. |
| `atualizar_trigger_limpeza_participantes()` | Atualiza trigger de limpeza automática. | **Ativo** - Usado para manutenção. |
| `atualizar_disponibilidade_sorteios_todos()` | Atualiza flag de disponibilidade em todos os sorteios. | **Ativo** - Usado para manutenção. |
| `atualizar_botoes_sorteios_antigos()` | Atualiza interface para sorteios antigos. | **Ativo** - Usado para manutenção. |

## 3. Endpoints de API

| Endpoint | Propósito | Status |
|----------|-----------|--------|
| `/api/executar-sorteio.js` | Endpoint principal para realizar sorteios, usa `realizar_sorteio_seguro_v2` com fallback. | **Ativo** - Endpoint principal. |
| `/api/reparar-historico.js` | Endpoint para reparar histórico de participantes problemáticos. | **Ativo** - Endpoint de manutenção. |
| `/api/cron-sorteio.js` | Endpoint para execução via cron job. | **Ativo** - Usado pelo agendamento. |
| `/api/debug-sorteio.js` | Endpoint para diagnóstico do sistema. | **Ativo** - Usado para manutenção. |
| `/api/limpar-participantes-antigos.js` | Endpoint para limpeza manual de participantes antigos. | **Ativo** - Usado para manutenção. |
| `/api/corrigir-sistema-cadeado.js` | Corrige problemas com o sistema de congelamento da lista. | **Ativo** - Usado para manutenção. |

## 4. Fluxos de Dados

### 4.1 Fluxo de Cadastro de Participantes

```
Frontend (React) → API → Banco de Dados → Notificação em Tempo Real → Frontend (Atualização)
```

**Detalhamento**:
1. Usuário preenche formulário no frontend com `nome_twitch` e `streamer_escolhido`
2. Frontend valida campos (formato, tamanho) e envia para API
3. API insere na tabela `participantes_ativos` após validação
4. Supabase Realtime notifica o frontend sobre a alteração
5. Frontend atualiza a lista de participantes sem recarregar a página

### 4.2 Fluxo de Sorteio Automático

```
Cron Job (Vercel) → API → Banco de Dados (Função) → Banco de Dados (Trigger) → Notificação em Tempo Real → Frontend
```

**Detalhamento**:
1. Cron Job da Vercel aciona `/api/cron-sorteio.js` às 21h
2. API chama a função `realizar_sorteio_seguro_v2()`
3. Função busca participante aleatório, registra na tabela `sorteios`
4. Trigger `reset_participantes_ativos` ativa automaticamente após inserção
5. Trigger:
   - Salva participantes no histórico (`historico_participantes`)
   - Limpa tabela de participantes ativos
   - Reseta configuração "lista_congelada"
   - Limpa dados históricos antigos (>7 dias)
6. Supabase Realtime notifica o frontend sobre as alterações
7. Frontend atualiza para mostrar o vencedor e a lista vazia

### 4.3 Fluxo de Visualização de Histórico

```
Frontend (Página de Ganhadores) → API → Banco de Dados → Frontend (Exibição)
```

**Detalhamento**:
1. Usuário acessa a página de ganhadores
2. Frontend consulta a tabela `sorteios` para listar vencedores
3. Para cada sorteio, pode buscar participantes da tabela `historico_participantes`
4. Frontend renderiza os dados em formato tabular ou em cards

### 4.4 Fluxo de Congelamento da Lista

```
Cron Job → API → Banco de Dados → Notificação em Tempo Real → Frontend
```

**Detalhamento**:
1. Cron Job aciona endpoint às 20:50 (10 min antes do sorteio)
2. API atualiza configuração "lista_congelada" para "true"
3. Supabase Realtime notifica o frontend
4. Frontend desabilita o formulário de inscrição e exibe mensagem

## 5. Estrutura do Banco de Dados

### Tabelas Principais

| Tabela | Propósito | Campos Principais |
|--------|-----------|-------------------|
| `participantes_ativos` | Armazena participantes do sorteio atual | id, nome_twitch, streamer_escolhido, created_at, plataforma_premio |
| `sorteios` | Registra resultados de sorteios | id, data, numero, nome, streamer, dados_disponiveis, plataforma_premio |
| `historico_participantes` | Mantém histórico de participantes por sorteio | id, sorteio_id, nome_twitch, streamer_escolhido, created_at, plataforma_premio |
| `configuracoes` | Armazena configurações do sistema | chave, valor, atualizado_em |
| `logs` | Registra eventos do sistema | id, descricao, data_hora |

### Constraints Importantes

| Tabela | Constraint | Definição |
|--------|------------|-----------|
| `historico_participantes` | validate_hist_nome_twitch_chars | CHECK ((nome_twitch ~ '^[a-zA-Z0-9_]+$'::text)) |
| `historico_participantes` | validate_hist_nome_twitch_length_new | CHECK (((char_length(nome_twitch) >= 1) AND (char_length(nome_twitch) <= 25))) |
| `historico_participantes` | validate_hist_streamer_escolhido_chars | CHECK ((streamer_escolhido ~ '^[a-zA-Z0-9_]+$'::text)) |
| `historico_participantes` | validate_hist_streamer_escolhido_length | CHECK (((char_length(streamer_escolhido) >= 1) AND (char_length(streamer_escolhido) <= 25))) |
| `participantes_ativos` | validate_nome_twitch_chars | CHECK ((nome_twitch ~ '^[a-zA-Z0-9_]+$'::text)) |
| `participantes_ativos` | validate_nome_twitch_length | CHECK (((char_length(nome_twitch) >= 1) AND (char_length(nome_twitch) <= 25))) |
| `participantes_ativos` | validate_streamer_escolhido_chars | CHECK ((streamer_escolhido ~ '^[a-zA-Z0-9_]+$'::text)) |
| `participantes_ativos` | validate_streamer_escolhido_length | CHECK (((char_length(streamer_escolhido) >= 1) AND (char_length(streamer_escolhido) <= 25))) |

## 6. Dependências e Interações Críticas

### Dependências de Software

- **React.js**: Framework frontend
- **Node.js**: Runtime para APIs serverless
- **Supabase**: Banco de dados PostgreSQL e sistema de tempo real
- **Vercel**: Hospedagem e cron jobs

### Pontos Críticos de Interação

1. **Trigger após Sorteio**
   - O trigger `reset_participantes_ativos` é crucial para a limpeza da lista
   - Falha neste trigger poderia resultar em participantes duplicados em sorteios futuros

2. **Validação de Dados Consistente**
   - Frontend e banco de dados devem manter validações consistentes
   - Divergências podem levar a erros de constraint violation

3. **Sistema de Notificação em Tempo Real**
   - O Supabase Realtime mantém o frontend sincronizado
   - Falhas na conexão resultariam em experiência desatualizada para usuários

4. **Execução do Cron Job**
   - O sistema depende do cron job da Vercel para acionar o sorteio diariamente
   - Falhas no agendamento resultariam em sorteios não realizados

## 7. Funções Ativas vs. Legadas

### Funções Ativas Críticas
- `realizar_sorteio_seguro_v2()` (principal função de sorteio)
- `inserir_participante_historico()` (armazenamento de histórico)
- `validar_corrigir_participantes_ativos()` (validação pré-sorteio)
- `reset_participantes_ativos()` (trigger após sorteio)
- `limpar_participantes_seguro()` (limpeza segura)

### Funções Legadas ou Secundárias
- `realizar_sorteio_automatico()` (versão antiga, usada apenas como fallback)
- `executar_sorteio_simples()` (versão simplificada, provavelmente não usada)
- `reset_apos_sorteio()` (função redundante com o trigger)

### Funções Administrativas/Utilitárias
- `reparar_historico_participantes()` (correção de problemas)
- `atualizar_trigger_reset()` (manutenção de triggers)
- `adicionar_participante_ficticio()` (função de teste)

## 8. Recomendações de Melhorias

Baseado na análise atual, as seguintes melhorias são recomendadas:

### Curto Prazo
1. **Atualizar a função `realizar_sorteio_seguro_v2`**
   - Adicionar verificação de tempo desde o último sorteio (15h)
   - Implementar integração com tabela de configurações

2. **Melhorar o mecanismo de fallback**
   - Atualizar `realizar_sorteio_automatico` para usar o esquema atual
   - Ou substituir por uma versão simplificada da função principal

### Médio Prazo
1. **Consolidar funções similares**
   - Reduzir o número de funções com propósitos sobrepostos
   - Melhorar documentação inline do código

2. **Aprimorar sistema de logs**
   - Implementar níveis de log (info, warning, error)
   - Adicionar sistema de alerta para erros críticos

### Longo Prazo
1. **Refatorar para arquitetura mais modular**
   - Separar claramente regras de negócio, acesso a dados e lógica de apresentação
   - Implementar testes automatizados

2. **Melhorar sistema de retenção de dados**
   - Implementar sistema mais sofisticado para armazenamento de dados históricos
   - Considerar exportação para storage externo após períodos mais longos

---

**Nota:** Este documento deve ser revisado e atualizado a cada alteração significativa no sistema. Mantenha uma seção de histórico de revisões para rastrear mudanças ao longo do tempo. 