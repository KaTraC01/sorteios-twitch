# Medidas de Segurança Atualizadas
**Data da atualização: Abril de 2025**

Este documento descreve as medidas de segurança recentemente implementadas no sistema de sorteios, com foco em proteção contra abusos, tratamento de erros e otimização para o plano gratuito do Supabase.

## 1. Rate Limiting Otimizado

### 1.1 Visão Geral
Foi implementado um sistema de rate limiting do lado do servidor que complementa o controle existente baseado em localStorage. Esta implementação foi cuidadosamente otimizada para minimizar o uso de recursos no Supabase.

### 1.2 Como Funciona
- **Intervalo Entre Participações**: Mantido em 10 segundos, consistente com a implementação frontend
- **Armazenamento Eficiente**: Utiliza a tabela `logs` existente em vez de criar uma nova tabela
- **Baixo Impacto de Recursos**: Minimiza operações no banco de dados para compatibilidade com o plano gratuito
- **Detecção de Abusos**: Registra tentativas repetidas de burlar o limite em `atividades_suspeitas`

### 1.3 Funções Implementadas
- `verificar_limite_participacao`: Verifica se um identificador (normalmente IP) respeitou o intervalo mínimo
- `verificar_rate_limit_trigger`: Trigger BEFORE INSERT que protege a tabela `participantes_ativos`
- `limpar_logs_rate_limit`: Função opcional para remover logs antigos de rate limiting

### 1.4 Manutenção
Para remover logs antigos de rate limiting e economizar espaço:
```sql
SELECT limpar_logs_rate_limit(dias_manter);  -- dias_manter é opcional, padrão: 3 dias
```

## 2. Tratamento de Erros Aprimorado

### 2.1 Visão Geral
A função `reset_participantes_ativos` foi aprimorada com tratamento de erros mais robusto, garantindo que os processos críticos do sistema não falhem silenciosamente.

### 2.2 Melhorias Implementadas
- **Isolamento de Falhas**: Cada operação está isolada em um bloco try-catch próprio
- **Tentativas Alternativas**: Para operações críticas, métodos alternativos são tentados em caso de falha
- **Logging Detalhado**: Cada etapa e erro é registrado para diagnóstico
- **Continuidade de Operação**: Falhas em uma etapa não interrompem o processo completo

### 2.3 Exemplos de Logs de Erro
Possíveis mensagens nos logs:
- "ERRO ao transferir participantes para histórico: [mensagem de erro]"
- "ERRO ao deletar participantes ativos: [mensagem de erro]"
- "ERRO ao resetar estado congelado: [mensagem de erro]"

## 3. Permissões do Banco de Dados

### 3.1 Visão Geral
Todas as funções críticas agora têm permissões explícitas, garantindo que possam ser executadas pelos usuários apropriados.

### 3.2 Permissões Concedidas
- `GRANT EXECUTE ON FUNCTION public.reset_participantes_ativos() TO PUBLIC`
- `GRANT EXECUTE ON FUNCTION public.reset_apos_sorteio() TO PUBLIC`
- `GRANT EXECUTE ON FUNCTION public.verificar_limite_participacao(TEXT) TO PUBLIC`
- `GRANT EXECUTE ON FUNCTION public.verificar_rate_limit_trigger() TO PUBLIC`

### 3.3 Security Definer
Funções críticas usam `SECURITY DEFINER` para garantir que sejam executadas com privilégios elevados:
- `reset_participantes_ativos`
- `verificar_limite_participacao`
- `verificar_rate_limit_trigger`

## 4. Monitoramento de Segurança

### 4.1 Tabelas de Monitoramento
- **logs**: Registra operações do sistema e tentativas de abuso
- **atividades_suspeitas**: Armazena detalhes sobre comportamentos potencialmente maliciosos

### 4.2 O Que é Monitorado
- Tentativas de ignorar o rate limiting
- Múltiplas tentativas rápidas de participação
- Falhas nas funções críticas do sistema
- Atividades potencialmente maliciosas com sanitização de entrada

### 4.3 Consultas Úteis para Administradores
```sql
-- Verificar atividades suspeitas recentes
SELECT * FROM atividades_suspeitas ORDER BY data_hora DESC LIMIT 20;

-- Verificar logs de rate limiting
SELECT * FROM logs WHERE descricao LIKE 'Rate limit%' ORDER BY data_hora DESC LIMIT 20;

-- Identificar IPs com muitas tentativas bloqueadas
SELECT 
    split_part(descricao, ':', 2) as ip,
    COUNT(*) as tentativas
FROM logs 
WHERE descricao LIKE 'Rate limit excedido para:%' 
AND data_hora > NOW() - INTERVAL '24 hours'
GROUP BY ip
ORDER BY tentativas DESC;
```

## 5. Limpeza de Dados Históricos

### 5.1 Visão Geral
A função `reset_participantes_ativos` agora inclui limpeza automática de dados históricos com mais de 7 dias, conforme a intenção original do projeto.

### 5.2 Implementação
```sql
DELETE FROM historico_participantes 
WHERE created_at < NOW() - INTERVAL '7 days';
```

### 5.3 Registro de Limpeza
A limpeza é registrada nos logs do sistema:
```
"Dados históricos com mais de 7 dias foram limpos. Registros removidos: [quantidade]"
```

## 6. Configuração e Manutenção

### 6.1 Verificação de Funcionamento
Para verificar se as medidas de segurança estão funcionando corretamente:
```sql
-- Verificar se o trigger de rate limiting está ativo
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'trigger_rate_limit_otimizado';

-- Verificar se as funções de segurança existem
SELECT proname, prosecdef FROM pg_proc WHERE proname IN 
('verificar_limite_participacao', 'verificar_rate_limit_trigger');
```

### 6.2 Monitoramento de Uso de Recursos
É recomendável monitorar o crescimento da tabela de logs:
```sql
-- Contar logs de rate limiting 
SELECT COUNT(*) FROM logs WHERE descricao LIKE 'Participação:%' OR descricao LIKE 'Rate limit%';

-- Estimar espaço ocupado (aproximado)
SELECT pg_size_pretty(pg_total_relation_size('logs'));
```

### 6.3 Ajuste de Parâmetros (Se Necessário)
Para ajustar o intervalo mínimo entre participações:
1. Edite a função `verificar_limite_participacao` 
2. Modifique o valor de `intervalo_minimo` (atualmente definido como `INTERVAL '10 seconds'`)

---

## Nota Final
Estas medidas de segurança foram implementadas para proteger o sistema contra abusos enquanto mantêm um uso eficiente de recursos, garantindo compatibilidade com o plano gratuito do Supabase.

Para quaisquer questões ou ajustes adicionais, consulte a equipe de desenvolvimento. 