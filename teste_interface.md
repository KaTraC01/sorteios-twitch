# Guia para Testar a Interface Web

Este guia descreve como testar a interface web do sistema de sorteio após aplicar as correções, sem precisar esperar pelo horário programado.

## Preparação

1. Primeiro, execute o script SQL `teste_sorteio_manual.sql` no Supabase para simular um sorteio completo.
2. Acesse o site em produção: https://sorteios-twitch.vercel.app/

## Testes a Realizar

### 1. Verificar a Lista de Participantes

- Acesse a página inicial
- Verifique se a lista de participantes está vazia (após o script de teste, ela deve estar vazia)
- Tente adicionar um novo participante para confirmar que o formulário está funcionando

### 2. Verificar o Último Vencedor

- Na página inicial, verifique se o último vencedor está sendo exibido corretamente
- Os dados devem corresponder ao sorteio que acabamos de simular com o script SQL

### 3. Verificar a Página de Ganhadores

- Clique no botão "Ganhadores" na barra de navegação
- Verifique se o histórico de sorteios está sendo exibido corretamente
- Clique em "Ver Lista" para um sorteio anterior e confirme que os participantes daquele sorteio são exibidos

### 4. Testar a Atualização Automática

- Volte para o SQL Editor do Supabase
- Execute o seguinte comando para adicionar um participante:
  ```sql
  INSERT INTO participantes_ativos (nome_twitch, streamer_escolhido)
  VALUES ('participante_teste_web', 'streamer_teste_web');
  ```
- Volte para a página inicial do site
- Aguarde até 30 segundos (o tempo configurado para atualização automática)
- Verifique se o novo participante aparece na lista sem precisar recarregar a página

### 5. Testar o Estado da Lista Congelada

- No SQL Editor, execute:
  ```sql
  UPDATE configuracoes 
  SET valor = 'true', atualizado_em = NOW() 
  WHERE chave = 'lista_congelada';
  ```
- Volte para a página inicial e aguarde a atualização automática
- Verifique se a interface mostra que a lista está congelada
- Tente adicionar um novo participante e confirme que não é possível

## Verificação Final

Se todos os testes acima funcionarem corretamente, significa que:

1. O trigger de reset está funcionando corretamente
2. A interface web está atualizando os dados corretamente
3. O histórico de participantes está sendo salvo
4. O sistema de congelamento da lista está funcionando

Isso confirma que as correções aplicadas resolveram os problemas identificados. 