# Atualização do Botão +10: Inserir Participantes Sem Prefixos

Esta atualização permite que o botão +10 adicione múltiplos participantes com o mesmo nome exato, sem adicionar prefixos numéricos.

## O Que Esta Atualização Faz

1. **Modifica o Sistema de Rate Limiting**: Permite que lotes de inserções (via botão +10) sejam identificados de forma diferente, sem necessidade de prefixos.

2. **Preserva a Segurança**: Mantém a proteção contra abusos, mas de uma maneira que não exige prefixos nos nomes.

3. **Melhora a Experiência do Usuário**: Os usuários verão exatamente o nome que digitaram na lista, sem modificações.

## Como Aplicar a Atualização

### Passo 1: Atualizar o Banco de Dados

Execute o seguinte script SQL no Supabase:

```sql
-- Execute o arquivo sql/atual/inserir_participantes_sem_prefixo.sql
```

Este script:
- Cria uma nova versão da função `inserir_participantes_lote` que não adiciona prefixos
- Atualiza o trigger `verificar_rate_limit_trigger` para permitir inserções em lote
- Concede as permissões necessárias

### Passo 2: Atualizar o Componente React

O componente `ListaSorteio` foi atualizado para exibir o feedback correto com o número real de participantes inseridos.

Arquivo atualizado: `src/components/ListaSorteio/index.js`

### Passo 3: Verificar a Atualização

1. **Teste o botão "+10"**:
   - Preencha um nome e streamer
   - Clique no botão "+10"
   - Verifique que os participantes são adicionados sem prefixos

2. **Verifique os logs**:
   ```sql
   SELECT * FROM logs 
   WHERE descricao LIKE 'Inserção em lote:%'
   ORDER BY data_hora DESC
   LIMIT 20;
   ```

## Como Funciona a Nova Implementação

A nova solução utiliza um mecanismo inteligente:

1. **Detecção de Lotes**: O sistema identifica quando uma inserção faz parte de um lote (via botão +10)
2. **Bypass de Rate Limiting**: Para inserções em lote identificadas, o trigger ignora a verificação de rate limiting individual
3. **Controle por Tempo**: As inserções em lote são limitadas a uma a cada 30 segundos por usuário

## Vantagens Desta Abordagem

- **Nomes Consistentes**: Os participantes têm exatamente o mesmo nome em todas as inserções de um lote
- **Experiência Melhorada**: Usuários veem exatamente o que digitaram, sem modificações
- **Segurança Mantida**: O sistema ainda está protegido contra abusos, com controle de lotes

## Observações

Esta atualização não afeta:
- Inserções individuais (via botão "Confirmar")
- O mecanismo de sorteio
- Outras partes do sistema

Apenas o botão "+10" e a exibição de participantes foram modificados. 