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
   - Eventos antigos são detectados (verificação a cada 2 minutos)

3. Ao fechar a página:
   - Os eventos são salvos no localStorage
   - Os logs são persistidos para análise futura
   - O `navigator.sendBeacon()` tenta enviar os eventos em background

4. Na próxima visita:
   - O sistema recupera eventos pendentes do localStorage
   - Tenta enviá-los imediatamente
   - Registra estatísticas sobre a recuperação

## Benefícios

- **Menos perda de dados**: Múltiplas camadas de proteção contra perda de eventos
- **Diagnóstico preciso**: Capacidade de identificar exatamente onde e por que ocorrem falhas
- **Monitoramento proativo**: Detecção automática de problemas (eventos antigos, falhas recorrentes)
- **Análise pós-falha**: Logs persistentes permitem analisar o que aconteceu mesmo após erros

## Próximos Passos Recomendados

1. **Implementar compressão de dados**: Reduzir o tamanho do payload enviado
2. **Sincronização entre abas**: Permitir que uma aba envie eventos de outra que falhou
3. **Endpoint de fallback**: Criar um endpoint secundário para casos em que o principal falhe
4. **Retry com backoff exponencial**: Implementar tentativas com intervalos crescentes 