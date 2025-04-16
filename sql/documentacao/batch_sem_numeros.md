# Sistema de Inserção em Lote Sem Números

## Visão Geral

O sistema foi atualizado para permitir a inserção de múltiplas participações do mesmo usuário sem adicionar números sequenciais ao nome. Agora, quando um usuário utiliza o botão "+10", todas as participações são registradas com o nome exatamente como ele digitou.

## Como Funciona

### Mecanismo de Autorização de Lote

1. **Registro de Lote Autorizado**: Quando um usuário solicita a adição de múltiplas participações, o sistema cria uma entrada nos logs marcando isso como um "lote autorizado".

2. **Exceção ao Rate Limiting**: O trigger de verificação de rate limiting foi modificado para identificar quando uma inserção faz parte de um lote autorizado, permitindo várias inserções sequenciais do mesmo nome.

3. **Controle de Intervalo Entre Lotes**: Para evitar abusos, existe um intervalo obrigatório de 30 segundos entre operações de lote do mesmo usuário.

### Funções Principais

- `verificar_limite_lote`: Verifica se um usuário pode realizar um lote de inserções, considerando o intervalo mínimo entre lotes.

- `inserir_participantes_sem_numero`: A nova função RPC que insere várias participações com o mesmo nome, sem sufixos numéricos.

- `verificar_rate_limit_trigger`: Função de trigger que foi atualizada para permitir inserções de lote autorizadas.

## Limitações e Regras

1. **Máximo de 10 inserções por lote**: Cada operação de lote pode inserir no máximo 10 participações.

2. **Intervalo entre lotes**: Após usar o botão "+10", o usuário deve aguardar 30 segundos antes de poder usar novamente.

3. **Sem limite total**: Não há limite para o número total de participações que um usuário pode ter na lista, desde que respeite o intervalo entre lotes.

## Implementação Técnica

O sistema utiliza a tabela de logs para rastrear operações de lote e determinar quando uma inserção deve ser permitida. O padrão de nomenclatura para entradas de log é:

- `Lote autorizado: {nome} - iniciando {quantidade} inserções`: Marca o início de um lote autorizado
- `Conclusão do lote: {nome} - inseridos {inseridos}/{quantidade}`: Registra a conclusão do lote

O trigger de rate limiting verifica essas entradas de log para identificar inserções que fazem parte de lotes autorizados e permite que prossigam sem verificar o intervalo mínimo entre inserções individuais.

## Método Fallback

Se a função RPC falhar por qualquer motivo, o sistema utiliza um método fallback que:

1. Insere manualmente as participações, uma por uma
2. Ainda mantém o nome original sem adicionar números
3. Adiciona entradas no log para garantir que o trigger de rate limiting não bloqueie as inserções

## Monitoramento

Para monitorar o funcionamento do sistema, verifique as entradas na tabela `logs` relacionadas a lotes:

```sql
SELECT * FROM logs 
WHERE descricao LIKE 'Lote autorizado:%' 
OR descricao LIKE 'Conclusão do lote:%'
ORDER BY data_hora DESC;
``` 