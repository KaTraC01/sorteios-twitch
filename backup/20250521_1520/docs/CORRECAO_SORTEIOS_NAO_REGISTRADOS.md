# Correção para Problema de Sorteios Não Registrados

Após análise do código e do banco de dados, identifiquei um problema onde sorteios posteriores a 12/03/2025 não estão sendo registrados na tabela `sorteios`. Existem várias possíveis causas e soluções.

## Diagnosticando o Problema

### Possíveis Causas:
1. **Falha no Cron Job**: O cron job configurado no Vercel pode não estar sendo executado nos horários corretos.
2. **Problemas de Autorização**: A API_SECRET_KEY pode estar inválida, impedindo que o cron job chame a API de sorteio.
3. **Erros no Processamento da API**: Pode haver erros não tratados no processamento da requisição de sorteio.
4. **Problemas de Permissão no Banco**: A função serverless pode não ter permissões suficientes para inserir na tabela `sorteios`.
5. **Conflito entre Componente Web e API**: Tanto o componente ListaSorteio quanto a API tentam realizar o sorteio, podendo causar conflitos.

## Soluções para Implementar

### 1. Executar o Diagnóstico
Primeiro, execute o script SQL de diagnóstico `diagnostico_sorteio.sql` no SQL Editor do Supabase. Isso vai:
- Verificar o estado atual das tabelas
- Recriar o trigger que reseta a lista de participantes
- Verificar permissões nas tabelas

### 2. Corrigir o Componente ListaSorteio
O componente atual tenta realizar o sorteio diretamente na interface, o que pode conflitar com o processamento do cron job. Vamos modificar para que ele apenas exiba o resultado, não tente criar o sorteio:

```javascript
// Modificar o componente para verificar o sorteio, não criá-lo
const verificarSorteio = async () => {
    // Em vez de realizar o sorteio, apenas verificar se foi realizado
    const { data: ultimoSorteio, error } = await supabase
        .from("sorteios")
        .select("*")
        .order("data", { ascending: false })
        .limit(1);
    
    if (error) {
        console.error("Erro ao verificar sorteio:", error);
        return;
    }

    if (ultimoSorteio && ultimoSorteio.length > 0) {
        const sorteio = ultimoSorteio[0];
        const dataAtual = new Date();
        const dataSorteio = new Date(sorteio.data);
        
        // Verificar se o sorteio é de hoje
        if (dataSorteio.toDateString() === dataAtual.toDateString()) {
            // Atualizar interface com dados do sorteio
            setUltimoVencedor({
                nome: sorteio.nome,
                streamer: sorteio.streamer,
                numero: sorteio.numero,
                data: new Date(sorteio.data).toLocaleDateString('pt-BR')
            });
            setSorteioRealizado(true);
        }
    }
};
```

### 3. Verificar Configuração do Cron Job no Vercel
O cron job deve estar configurado corretamente no Vercel:

1. Acesse o painel do Vercel
2. Verifique nas configurações de "Cron Jobs"
3. Confirme que existe uma entrada para o endpoint `/api/cron` com expressão cron `0 20,21 * * *` 
4. Verifique se a variável de ambiente `CRON_SECRET` está configurada corretamente

### 4. Inspecionar os Logs do Vercel
Os logs do Vercel podem fornecer informações valiosas sobre erros:

1. Acesse o dashboard do Vercel
2. Vá para "Functions" ou "Logs"
3. Filtre pelos logs recentes do endpoint `/api/cron` e `/api/sorteio`
4. Procure por mensagens de erro que indiquem falhas na execução

### 5. Implementar Log Detalhado
Adicione um sistema de log mais detalhado para identificar onde exatamente está ocorrendo a falha:

1. Crie uma nova tabela de logs no Supabase:
```sql
CREATE TABLE IF NOT EXISTS logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  origem VARCHAR(100),
  mensagem TEXT,
  dados JSONB
);
```

2. Modifique a API para registrar logs em pontos críticos:
```javascript
// Adicionar no api/sorteio.js
async function registrarLog(origem, mensagem, dados = {}) {
  try {
    await supabase.from("logs").insert([{ origem, mensagem, dados }]);
  } catch (error) {
    console.error("Erro ao registrar log:", error);
  }
}

// Usar em pontos críticos:
await registrarLog("API_SORTEIO", "Sorteio iniciado", { action: "sorteio" });
// ... código do sorteio ...
await registrarLog("API_SORTEIO", "Sorteio concluído", { vencedor: vencedor.nome_twitch });
```

### 6. Solução Imediata - Corrigir Manualmente
Para garantir que os sorteios voltem a funcionar imediatamente:

1. Execute o script `diagnostico_sorteio.sql`
2. Remova a linha de comentário da seção 6 para testar a inserção manual
3. Verifique se o registro foi criado com sucesso
4. Monitore o próximo sorteio agendado para confirmar o funcionamento

## Depois de Aplicar as Correções

1. Monitore os logs por pelo menos 3 dias
2. Verifique se novos sorteios estão sendo registrados corretamente
3. Confirme que o trigger está funcionando limpando a lista após os sorteios

## Contato para Suporte

Se o problema persistir após aplicar essas correções, será necessário uma análise mais profunda da infraestrutura e do código. Entre em contato para assistência adicional. 