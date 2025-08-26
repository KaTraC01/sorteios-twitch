import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getSupabaseClient, testSupabaseConnection } from '../lib/supabaseManager';

// Usar cliente otimizado para diagnóstico
const supabase = getSupabaseClient();

export default function DiagnosticoPage() {
  const [status, setStatus] = useState('carregando');
  const [dadosDiagnostico, setDadosDiagnostico] = useState({});
  const [erros, setErros] = useState([]);
  const [logs, setLogs] = useState([]);
  const [configSistema, setConfigSistema] = useState({});
  const [participantes, setParticipantes] = useState([]);
  const [ultimoSorteio, setUltimoSorteio] = useState(null);
  const [actionResult, setActionResult] = useState(null);
  const [senha, setSenha] = useState('');
  const [autenticado, setAutenticado] = useState(false);
  const router = useRouter();

  // Senha simples para proteger a página (NÃO É UMA SOLUÇÃO SEGURA PARA PRODUÇÃO)
  const SENHA_PAGINA = 'diagnostico2024';

  const autenticar = () => {
    if (senha === SENHA_PAGINA) {
      setAutenticado(true);
      localStorage.setItem('auth_diag', '1');
    } else {
      alert('Senha incorreta');
    }
  };

  useEffect(() => {
    const realizarDiagnostico = async () => {
      try {
        setStatus('carregando');
        const novosErros = [];
        
        // Verificar variáveis de ambiente no Frontend
        const variaveisAmbiente = {
          NEXT_PUBLIC_SUPABASE_ANON_KEY: typeof window !== "undefined" ? window.NEXT_PUBLIC_SUPABASE_ANON_KEY : null,
          NEXT_PUBLIC_SUPABASE_URL: typeof window !== "undefined" ? window.NEXT_PUBLIC_SUPABASE_URL : null,
        };
        
        // Verificar se as variáveis essenciais estão definidas
        const verificacoes = {
          // Removida verificação de URL específica por questões de segurança
          URL_DEFINIDA: !!variaveisAmbiente.NEXT_PUBLIC_SUPABASE_URL,
          ANON_KEY_DEFINIDA: !!variaveisAmbiente.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        };
        
        if (!variaveisAmbiente.NEXT_PUBLIC_SUPABASE_URL) {
          novosErros.push('URL do Supabase não configurada no frontend');
        }
        
        if (!variaveisAmbiente.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          novosErros.push('Chave anônima do Supabase não configurada no frontend');
        }
        
        // Testar conexão com o Supabase
        let conexaoSupabase = false;
        let dadosConfig = null;
        
        try {
          const { data, error } = await supabase.from('configuracoes').select('*').limit(5);
          if (error) throw error;
          conexaoSupabase = true;
          dadosConfig = data;
        } catch (error) {
          novosErros.push(`Erro na conexão com o Supabase: ${error.message}`);
          console.error('Erro ao testar Supabase:', error);
        }
        
        // Verificar se a tabela de logs existe
        let tabelaLogsExiste = false;
        
        try {
          const { data, error } = await supabase.from('logs').select('id').limit(1);
          if (!error) {
            tabelaLogsExiste = true;
          }
        } catch (error) {
          novosErros.push('Tabela de logs não existe ou não está acessível');
        }
        
        // Verificar última execução do cron job (via logs)
        let ultimaExecucaoCron = null;
        
        if (tabelaLogsExiste) {
          try {
            const { data, error } = await supabase
              .from('logs')
              .select('*')
              .ilike('descricao', '%cron%')
              .order('data_hora', { ascending: false })
              .limit(1);
              
            if (!error && data && data.length > 0) {
              ultimaExecucaoCron = data[0];
            }
          } catch (error) {
            novosErros.push(`Erro ao verificar logs de cron: ${error.message}`);
          }
        }
        
        // Verificar funções SQL existentes
        let funcoesSQL = null;
        
        try {
          const { data, error } = await supabase.rpc('verificar_funcoes_sistema');
          if (!error) {
            funcoesSQL = data;
          }
        } catch (error) {
          novosErros.push(`Erro ao verificar funções SQL: ${error.message}`);
        }

        setDadosDiagnostico({
          horario: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
          variaveisAmbiente,
          verificacoes,
          conexaoSupabase,
          dadosConfig,
          tabelaLogsExiste,
          ultimaExecucaoCron,
          funcoesSQL,
          navegador: navigator.userAgent
        });
        
        setErros(novosErros);
        setStatus(novosErros.length > 0 ? 'erro' : 'sucesso');
      } catch (error) {
        console.error('Erro ao realizar diagnóstico:', error);
        setErros([`Erro crítico: ${error.message}`]);
        setStatus('erro');
      }
    };

    realizarDiagnostico();
  }, []);

  useEffect(() => {
    // Verificar se já está autenticado
    if (localStorage.getItem('auth_diag') === '1') {
      setAutenticado(true);
    }
    
    if (!autenticado) return;
    
    const carregarDados = async () => {
      try {
        setStatus({ ...status, carregando: true });
        
        // Testar conexão com Supabase
        const testResult = await testSupabaseConnection();
        
        if (!testResult.success) {
          setStatus({
            carregando: false,
            erro: `Erro de conexão com o Supabase: ${testResult.error}`,
            dados: null
          });
          return;
        }
        
        // Buscar configurações
        const { data: configData } = await supabase
          .from('configuracoes')
          .select('*');
        
        if (configData) {
          const configObj = {};
          configData.forEach(cfg => {
            configObj[cfg.chave] = cfg.valor;
          });
          setConfigSistema(configObj);
        }
        
        // Buscar participantes ativos
        const { data: participantesData } = await supabase
          .from('participantes_ativos')
          .select('*')
          .order('id', { ascending: true })
          .limit(100);
        
        if (participantesData) {
          setParticipantes(participantesData);
        }
        
        // Buscar último sorteio
        const { data: sorteioData } = await supabase
          .from('sorteios')
          .select('*')
          .order('data', { ascending: false })
          .limit(1);
        
        if (sorteioData && sorteioData.length > 0) {
          setUltimoSorteio(sorteioData[0]);
        }
        
        // Buscar logs recentes
        await carregarLogs();
        
        setStatus({
          carregando: false,
          erro: null,
          dados: {
            testConnection: testResult,
            config: configObj,
            participantes: participantesData?.length || 0,
            ultimoSorteio: sorteioData?.[0]
          }
        });
      } catch (error) {
        setStatus({
          carregando: false,
          erro: error.message,
          dados: null
        });
      }
    };
    
    carregarDados();
    
    // Configurar atualização automática a cada 30 segundos
    const intervalo = setInterval(() => {
      if (autenticado) {
        carregarLogs();
      }
    }, 30000);
    
    return () => clearInterval(intervalo);
  }, [autenticado]);
  
  const carregarLogs = async () => {
    const { data: logsData } = await supabase
      .from('logs')
      .select('*')
      .order('data_hora', { ascending: false })
      .limit(100);
    
    if (logsData) {
      setLogs(logsData);
    }
  };
  
  const executarAcao = async (acao) => {
    try {
      setActionResult({ status: 'carregando', mensagem: `Executando ação "${acao}"...` });
      
      // Registrar a ação nos logs
      await supabase.from('logs').insert([{
        descricao: `Ação manual "${acao}" iniciada via página de diagnóstico`
      }]);
      
      // Usar o endpoint de debug
      const baseUrl = window.location.origin;
      const response = await fetch(`${baseUrl}/api/debug-sorteio?action=${acao}&force=true`);
      const data = await response.json();
      
      setActionResult({
        status: response.ok ? 'sucesso' : 'erro',
        mensagem: response.ok ? `Ação "${acao}" executada com sucesso` : `Erro ao executar "${acao}"`,
        detalhes: data
      });
      
      // Atualizar dados
      setTimeout(() => {
        carregarLogs();
        
        // Se for um reset, atualizar lista de participantes
        if (acao === 'resetar') {
          setParticipantes([]);
        }
        
        // Se for um sorteio, atualizar último sorteio
        if (acao === 'sorteio') {
          const buscarNovoSorteio = async () => {
            const { data: novoSorteio } = await supabase
              .from('sorteios')
              .select('*')
              .order('data', { ascending: false })
              .limit(1);
            
            if (novoSorteio && novoSorteio.length > 0) {
              setUltimoSorteio(novoSorteio[0]);
            }
          };
          
          buscarNovoSorteio();
        }
      }, 2000);
    } catch (error) {
      setActionResult({
        status: 'erro',
        mensagem: `Erro ao executar "${acao}": ${error.message}`
      });
    }
  };
  
  // Página de login
  if (!autenticado) {
    return (
      <div style={{ 
        maxWidth: '600px', 
        margin: '100px auto', 
        padding: '20px', 
        backgroundColor: '#1F1F23', 
        color: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
      }}>
        <h1 style={{ color: '#9147FF' }}>Diagnóstico do Sistema de Sorteio</h1>
        <p>Esta página é protegida. Digite a senha para acessar:</p>
        
        <div style={{ marginBottom: '20px' }}>
          <input 
            type="password" 
            value={senha} 
            onChange={(e) => setSenha(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && autenticar()}
            style={{
              padding: '10px',
              width: '100%',
              borderRadius: '4px',
              border: '1px solid #555',
              backgroundColor: '#18181B',
              color: 'white',
              marginBottom: '10px'
            }}
            placeholder="Digite a senha"
          />
          
          <button 
            onClick={autenticar}
            style={{
              padding: '10px 15px',
              backgroundColor: '#9147FF',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Acessar
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '20px', 
      backgroundColor: '#0E0E10', 
      color: 'white',
      minHeight: '100vh'
    }}>
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid #333',
        paddingBottom: '10px',
        marginBottom: '20px'
      }}>
        <h1 style={{ color: '#9147FF' }}>Diagnóstico do Sistema de Sorteio</h1>
        <div>
          <button 
            onClick={() => router.push('/')}
            style={{
              padding: '8px 12px',
              backgroundColor: '#333',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            Voltar ao Site
          </button>
          
          <button 
            onClick={() => {
              localStorage.removeItem('auth_diag');
              setAutenticado(false);
            }}
            style={{
              padding: '8px 12px',
              backgroundColor: '#772CE8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Sair
          </button>
        </div>
      </header>
      
      {status === 'carregando' ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>Carregando diagnóstico...</div>
        </div>
      ) : status === 'erro' ? (
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#461220', 
          color: 'white', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <h2>Erro ao carregar dados</h2>
          <p>{status.erro}</p>
        </div>
      ) : (
        <>
          <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px', marginBottom: '20px' }}>
            <h2>Status: {status === 'carregando' ? 'Carregando...' : status === 'sucesso' ? '✅ OK' : '❌ Erro'}</h2>
            <p>Hora do diagnóstico: {dadosDiagnostico.horario || '--'}</p>
          </div>
          
          {erros.length > 0 && (
            <div style={{ padding: '10px', border: '1px solid #e74c3c', backgroundColor: '#ffebee', borderRadius: '5px', marginBottom: '20px' }}>
              <h3 style={{ color: '#e74c3c' }}>Erros Encontrados:</h3>
              <ul>
                {erros.map((erro, index) => (
                  <li key={index}>{erro}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px', marginBottom: '20px' }}>
            <h3>Variáveis de Ambiente Frontend</h3>
            <div style={{ backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
              <p>NEXT_PUBLIC_SUPABASE_URL: {dadosDiagnostico.variaveisAmbiente?.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configurada' : '❌ Não configurada'}</p>
              <p>NEXT_PUBLIC_SUPABASE_ANON_KEY: {dadosDiagnostico.variaveisAmbiente?.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ Não configurada'}</p>
              
              <h4>Origem das Variáveis</h4>
              <p>URL vem de env-config.js (hardcoded): {dadosDiagnostico.verificacoes?.URL_DEFINIDA ? 'Sim ⚠️' : 'Não ✅'}</p>
              <p>KEY vem de env-config.js (hardcoded): {dadosDiagnostico.verificacoes?.ANON_KEY_DEFINIDA ? 'Sim ⚠️' : 'Não ✅'}</p>
            </div>
          </div>
          
          <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px', marginBottom: '20px' }}>
            <h3>Conexão com Supabase</h3>
            <div style={{ backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
              <p>Status: {dadosDiagnostico.conexaoSupabase ? '✅ Conectado' : '❌ Falha na conexão'}</p>
              <p>Tabela de Logs: {dadosDiagnostico.tabelaLogsExiste ? '✅ Existe' : '❌ Não existe'}</p>
              
              {dadosDiagnostico.ultimaExecucaoCron && (
                <div>
                  <h4>Última Execução do Cron Job</h4>
                  <p>Data: {new Date(dadosDiagnostico.ultimaExecucaoCron.data_hora).toLocaleString('pt-BR')}</p>
                  <p>Descrição: {dadosDiagnostico.ultimaExecucaoCron.descricao}</p>
                </div>
              )}
              
              {dadosDiagnostico.dadosConfig && (
                <div>
                  <h4>Configurações do Sistema</h4>
                  <ul>
                    {dadosDiagnostico.dadosConfig.map((config) => (
                      <li key={config.id}>
                        {config.chave}: {config.valor} 
                        (atualizado em: {new Date(config.atualizado_em).toLocaleString('pt-BR')})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          
          <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px', marginBottom: '20px' }}>
            <h3>Informações do Navegador</h3>
            <div style={{ backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '5px', wordBreak: 'break-all' }}>
              <p>{dadosDiagnostico.navegador}</p>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            {/* Card de Status */}
            <div style={{ 
              backgroundColor: '#18181B', 
              borderRadius: '8px', 
              padding: '20px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
              <h2 style={{ borderBottom: '1px solid #333', paddingBottom: '10px', color: '#9147FF' }}>Status do Sistema</h2>
              <p><strong>Conexão Supabase:</strong> {status.dados?.testConnection?.success ? '✅ OK' : '❌ Erro'}</p>
              <p><strong>Lista Congelada:</strong> {configSistema?.lista_congelada === 'true' ? '🔒 Sim' : '🔓 Não'}</p>
              <p><strong>Participantes Ativos:</strong> {participantes.length}</p>
              <p><strong>Último Sorteio:</strong> {ultimoSorteio ? new Date(ultimoSorteio.data).toLocaleString('pt-BR') : 'Nenhum'}</p>
            </div>
            
            {/* Card de Ações */}
            <div style={{ 
              backgroundColor: '#18181B', 
              borderRadius: '8px', 
              padding: '20px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
              <h2 style={{ borderBottom: '1px solid #333', paddingBottom: '10px', color: '#9147FF' }}>Ações</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button 
                  onClick={() => executarAcao('sorteio')}
                  style={{
                    padding: '10px',
                    backgroundColor: '#9147FF',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Realizar Sorteio Agora
                </button>
                
                <button 
                  onClick={() => executarAcao('congelar')}
                  style={{
                    padding: '10px',
                    backgroundColor: configSistema?.lista_congelada === 'true' ? '#333' : '#6441A4',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                  disabled={configSistema?.lista_congelada === 'true'}
                >
                  {configSistema?.lista_congelada === 'true' ? 'Lista já está congelada' : 'Congelar Lista'}
                </button>
                
                <button 
                  onClick={() => executarAcao('resetar')}
                  style={{
                    padding: '10px',
                    backgroundColor: '#6441A4',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Resetar Lista
                </button>
                
                <button 
                  onClick={() => carregarLogs()}
                  style={{
                    padding: '10px',
                    backgroundColor: '#18181B',
                    color: 'white',
                    border: '1px solid #6441A4',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Atualizar Logs
                </button>
              </div>
              
              {actionResult && (
                <div style={{ 
                  marginTop: '20px',
                  padding: '10px',
                  backgroundColor: actionResult.status === 'sucesso' ? '#143601' : 
                                  actionResult.status === 'carregando' ? '#253D5B' : '#461220',
                  borderRadius: '4px'
                }}>
                  <p><strong>{actionResult.mensagem}</strong></p>
                  {actionResult.status === 'carregando' && <p>Processando, aguarde...</p>}
                </div>
              )}
            </div>
            
            {/* Card de Último Sorteio */}
            <div style={{ 
              backgroundColor: '#18181B', 
              borderRadius: '8px', 
              padding: '20px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
              <h2 style={{ borderBottom: '1px solid #333', paddingBottom: '10px', color: '#9147FF' }}>Último Sorteio</h2>
              {ultimoSorteio ? (
                <div>
                  <p><strong>ID:</strong> {ultimoSorteio.id}</p>
                  <p><strong>Vencedor:</strong> {ultimoSorteio.nome}</p>
                  <p><strong>Streamer:</strong> {ultimoSorteio.streamer}</p>
                  <p><strong>Número:</strong> {ultimoSorteio.numero}</p>
                  <p><strong>Data:</strong> {new Date(ultimoSorteio.data).toLocaleString('pt-BR')}</p>
                </div>
              ) : (
                <p>Nenhum sorteio encontrado</p>
              )}
            </div>
          </div>
          
          {/* Seção de Participantes */}
          <div style={{ 
            backgroundColor: '#18181B', 
            borderRadius: '8px', 
            padding: '20px',
            marginBottom: '30px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ borderBottom: '1px solid #333', paddingBottom: '10px', color: '#9147FF' }}>Participantes Ativos ({participantes.length})</h2>
            
            {participantes.length > 0 ? (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '10px',
                marginTop: '15px'
              }}>
                {participantes.map(p => (
                  <div key={p.id} style={{ 
                    backgroundColor: '#1F1F23', 
                    padding: '10px', 
                    borderRadius: '4px',
                    border: '1px solid #333'
                  }}>
                    <p><strong>{p.nome_twitch}</strong></p>
                    <p style={{ fontSize: '14px', opacity: 0.8 }}>Streamer: {p.streamer_escolhido}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p>Nenhum participante na lista</p>
            )}
          </div>
          
          {/* Seção de Logs */}
          <div style={{ 
            backgroundColor: '#18181B', 
            borderRadius: '8px', 
            padding: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ borderBottom: '1px solid #333', paddingBottom: '10px', color: '#9147FF' }}>Logs do Sistema</h2>
            
            <div style={{ 
              maxHeight: '400px', 
              overflow: 'auto',
              backgroundColor: '#0E0E10',
              border: '1px solid #333',
              borderRadius: '4px',
              padding: '10px',
              marginTop: '15px',
              fontFamily: 'monospace'
            }}>
              {logs.length > 0 ? logs.map(log => (
                <div key={log.id} style={{ 
                  borderBottom: '1px solid #222',
                  padding: '8px 5px',
                  fontSize: '14px'
                }}>
                  <span style={{ color: '#9147FF' }}>[{new Date(log.data_hora).toLocaleString('pt-BR')}]</span> {log.descricao}
                </div>
              )) : (
                <p>Nenhum log encontrado</p>
              )}
            </div>
          </div>
        </>
      )}
      
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <button 
          onClick={() => window.location.reload()}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#6441a5', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Atualizar Diagnóstico
        </button>
      </div>
    </div>
  );
} 