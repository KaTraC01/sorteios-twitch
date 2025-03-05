Site de Sorteios - Twitch
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

Gerenciamento de Variáveis de Ambiente na Vercel
Para manter as credenciais seguras, o projeto usa variáveis de ambiente na Vercel:

Supabase URL e API Key são armazenadas na Vercel e não expostas no código.
O sistema carrega as credenciais via process.env.NEXT_PUBLIC_SUPABASE_URL.


 Conclusão
Com essa estrutura detalhada, o projeto oferece um sistema de sorteios automatizado, interativo e seguro, garantindo que os usuários possam participar facilmente e acompanhar os vencedores de forma transparente. 🚀🔥

Caso precise de mais alguma personalização, só avisar! 


Tecnologias Utilizadas
Frontend: React.js
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


