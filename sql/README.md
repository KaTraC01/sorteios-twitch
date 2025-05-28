# Arquivos SQL do Projeto de Sorteio

Esta pasta contém os scripts SQL utilizados para configuração, manutenção e correção do sistema de sorteio.

## Estrutura de Diretórios

A estrutura foi organizada para facilitar a manutenção:

- **`atual/`**: Contém os scripts atuais e funcionais do sistema
  - `manutencao_sistema.sql`: Script principal consolidado com todas as funções e triggers necessários
  
- **`historico/`**: Contém versões anteriores dos scripts (para referência)
  - Aqui ficam os scripts que foram substituídos pelo arquivo consolidado

- **`testes/`**: Contém scripts para testes, simulações e diagnósticos
  - Scripts para simular sorteios, testar funções ou diagnosticar problemas

## Como Usar

### Para manutenção do sistema

O arquivo principal para manutenção é `atual/manutencao_sistema.sql`. Este arquivo contém:

1. Funções para reset de participantes e histórico
2. Função para realizar sorteio automaticamente
3. Verificações e consultas de manutenção do sistema
4. Instruções para operações manuais

### Exemplos de Uso

Para executar um sorteio manual:
```sql
SELECT realizar_sorteio_automatico();
```

Para limpar a lista de participantes:
```sql
DELETE FROM participantes_ativos;
UPDATE configuracoes SET valor = 'false' WHERE chave = 'lista_congelada';
```

Para congelar a lista manualmente:
```sql
UPDATE configuracoes SET valor = 'true' WHERE chave = 'lista_congelada';
```

## Notas Importantes

- Sempre faça backup do banco de dados antes de executar scripts de manutenção
- Os scripts na pasta `historico/` são mantidos apenas para referência e não devem ser executados
- Os triggers e funções são criados automaticamente pelo script de manutenção...