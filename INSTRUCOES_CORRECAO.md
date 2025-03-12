# Instruções para Corrigir Problemas com o Sorteio

Identificamos dois problemas principais:

1. O sorteio das 21h foi realizado, mas não foi armazenado corretamente na tabela de ganhadores
2. A lista de participantes não foi reiniciada após o sorteio

## Solução Imediata

### 1. Execute o Script SQL para Corrigir o Banco de Dados

1. Acesse o painel do Supabase
2. Navegue até o SQL Editor
3. Cole o conteúdo do arquivo `fix_sorteio_issues.sql` e execute

Este script irá:
- Recriar o trigger que limpa a tabela de participantes após um sorteio
- Limpar manualmente a tabela de participantes ativos
- Resetar a configuração de lista congelada
- Garantir que o último sorteio tenha participantes no histórico

### 2. Atualize o Código do Componente ListaSorteio

O arquivo `src/components/ListaSorteio/index.js` foi modificado para:
- Adicionar atualizações periódicas dos dados (a cada 30 segundos)
- Verificar o último vencedor a cada 2 minutos
- Forçar a atualização dos dados após resetar a lista
- Melhorar a lógica de verificação de horário para resetar a lista

### 3. Teste o Cron Job Manualmente (Opcional)

Se quiser testar o cron job manualmente:
1. Instale o node-fetch: `npm install node-fetch@2`
2. Configure a variável de ambiente API_SECRET_KEY com sua chave secreta
3. Execute o script: `node fix_cron_job.js`

## Prevenção de Problemas Futuros

Para evitar que esses problemas ocorram novamente:

1. **Monitoramento**: Verifique regularmente os logs do Vercel para garantir que o cron job está sendo executado corretamente.

2. **Backup Manual**: Após cada sorteio, verifique se:
   - O vencedor foi registrado na tabela `sorteios`
   - Os participantes foram salvos na tabela `historico_participantes`
   - A tabela `participantes_ativos` foi limpa
   - A configuração `lista_congelada` foi resetada para `false`

3. **Teste Regular**: Faça testes periódicos do processo de sorteio para garantir que tudo está funcionando corretamente.

## Explicação Técnica do Problema

O problema ocorreu porque:

1. O trigger `trigger_reset_participantes_ativos` não estava salvando os participantes no histórico antes de limpar a tabela.
2. A configuração `lista_congelada` não estava sendo resetada após o sorteio.
3. O componente ListaSorteio não estava atualizando os dados com frequência suficiente.

As correções implementadas garantem que:
- Os participantes sejam salvos no histórico antes de serem removidos
- A lista seja limpa corretamente após o sorteio
- O componente atualize os dados regularmente
- O último vencedor seja sempre exibido corretamente 