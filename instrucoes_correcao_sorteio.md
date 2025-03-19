# Instruções para Corrigir o Sorteio Automático

## Problema Identificado
O problema principal é que o sorteio não está sendo realizado automaticamente no horário programado (21h). Isso causa todos os outros problemas (lista não resetada, vencedor não mostrado, etc).

## Solução Completa em 3 Passos

### Passo 1: Corrigir a Função de Sorteio Automático no Banco de Dados

1. Acesse o painel do Supabase
2. Navegue até a seção "SQL Editor"
3. Crie uma nova consulta
4. Cole todo o conteúdo do arquivo `corrigir_sorteio_automatico.sql`
5. Clique em "Executar"

Este script:
- Recria a função responsável pelo sorteio automático
- Corrige o trigger que limpa a lista após o sorteio
- Garante que os participantes sejam salvos no histórico

### Passo 2: Adicionar o Componente de Verificação ao Frontend

1. Crie um novo arquivo `componente_verificacao_sorteio.jsx` na pasta de componentes
2. Cole todo o conteúdo fornecido
3. Importe e use este componente no arquivo principal da sua aplicação (exemplo: `pages/_app.jsx`)

```jsx
// Em _app.jsx ou App.jsx
import VerificacaoSorteio from '../components/componente_verificacao_sorteio';

function MeuApp({ Component, pageProps }) {
  return (
    <>
      <VerificacaoSorteio />
      <Component {...pageProps} />
    </>
  );
}

export default MeuApp;
```

Este componente:
- Verifica a cada 5 minutos se é hora de realizar o sorteio
- Chama a função no banco de dados que executa o sorteio às 21h
- Funciona em segundo plano sem interferir na interface

### Passo 3: Teste e Verificação

Depois de aplicar as correções:

1. **Reinicie a aplicação**:
   ```
   npm run dev
   ```

2. **Verifique se o componente está funcionando**:
   - Abra o console do navegador (F12)
   - Deve aparecer mensagens de log a cada 5 minutos
   - Se estiver próximo das 21h, aguarde para ver se o sorteio é realizado

3. **Monitore o banco de dados**:
   - Acesse a tabela de logs no Supabase para verificar se as verificações estão sendo registradas
   - Às 21h, deve aparecer um log indicando que o sorteio foi realizado

## Explicação Técnica

O problema estava em duas partes:

1. **No banco de dados**: A função `verificar_e_realizar_sorteio()` tinha problemas na lógica de verificação do horário e no processo de sorteio.

2. **No frontend**: Não havia um componente executando a verificação regularmente ou estava configurado incorretamente.

Agora, o sistema usa um intervalo de 5 minutos para verificar constantemente se é hora de fazer o sorteio, e a função no banco de dados foi otimizada para garantir que o sorteio aconteça corretamente às 21h.

Se precisar de mais ajuda, entre em contato! 