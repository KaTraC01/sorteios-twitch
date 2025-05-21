# Instruções para Corrigir o Sistema de Sorteios

Este guia contém instruções detalhadas para corrigir o problema dos sorteios não estarem sendo registrados após 12/03/2025.

## Diagnóstico do Problema

O principal problema é que existem dois componentes tentando criar sorteios simultaneamente:
1. O **cron job** que roda no servidor (Vercel)
2. O **componente ListaSorteio** na interface web

Isso cria um conflito e pode estar impedindo o registro correto dos sorteios.

## Passo a Passo para Correção

### 1. Execute o SQL de Diagnóstico e Correção

1. **Acesse o Supabase**:
   - Faça login no Supabase
   - Vá para o SQL Editor (menu lateral esquerdo)

2. **Crie uma nova query**:
   - Clique em "New Query"
   - Cole o conteúdo do arquivo `diagnostico_sorteio_corrigido.sql`
   - Clique em "Run" para executar o script

3. **Verifique os resultados**:
   - O script vai mostrar informações sobre o estado do sistema
   - Vai recriar o trigger que reseta a lista de participantes após sorteios
   - Confirme que não há erros na execução

### 2. Modifique o Componente ListaSorteio

1. **Abra o arquivo para edição**:
   - Navegue até `src/components/ListaSorteio/index.js`
   - Faça um backup do arquivo original (se ainda não tiver um)

2. **Substitua o código**:
   - O arquivo já foi modificado para você
   - As principais alterações foram:
     - A função `realizarSorteio()` foi substituída por `verificarSorteio()`
     - A função `resetarLista()` foi substituída por `verificarResetLista()`
     - O componente agora apenas verifica e exibe o resultado, não tenta criar sorteios

3. **O que mudou**:
   - O componente web não tenta mais criar sorteios diretamente
   - Ele apenas verifica se o cron job criou um sorteio e atualiza a interface
   - Isso evita conflitos entre o componente e o cron job

### 3. Teste Manualmente o Sistema

1. **Execute um teste manual de sorteio**:
   - No SQL Editor do Supabase, crie uma nova query
   - Cole o conteúdo do arquivo `teste_sorteio_manual.sql`
   - Clique em "Run" para executar o script

2. **Verifique os resultados**:
   - O script vai:
     - Verificar o estado atual do sistema
     - Inserir um sorteio de teste manualmente
     - Verificar se o trigger funcionou corretamente
   - Confirme que:
     - A tabela de participantes ativos foi limpa
     - Os participantes foram movidos para o histórico
     - A configuração de lista congelada foi resetada

### 4. Verifique as Configurações do Cron Job no Vercel

1. **Acesse o painel do Vercel**:
   - Faça login em https://vercel.com
   - Selecione seu projeto

2. **Verifique as configurações de Cron Jobs**:
   - Vá para as configurações do projeto
   - Procure por "Cron Jobs" ou "Scheduled Functions"
   - Confirme que existe um job configurado para `/api/cron`
   - Garanta que a expressão cron seja adequada (ex: `0 20,21 * * *`)

3. **Verifique as variáveis de ambiente**:
   - Certifique-se de que `CRON_SECRET` e `API_SECRET_KEY` estão configuradas corretamente

### 5. Faça o Deploy das Alterações

1. **Commit e push das alterações**:
   ```bash
   git add src/components/ListaSorteio/index.js
   git commit -m "Corrigir problema de registro de sorteios - remover conflito"
   git push
   ```

2. **Verifique o deploy no Vercel**:
   - Monitore o deploy no painel do Vercel
   - Certifique-se de que a compilação foi bem-sucedida

### 6. Monitoramento Pós-Correção

1. **Monitore os sorteios nos próximos dias**:
   - Verifique se novos sorteios estão sendo registrados corretamente
   - Confirme que a página de ganhadores mostra o último vencedor
   - Verifique se a lista de participantes está sendo resetada corretamente

2. **Em caso de problemas persistentes**:
   - Execute novamente o script de diagnóstico
   - Verifique os logs do Vercel em busca de erros
   - Considere adicionar mais logs de diagnóstico no sistema

## Conclusão

Após essas correções, o sistema deve funcionar corretamente. O componente da interface não tentará mais criar sorteios diretamente, deixando essa responsabilidade exclusivamente para o cron job automatizado. Isso elimina conflitos e garante que os sorteios sejam registrados corretamente. 