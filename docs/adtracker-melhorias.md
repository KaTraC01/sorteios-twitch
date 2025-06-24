# Melhorias no Sistema de Rastreamento de Anúncios (AdTracker)

Este documento descreve as melhorias implementadas no sistema de rastreamento de anúncios para resolver o problema de perda de eventos ao fechar a página ou recarregá-la.

## Problema Resolvido

O principal problema resolvido foi a perda de eventos de anúncios quando o usuário fecha a aba ou recarrega a página. Mesmo com a implementação do `beforeunload` e `navigator.sendBeacon()`, alguns eventos ainda eram perdidos devido à falta de monitoramento detalhado.

## Melhorias Implementadas

### 1. Sistema Centralizado de Logs

Foi implementado um sistema centralizado de logs (`adTrackerLogs.js`) que:

- Registra todas as operações críticas (envios, falhas, recuperações)
- Persiste os logs no localStorage para análise posterior
- Permite diagnóstico detalhado mesmo após falhas
- Monitora a taxa de sucesso do sendBeacon
- Rastreia eventos que ficam muito tempo no buffer

### 2. Monitoramento Detalhado

- **Logs de eventos perdidos**: Registra detalhadamente quando e por que eventos não foram enviados
- **Monitoramento da taxa de sucesso do sendBeacon**: Registra cada tentativa e resultado
- **Rastreamento de eventos antigos no buffer**: Detecta eventos que ficam muito tempo sem serem enviados

### 3. Persistência de Dados

- **Timestamps em eventos**: Cada evento agora tem timestamp de criação e entrada no buffer
- **Backup automático**: Os eventos são salvos no localStorage antes de qualquer tentativa de envio
- **Recuperação inteligente**: Sistema recupera eventos pendentes ao iniciar

### 4. Diagnóstico e Depuração

- **Função de diagnóstico global**: `window.adTrackerDiagnostico()` fornece relatório detalhado
- **Estatísticas em tempo real**: Taxa de sucesso, erros frequentes, eventos pendentes
- **Detecção de eventos antigos**: Alerta sobre eventos que ficam muito tempo no buffer

### 5. Otimização de Payload (Nova)

- **Redução de tamanho**: Abreviação de nomes de campos para reduzir o tamanho do payload
- **Extração de dados comuns**: Dados repetitivos são enviados apenas uma vez no nível superior
- **Monitoramento de tamanho**: Registro do tamanho original vs. otimizado para análise de eficiência

### 6. Priorização de Eventos (Nova)

- **Ordenação inteligente**: Eventos mais valiosos (cliques) são enviados primeiro
- **Priorização por tempo de exposição**: Eventos com maior tempo de exposição têm prioridade
- **Priorização por recência**: Eventos mais recentes têm prioridade sobre os mais antigos

### 7. Detecção de Visibilidade da Página (Nova)

- **Monitoramento de visibilidade**: Detecta quando a página fica oculta (troca de aba)
- **Envio proativo**: Envia eventos pendentes quando a página fica oculta
- **Verificação de eventos antigos**: Verifica eventos antigos quando a página volta a ficar visível

### 8. Envio em Lotes Otimizados (Nova)

- **Divisão em lotes menores**: Eventos são divididos em lotes menores durante o fechamento da página
- **Monitoramento de lotes**: Registra estatísticas sobre a divisão e envio de lotes
- **Aumento da taxa de sucesso**: Lotes menores têm maior chance de serem enviados com sucesso

## Como Usar

### Diagnóstico

Para executar um diagnóstico completo do sistema, abra o console do navegador e execute:

```javascript
window.adTrackerDiagnostico()
```

Isso exibirá:
- Estatísticas de logs (por tipo)
- Taxa de sucesso do sendBeacon
- Eventos pendentes e sua idade
- Erros frequentes
- Buffer atual
- Estatísticas de otimização de payload
- Estatísticas de divisão em lotes
- Estatísticas de mudanças de visibilidade

### Limpeza de Logs

Para limpar os logs armazenados:

```javascript
window.limparLogsAdTracker()
```

### Visualização de Eventos Pendentes

Para ver os eventos pendentes no buffer:

```javascript
window.verEventosAdTracker()
```

## Funcionamento Técnico

1. Quando um evento é registrado, ele é adicionado ao buffer e recebe um timestamp
2. O sistema tenta enviar eventos quando:
   - O buffer atinge um limite de tamanho (5 eventos)
   - Um timeout expira (10 segundos)
   - A página está sendo fechada (evento beforeunload)
   - A página fica oculta (evento visibilitychange)
   - Eventos antigos são detectados (verificação a cada 2 minutos)

3. Ao fechar a página:
   - Os eventos são priorizados (cliques primeiro, maior tempo de exposição, mais recentes)
   - Os eventos são divididos em lotes menores (10 eventos por lote)
   - O payload é otimizado (campos abreviados, dados comuns extraídos)
   - Os eventos são salvos no localStorage
   - Os logs são persistidos para análise futura
   - O `navigator.sendBeacon()` tenta enviar os lotes em background

4. Na próxima visita:
   - O sistema recupera eventos pendentes do localStorage
   - Tenta enviá-los imediatamente
   - Registra estatísticas sobre a recuperação

## Benefícios

- **Menos perda de dados**: Múltiplas camadas de proteção contra perda de eventos
- **Diagnóstico preciso**: Capacidade de identificar exatamente onde e por que ocorrem falhas
- **Monitoramento proativo**: Detecção automática de problemas (eventos antigos, falhas recorrentes)
- **Análise pós-falha**: Logs persistentes permitem analisar o que aconteceu mesmo após erros
- **Maior eficiência**: Payload reduzido e otimizado diminui o consumo de banda e aumenta a taxa de sucesso
- **Priorização inteligente**: Eventos mais importantes são enviados primeiro
- **Detecção de visibilidade**: Aproveitamento de momentos em que o usuário não está interagindo com a página

## Próximos Passos Recomendados

1. **Sincronização entre abas**: Permitir que uma aba envie eventos de outra que falhou
2. **Endpoint de fallback**: Criar um endpoint secundário para casos em que o principal falhe
3. **Retry com backoff exponencial**: Implementar tentativas com intervalos crescentes 
4. **Interface visual para logs**: Criar uma interface amigável para visualização dos logs
5. **Compressão avançada**: Implementar algoritmos de compressão para payloads muito grandes 