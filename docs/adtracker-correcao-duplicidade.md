# Correção de Duplicidade de Eventos no AdTracker

Este documento descreve as alterações implementadas para resolver o problema de duplicidade de eventos no sistema de rastreamento de anúncios (AdTracker).

## Problema Resolvido

O sistema estava registrando eventos duplicados em duas situações principais:

1. **Navegação entre páginas**: Eventos eram registrados mais de uma vez quando o usuário navegava entre páginas do site
2. **Fechamento da página**: Eventos eram duplicados quando a página era fechada ou recarregada

## Causa Raiz

Após análise detalhada, identificamos as seguintes causas para a duplicidade:

1. **Falta de identificadores únicos**: Os eventos não possuíam IDs exclusivos para detecção de duplicatas
2. **Múltiplos gatilhos**: Eventos semelhantes eram gerados por diferentes gatilhos (desmontagem, saída da área visível, fechamento da página)
3. **Buffer compartilhado**: O buffer de eventos era compartilhado entre todas as instâncias do componente
4. **Falta de verificação no servidor**: A API não verificava se eventos já haviam sido processados anteriormente

## Solução Implementada

### 1. Sistema de IDs Únicos para Eventos

- **Geração de IDs**: Cada evento agora recebe um ID único baseado em seus atributos e timestamp
- **Persistência de IDs**: IDs de eventos processados são armazenados em um Set e no localStorage
- **Verificação de duplicidade**: Eventos são verificados contra IDs já processados antes de qualquer operação

```javascript
// Função para gerar ID único para evento
const generateEventId = (eventData) => {
  const { anuncio_id, tipo_anuncio, tipo_evento, pagina, tempo_exposto } = eventData;
  const timestamp = new Date().getTime();
  return `${anuncio_id}_${tipo_anuncio}_${tipo_evento}_${pagina}_${Math.round(tempo_exposto * 100)}_${timestamp}`;
};
```

### 2. Deduplicação em Três Camadas

1. **Cliente - Registro**: Verificação antes de adicionar ao buffer
   ```javascript
   if (processedEventIds.has(eventId)) {
     console.log(`Evento duplicado detectado e ignorado: ${eventId}`);
     return false;
   }
   ```

2. **Cliente - Envio**: Filtro antes de enviar para o servidor
   ```javascript
   const eventsToSend = eventsBuffer.filter(event => {
     return !event.event_id || !processedEventIds.has(event.event_id);
   });
   ```

3. **Servidor - Inserção**: Verificação no banco de dados
   ```javascript
   // Consultar eventos existentes com os mesmos IDs
   const { data: eventosExistentes } = await supabase
     .from('eventos_anuncios')
     .select('event_id')
     .in('event_id', eventIds);
   
   // Filtrar apenas eventos que não existem no banco
   eventosUnicos = eventosExpandidos.filter(evento => 
     !evento.event_id || !idsExistentes.has(evento.event_id)
   );
   ```

### 3. Otimização do Payload

- O ID do evento foi adicionado ao payload otimizado como `e_id`
- Isso permite que o servidor verifique duplicidades mesmo com nomes de campos abreviados

```javascript
const eventosOtimizados = eventos.map(evento => {
  return {
    // ... outros campos
    e_id: evento.event_id, // event_id (novo)
    // ... outros campos
  };
});
```

### 4. Monitoramento de Duplicidade

- Novo tipo de log `EVENT_DUPLICATE` para rastrear eventos duplicados
- Estatísticas sobre eventos duplicados nas respostas da API
- Logs detalhados no console para facilitar depuração

## Como Funciona

1. Quando um evento é criado, um ID único é gerado baseado em seus atributos
2. O ID é verificado contra um Set de IDs já processados
3. Se for duplicado, o evento é ignorado e registrado nos logs
4. Se for único, o evento é adicionado ao buffer e o ID é armazenado
5. Antes de enviar para o servidor, eventos são filtrados novamente
6. O servidor verifica se algum evento já existe no banco de dados
7. Apenas eventos realmente novos são inseridos

## Benefícios

- **Eliminação de duplicidade**: Eventos são registrados apenas uma vez, mesmo em caso de navegação ou fechamento da página
- **Economia de recursos**: Menos processamento e armazenamento no servidor
- **Dados mais precisos**: Estatísticas de visualização e cliques mais confiáveis
- **Diagnóstico melhorado**: Logs detalhados sobre eventos duplicados para análise

## Próximos Passos Recomendados

1. **Monitoramento**: Acompanhar os logs para verificar se a solução está funcionando corretamente
2. **Interface de diagnóstico**: Criar uma interface para visualizar estatísticas de duplicidade
3. **Purga periódica**: Implementar limpeza periódica de IDs muito antigos para evitar crescimento excessivo
4. **Sincronização entre dispositivos**: Considerar sincronização de IDs processados entre dispositivos do mesmo usuário

## Como Verificar o Funcionamento

Para verificar se a solução está funcionando corretamente, você pode:

1. Abrir o console do navegador e observar os logs do AdTracker
2. Verificar se há mensagens de "Evento duplicado detectado e ignorado"
3. Navegar entre páginas e verificar se eventos não são duplicados
4. Fechar e reabrir a página para verificar se eventos não são duplicados
5. Executar a função de diagnóstico: `window.diagnosticarDuplicidadeAdTracker()`

A solução implementada deve eliminar completamente o problema de duplicidade de eventos no AdTracker.
