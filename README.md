Site de Sorteios - Twitch
===================

![Status](https://img.shields.io/badge/status-online-brightgreen) ![Vercel](https://img.shields.io/badge/vercel-deployed-blue)

Este é um site de sorteios dinâmico, inspirado na Twitch, onde usuários podem cadastrar suas participações, acompanhar vencedores anteriores e interagir de forma transparente. O sistema é baseado em React.js, utilizando Supabase para armazenamento e gerenciamento de dados, além de ser hospedado na Vercel para um desempenho otimizado.

 Visão Geral do Projeto
O projeto tem como objetivo oferecer uma plataforma confiável e interativa para sorteios de subs na Twitch. O sistema permite que os usuários participem facilmente, enquanto os administradores podem gerenciar os sorteios e exibir um histórico detalhado dos vencedores.

Aqui estão os principais recursos do projeto:

 Interface Responsiva com Design Inspirado na Twitch
O site foi desenvolvido com um layout visualmente semelhante ao da Twitch, proporcionando uma experiência familiar para os usuários.

Paleta de cores baseada na Twitch.
Tipografia e botões seguindo o estilo da plataforma.
Elementos interativos para garantir facilidade de uso em computadores e dispositivos móveis.
Botão "Como Participar" com instruções detalhadas.
 Lista de Participantes Dinâmica com Supabase
A lista de participantes é armazenada e gerenciada no Supabase, garantindo que todos os inscritos no sorteio sejam registrados corretamente.

Os usuários podem adicionar seu nome e o streamer que desejam apoiar.
A lista é carregada automaticamente na página sem necessidade de recarregar.
Validação automática para impedir duplicatas e garantir integridade.
 Atualização em Tempo Real dos Participantes
A aplicação está integrada ao Supabase Realtime, o que significa que:

Quando um novo usuário se cadastra, ele aparece automaticamente na lista.
Nenhum recarregamento manual é necessário para ver as atualizações.
 Sistema de Sorteio Automático com Validação de Horários
O sorteio ocorre de maneira automática e transparente com base em horários pré-definidos:

O sistema seleciona um vencedor aleatoriamente entre os participantes cadastrados.
O sorteio ocorre sempre às 21h (UTC-3) e a lista é congelada 10 minutos antes.
O nome do ganhador, o número sorteado e o streamer escolhido são armazenados no banco de dados.
 Bloqueio Automático da Lista Antes do Sorteio
Para evitar mudanças na lista pouco antes do sorteio, o sistema implementa um mecanismo de bloqueio automático:

A lista é congelada às 20h50 (10 minutos antes do sorteio).
Usuários não podem mais se inscrever após esse horário.
Mensagem de alerta aparece para indicar o bloqueio.
 Histórico de Ganhadores com Detalhes do Sorteio
Todos os sorteios passados são registrados e exibidos na página de "Ganhadores":

O nome do vencedor, o número sorteado e o streamer escolhido são salvos.
O usuário pode visualizar sorteios passados.
Cada sorteio é armazenado no Supabase para acesso futuro.

 Funções Serverless para Sorteios Automáticos
O sistema agora conta com funções serverless que garantem que os sorteios ocorram automaticamente, mesmo que ninguém esteja com o site aberto:

Cron jobs na Vercel executam as funções em horários específicos (20:50, 21:00 e 21:05).
A lista é congelada, o sorteio é realizado e a lista é resetada de forma totalmente automatizada.
O frontend se mantém sincronizado através das inscrições em tempo real do Supabase.
Toda a lógica de sorteio é executada no servidor, garantindo segurança e confiabilidade.

Gerenciamento de Variáveis de Ambiente na Vercel
Para manter as credenciais seguras, o projeto usa variáveis de ambiente na Vercel:

Supabase URL e API Key são armazenadas na Vercel e não expostas no código.
O sistema carrega as credenciais via process.env.NEXT_PUBLIC_SUPABASE_URL.
Chaves secretas para autenticação das funções serverless são armazenadas de forma segura.

 Conclusão
Com essa estrutura detalhada, o projeto oferece um sistema de sorteios automatizado, interativo e seguro, garantindo que os usuários possam participar facilmente e acompanhar os vencedores de forma transparente. 🚀🔥

Caso precise de mais alguma personalização, só avisar! 


Tecnologias Utilizadas
Frontend: React.js
Backend: Funções Serverless (Vercel)
Banco de Dados: Supabase
Hospedagem: Vercel
Gerenciamento de Pacotes: npm
Controle de Versão: Git & GitHub
CSS: Estilização customizada inspirada na Twitch


Estratégia para Armazenamento do Histórico de Sorteios
 Objetivo
Armazenar os sorteios passados de maneira eficiente, garantindo que o site não fique pesado e que a recuperação dos dados seja rápida.

1 Armazenamento em Arquivos JSON ou CSV
Inicialmente, os dados do histórico serão salvos em arquivos JSON ou CSV, pois isso é mais leve e econômico.

 Local de armazenamento: No servidor da Vercel ou em um bucket do Supabase Storage.
 Como funciona:
A cada sorteio finalizado, um script salva o histórico do dia em um arquivo JSON/CSV.
Exemplo de nome de arquivo: historico_2024-03-05.json
Esses arquivos podem ser acessados quando necessário sem sobrecarregar o banco de dados principal.

2 Limpeza Automática da Tabela do Supabase
Para evitar que a tabela sorteios do Supabase fique muito grande, os dados mais antigos serão transferidos para JSON/CSV e excluídos do banco.
Um cron job (agendamento automático) pode ser configurado para mover os sorteios com mais de 30 dias para o arquivo e apagá-los da tabela.

3 Possível Migração Futura para Armazenamento Externo
Caso o site cresça muito, podemos migrar os arquivos para armazenamento externo na nuvem, como: 
 Amazon S3
 Google Drive API
 Firebase Storage

Isso permitirá armazenar um histórico maior sem impacto no desempenho.
O site apenas carregará os dados sob demanda, buscando os arquivos conforme necessário.
 Resumo da Estratégia
 JSON/CSV para armazenar os sorteios antigos sem pesar o banco.
 Remoção automática dos sorteios antigos no Supabase após 30 dias.
 Possível migração futura para serviços de armazenamento externo se necessário.

Dessa forma, garantimos um sistema leve, eficiente e escalável! 

## Configuração da Solução Serverless

Para mais detalhes sobre a implementação da solução serverless, consulte o arquivo [SERVERLESS_SETUP.md](./SERVERLESS_SETUP.md) que contém instruções detalhadas sobre:

- Componentes principais da solução
- Fluxo de execução dos cron jobs
- Configuração das variáveis de ambiente na Vercel
- Segurança e autenticação
- Testes e solução de problemas
. para deploy3

# Sistema de Sorteio Automático

Este sistema realiza sorteios diários automaticamente às 21:00 (horário de Brasília).

## Diagnóstico e Correção do Sistema

Se o sistema de sorteio não estiver funcionando corretamente, siga estas etapas para diagnosticar e corrigir o problema.

### 1. Verificar a Configuração do Cron Job

O sorteio automático é executado através de um cron job na Vercel. Verifique se a configuração está correta:

1. Abra o arquivo `vercel.json` e confirme que contém:
   ```json
   "crons": [
     { "path": "/api/cron", "schedule": "0 21 * * *" }
   ]
   ```

2. Verifique se a variável de ambiente `CRON_SECRET` está configurada no painel da Vercel.

### 2. Verificar a Estrutura do Banco de Dados

Execute o script `preparar_banco_dados.sql` para garantir que todas as tabelas e funções necessárias existam no banco de dados:

```sql
-- Conecte-se ao banco de dados e execute:
\i preparar_banco_dados.sql
```

Este script:
- Cria todas as tabelas necessárias (se não existirem)
- Configura os índices para melhor performance
- Cria/atualiza a função de sorteio automático
- Configura o trigger que reseta a lista após o sorteio
- Verifica e relata a estrutura atual do banco de dados

### 3. Diagnosticar Problemas Específicos

Execute o script `diagnostico_sorteio.sql` para identificar e corrigir problemas específicos:

```sql
-- Conecte-se ao banco de dados e execute:
\i diagnostico_sorteio.sql
```

Este script:
- Verifica logs recentes para identificar erros
- Examina sorteios recentes
- Verifica configurações atuais
- Corrige a função de sorteio automático
- Corrige o trigger de reset após sorteio

### 4. Verificar o Endpoint do Cron Job

Certifique-se de que o arquivo `api/cron.js` existe e está configurado corretamente para chamar a função `realizar_sorteio_automatico` no banco de dados.

### 5. Testar o Sorteio Manualmente

Para testar o sistema de sorteio manualmente, execute:

```sql
SELECT * FROM realizar_sorteio_automatico();
```

Isso tentará realizar um sorteio imediatamente, ignorando a verificação de horário, mas respeitando outras restrições (como não realizar mais de um sorteio em 15 horas).

## Problemas Comuns e Soluções

### O sorteio não está sendo realizado automaticamente

Possíveis causas:
- O cron job não está configurado corretamente
- A função `realizar_sorteio_automatico` tem erros
- Já houve um sorteio nas últimas 15 horas
- Não há participantes na lista

Solução: Verifique os logs recentes para identificar a causa específica.

### O sorteio está sendo realizado, mas não está limpando a lista

Possível causa: O trigger `reset_participantes_ativos` não está funcionando corretamente.

Solução: Execute o script `diagnostico_sorteio.sql` para corrigir o trigger.

### Como funciona o sistema

1. Usuários se inscrevem na lista de participantes ativos
2. Todos os dias às 21:00, o cron job da Vercel chama o endpoint `/api/cron`
3. O endpoint executa a função `realizar_sorteio_automatico` no banco de dados
4. A função verifica se é possível realizar o sorteio:
   - Não deve ter havido sorteio nas últimas 15 horas
   - Deve haver participantes na lista
5. Se as condições forem atendidas, o sorteio é realizado:
   - Um participante é escolhido aleatoriamente
   - Um número aleatório (1-100) é gerado
   - O resultado é registrado na tabela `sorteios`
6. Após o sorteio, o trigger `reset_participantes_ativos` é executado automaticamente:
   - Os participantes são salvos na tabela `historico_participantes`
   - A tabela `participantes_ativos` é limpa
   - A configuração `lista_congelada` é resetada para `false`

## Logs e Monitoramento

Para monitorar o sistema, verifique os logs recentes:

```sql
SELECT descricao, data_hora 
FROM logs 
ORDER BY data_hora DESC 
LIMIT 20;
```


