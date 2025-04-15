# Instruções para Restauração do Projeto

Este documento contém as instruções para restaurar o sistema de sorteio ao estado original antes das alterações feitas hoje.

## Método 1: Restauração Padrão

Execute os seguintes scripts SQL no Supabase, na ordem indicada:

1. **Restaurar o estado original das funções e triggers**:
   ```sql
   -- Execute o arquivo sql/restauracao/reverter_para_estado_original.sql
   ```
   
   Este script irá:
   - Remover todos os triggers existentes na tabela `participantes_ativos`
   - Remover todas as versões modificadas das funções usando CASCADE para eliminar dependências
   - Recriar a função `verificar_limite_participacao` original
   - Recriar o trigger `check_rate_limit` original
   - Conceder as permissões necessárias

   > **Nota sobre erros de dependência**: Se encontrar erros como "cannot drop function ... because other objects depend on it", o script atualizado já está preparado para lidar com isso usando a opção CASCADE e removendo explicitamente triggers conhecidos.

2. **Restaurar a função para adicionar participantes em lote**:
   ```sql
   -- Execute o arquivo sql/restauracao/inserir_participantes_lote_original.sql
   ```
   
   Este script irá:
   - Criar a função `inserir_participantes_lote` original
   - Configurar as permissões necessárias

## Método 2: Restauração Simplificada (Use caso o Método 1 falhe)

Se o método padrão continuar apresentando erros, use o script de restauração simplificada:

```sql
-- Execute o arquivo sql/restauracao/restauracao_simplificada.sql
```

Este script:
- Desativa todos os triggers antes de removê-los
- Utiliza blocos DO com tratamento de exceções para cada operação
- Remove cada função em operações separadas com CASCADE
- Recria todas as funções e triggers necessários
- Registra cada passo nos logs para diagnóstico

É uma abordagem mais robusta para lidar com configurações complexas ou problemas inesperados.

## Passo 3: Restaurar o Código React

1. **Restaurar o componente ListaSorteio**:
   - O arquivo `src/components/ListaSorteio/index.js` já foi atualizado com a versão original da função `adicionarDezParticipantes`
   - Certifique-se de que a função está usando `supabase.rpc('inserir_participantes_lote',...)` como no código original

## Passo 4: Verificar a Restauração

Após executar os passos acima, realize os seguintes testes para verificar se tudo foi restaurado corretamente:

1. **Verificar as funções no banco de dados**:
   ```sql
   SELECT 
       n.nspname as schema, 
       p.proname as nome_funcao,
       pg_catalog.pg_get_function_arguments(p.oid) as argumentos
   FROM pg_proc p 
   JOIN pg_namespace n ON p.pronamespace = n.oid
   WHERE p.proname IN ('verificar_limite_participacao', 'inserir_participantes_lote', 'verificar_rate_limit_trigger')
   ORDER BY p.proname;
   ```

2. **Verificar os triggers**:
   ```sql
   SELECT 
       tgname as nome_trigger,
       proname as funcao_associada
   FROM pg_trigger t
   JOIN pg_proc p ON t.tgfoid = p.oid
   WHERE tgrelid = 'participantes_ativos'::regclass;
   ```

3. **Testar o botão "Confirmar"** para adicionar um único participante
4. **Testar o botão "+10"** para adicionar vários participantes de uma vez

## Solução de Problemas Comuns

### Erro: "cannot drop function ... because other objects depend on it"
Se você ainda encontrar este erro, execute manualmente o comando:
```sql
-- Primeiro, liste todos os triggers na tabela
SELECT tgname FROM pg_trigger WHERE tgrelid = 'participantes_ativos'::regclass;

-- Remova cada trigger encontrado
DROP TRIGGER nome_do_trigger ON participantes_ativos;

-- Depois remova as funções com CASCADE
DROP FUNCTION verificar_rate_limit_trigger() CASCADE;
```

### Erro: "function ... does not exist"
Se este erro ocorrer ao tentar remover uma função, simplesmente ignore e continue com o resto do script.

### Erro: "permission denied"
Se ocorrerem erros de permissão, pode ser necessário executar os comandos como um usuário com privilégios administrativos no Supabase.

## Verificação de Logs

Após a restauração, verifique os logs para diagnóstico:

```sql
SELECT descricao, data_hora 
FROM logs 
ORDER BY data_hora DESC 
LIMIT 50;
```

Isto mostrará as últimas 50 entradas de log, que podem ajudar a identificar qualquer problema durante a restauração.

## Observações

- Se encontrar erros durante a restauração, verifique as mensagens de erro para identificar o problema.
- Caso ocorram erros de permissão no Supabase, pode ser necessário executar os scripts como administrador.
- Os logs das operações estão sendo salvos na tabela `logs` para diagnóstico.

## Restaurando Arquivos Removidos

Se algum arquivo foi removido durante as alterações, você pode recriá-los a partir dos backups ou do histórico de versões. 