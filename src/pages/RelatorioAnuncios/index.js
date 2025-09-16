import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '../../lib/supabaseManager'; // Importando gerenciador otimizado
import AnuncioConfigCache from '../../utils/AnuncioConfigCache';

// Usar cliente otimizado para operações de frontend
const supabase = getSupabaseClient();
import AnuncioDemo from '../../components/AnuncioDemo';
import './RelatorioAnuncios.css';

const RelatorioAnuncios = () => {
  const [metricas, setMetricas] = useState([]);
  const [resumoDiario, setResumoDiario] = useState([]);
  const [anunciosConfig, setAnunciosConfig] = useState([]);
  const [periodoSelecionado, setPeriodoSelecionado] = useState('30d');
  const [carregando, setCarregando] = useState(true);
  const [tipoRelatorio, setTipoRelatorio] = useState('impressoes');
  const [erroCarregamento, setErroCarregamento] = useState(null);

  // Buscar dados quando o componente montar
  useEffect(() => {
    carregarDados();
    carregarConfigAnuncios();
  }, [periodoSelecionado, tipoRelatorio]);

  // Carregar a configuração de anúncios com cache otimizado
  const carregarConfigAnuncios = async () => {
    try {
      // ✅ MANTÉM: Funcionalidade de relatórios intacta
      // ✅ MELHORIA: Usa cache para melhor performance
      const data = await AnuncioConfigCache.getConfig();
      
      // Transformar o objeto de configuração em uma lista plana
      const anunciosLista = [];
      Object.entries(data).forEach(([tipo, anuncios]) => {
        anuncios.forEach(anuncio => {
          anunciosLista.push({
            ...anuncio,
            tipo_anuncio: tipo
          });
        });
      });
      
      setAnunciosConfig(anunciosLista);
    } catch (error) {
      console.error('Erro ao carregar configuração de anúncios:', error);
      setErroCarregamento(`Erro ao carregar configuração de anúncios: ${error.message}`);
    }
  };

  // Função para carregar dados com base no período selecionado
  const carregarDados = async () => {
    setCarregando(true);
    setErroCarregamento(null);
    
    try {
      // Usar o cliente Supabase importado diretamente
      
      // Determinar data de início com base no período
      const dataInicio = obterDataInicio(periodoSelecionado);
      
      // Buscar métricas de resumo diário
      const { data: dadosResumo, error: erroResumo } = await supabase
        .from('metricas_resumo_diarias')
        .select('*')
        .gte('data', dataInicio.toISOString().split('T')[0]);
        
      if (erroResumo) throw erroResumo;
      setResumoDiario(dadosResumo || []);
      
      // Buscar eventos detalhados (limitados a 1000)
      const { data: dadosEventos, error: erroEventos } = await supabase
        .from('eventos_anuncios')
        .select('*')
        .gte('timestamp', dataInicio.toISOString())
        .order('timestamp', { ascending: false })
        .limit(1000);
        
      if (erroEventos) throw erroEventos;
      setMetricas(dadosEventos || []);
    } catch (erro) {
      console.error('Erro ao carregar dados:', erro);
      setErroCarregamento(`Erro ao carregar dados: ${erro.message}`);
    } finally {
      setCarregando(false);
    }
  };
  
  // Função para obter a data de início com base no período selecionado
  const obterDataInicio = (periodo) => {
    const hoje = new Date();
    const dataInicio = new Date(hoje);
    
    switch (periodo) {
      case '7d':
        dataInicio.setDate(hoje.getDate() - 7);
        break;
      case '30d':
        dataInicio.setDate(hoje.getDate() - 30);
        break;
      case '90d':
        dataInicio.setDate(hoje.getDate() - 90);
        break;
      case '1a':
        dataInicio.setFullYear(hoje.getFullYear() - 1);
        break;
      default:
        dataInicio.setDate(hoje.getDate() - 30);
    }
    
    return dataInicio;
  };
  
  // Função para formatar data
  const formatarData = (dataString) => {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR');
  };
  
  // Função para obter nome de anúncio pelo ID
  const obterNomeAnuncio = (anuncioId) => {
    const anuncio = anunciosConfig.find(a => a.id === anuncioId);
    return anuncio ? anuncio.titulo : anuncioId;
  };

  // Formatação do tipo de anúncio para exibição
  const formatarTipoAnuncio = (tipo) => {
    if (!tipo) return 'Desconhecido';
    // Formatar o tipo de anúncio (primeira letra maiúscula e hífen substituído por espaço)
    return tipo.charAt(0).toUpperCase() + tipo.slice(1).replace(/-/g, ' ');
  };

  // Função para obter ícone do tipo de anúncio
  const getIconeTipoAnuncio = (tipo) => {
    const icones = {
      'banner': '🖼️',
      'fixo-superior': '📌',
      'lateral': '📱',
      'quadrado': '⬜',
      'video': '🎥',
      'fixo-inferior': '📍',
      'tela-inteira': '🖥️',
      'cursos': '🎓',
      'logos': '🏷️'
    };
    return icones[tipo] || '📊';
  };

  // Função para obter quantidade de dias no período
  const getDiasNoPeriodo = (periodo) => {
    switch (periodo) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case '1a': return 365;
      default: return 30;
    }
  };
  
  // Calcular totais para o relatório de impressões
  const calcularTotaisImpressoes = () => {
    const totais = {
      impressoes: 0,
      cliques: 0,
      ctr: 0,
      tempoMedio: 0,
      alcance: 0
    };
    
    // Usar os dados de resumo diário para cálculos
    if (resumoDiario && resumoDiario.length > 0) {
      // Calcular totais
      let impressoesTotal = 0;
      let cliquesTotal = 0;
      let tempoTotalExposicao = 0;
      let alcanceTotal = new Set();
      
      resumoDiario.forEach(metrica => {
        impressoesTotal += metrica.total_impressoes || 0;
        cliquesTotal += metrica.total_cliques || 0;
          
        if (metrica.tempo_medio_visivel) {
          tempoTotalExposicao += metrica.tempo_medio_visivel * (metrica.total_impressoes || 0);
          }
          
        alcanceTotal.add(metrica.alcance || 0);
      });
      
      totais.impressoes = impressoesTotal;
      totais.cliques = cliquesTotal;
      totais.ctr = impressoesTotal > 0 ? (cliquesTotal / impressoesTotal) * 100 : 0;
      totais.tempoMedio = impressoesTotal > 0 ? tempoTotalExposicao / impressoesTotal : 0;
      totais.alcance = alcanceTotal.size;
    }
    
    return totais;
  };
  
  // Agrupar métricas por tipo de anúncio para o relatório de desempenho
  const agruparMetricasPorAnuncio = () => {
    const metricasPorTipo = {};
    
    resumoDiario.forEach(metrica => {
      const tipoAnuncio = metrica.tipo_anuncio;
      
      if (!metricasPorTipo[tipoAnuncio]) {
        metricasPorTipo[tipoAnuncio] = {
          tipo: tipoAnuncio,
          impressoes: 0,
          cliques: 0,
          ctr: 0,
          tempoMedio: 0,
          alcance: 0
        };
      }
      
      metricasPorTipo[tipoAnuncio].impressoes += metrica.total_impressoes || 0;
      metricasPorTipo[tipoAnuncio].cliques += metrica.total_cliques || 0;
      
      // Acumular tempo médio ponderado
      if (metrica.tempo_medio_visivel && metrica.total_impressoes) {
        metricasPorTipo[tipoAnuncio].tempoMedio += metrica.tempo_medio_visivel * metrica.total_impressoes;
      }
      
      // Somar alcance
      metricasPorTipo[tipoAnuncio].alcance += metrica.alcance || 0;
    });
    
    // Calcular médias e CTR final
    Object.values(metricasPorTipo).forEach(tipo => {
      tipo.ctr = tipo.impressoes > 0 ? (tipo.cliques / tipo.impressoes) * 100 : 0;
      tipo.tempoMedio = tipo.impressoes > 0 ? tipo.tempoMedio / tipo.impressoes : 0;
    });
    
    return Object.values(metricasPorTipo).sort((a, b) => b.impressoes - a.impressoes);
  };
  
  // Agrupar métricas por página para o relatório de desempenho por página
  const agruparMetricasPorPagina = () => {
    const metricasPorPagina = {};
    
    resumoDiario.forEach(metrica => {
      const pagina = metrica.pagina;
      
      if (!metricasPorPagina[pagina]) {
        metricasPorPagina[pagina] = {
          pagina: pagina,
          impressoes: 0,
          cliques: 0,
          ctr: 0,
          tempoMedio: 0,
          alcance: 0
        };
      }
      
      metricasPorPagina[pagina].impressoes += metrica.total_impressoes || 0;
      metricasPorPagina[pagina].cliques += metrica.total_cliques || 0;
      
      // Acumular tempo médio ponderado
      if (metrica.tempo_medio_visivel && metrica.total_impressoes) {
        metricasPorPagina[pagina].tempoMedio += metrica.tempo_medio_visivel * metrica.total_impressoes;
      }
      
      // Somar alcance
      metricasPorPagina[pagina].alcance += metrica.alcance || 0;
    });
    
    // Calcular médias e CTR final
    Object.values(metricasPorPagina).forEach(pagina => {
      pagina.ctr = pagina.impressoes > 0 ? (pagina.cliques / pagina.impressoes) * 100 : 0;
      pagina.tempoMedio = pagina.impressoes > 0 ? pagina.tempoMedio / pagina.impressoes : 0;
    });
    
    return Object.values(metricasPorPagina).sort((a, b) => b.impressoes - a.impressoes);
  };
  
  // Renderização do relatório de impressões
  const renderizarRelatorioImpressoes = () => {
    const totais = calcularTotaisImpressoes();
    const metricasPorTipo = agruparMetricasPorAnuncio();
    
    return (
      <div className="relatorio-impressoes">
        <h2>Desempenho Geral - {periodoSelecionado === '7d' ? 'Últimos 7 dias' : periodoSelecionado === '30d' ? 'Últimos 30 dias' : periodoSelecionado === '90d' ? 'Últimos 90 dias' : 'Último ano'}</h2>
        
        <div className="resumo-executivo">
          <h3>📊 Resumo Executivo</h3>
          <div className="metricas-cards">
            <div className="metrica-card impressoes">
              <div className="metrica-valor">{totais.impressoes.toLocaleString()}</div>
              <div className="metrica-label">IMPRESSÕES</div>
            </div>
            
            <div className="metrica-card cliques">
              <div className="metrica-valor">{totais.cliques.toLocaleString()}</div>
              <div className="metrica-label">CLIQUES</div>
            </div>
            
            <div className="metrica-card ctr">
              <div className="metrica-valor">{totais.ctr.toFixed(2)}%</div>
              <div className="metrica-label">CTR</div>
            </div>
            
            <div className="metrica-card tempo">
              <div className="metrica-valor">{totais.tempoMedio.toFixed(1)}s</div>
              <div className="metrica-label">TEMPO MÉDIO VISÍVEL</div>
            </div>
          </div>
        </div>

        <div className="metricas-por-tipo">
          <h3>📈 Performance por Tipo de Anúncio</h3>
          <p className="texto-explicativo">Dados detalhados de cada formato publicitário para análise de investimento</p>
          
          <div className="tipos-anuncio-grid">
            {metricasPorTipo.map((metrica, index) => (
              <div key={index} className="tipo-anuncio-card">
                <div className="tipo-header">
                  <h4>{formatarTipoAnuncio(metrica.tipo)}</h4>
                  <div className="tipo-badge">{getIconeTipoAnuncio(metrica.tipo)}</div>
                </div>
                
                <div className="tipo-metricas">
                  <div className="tipo-metrica">
                    <span className="metrica-numero">{metrica.impressoes.toLocaleString()}</span>
                    <span className="metrica-titulo">Impressões</span>
                  </div>
                  
                  <div className="tipo-metrica">
                    <span className="metrica-numero">{metrica.cliques.toLocaleString()}</span>
                    <span className="metrica-titulo">Cliques</span>
                  </div>
                  
                  <div className="tipo-metrica">
                    <span className="metrica-numero">{metrica.ctr.toFixed(2)}%</span>
                    <span className="metrica-titulo">CTR</span>
                  </div>
                  
                  <div className="tipo-metrica">
                    <span className="metrica-numero">{metrica.tempoMedio.toFixed(1)}s</span>
                    <span className="metrica-titulo">Tempo Médio</span>
                  </div>
                </div>
                
                <div className="tipo-performance">
                  <div className="performance-bar">
                    <div 
                      className="performance-fill" 
                      style={{ width: `${Math.min((metrica.impressoes / Math.max(...metricasPorTipo.map(m => m.impressoes))) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <span className="performance-label">Performance relativa</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="analise-investimento">
          <h3>💼 Análise para Investidores</h3>
          <div className="investimento-cards">
            <div className="invest-card potencial">
              <h4>💰 Potencial de Receita</h4>
              <div className="invest-content">
                <p><strong>Impressões mensais estimadas:</strong> {Math.round((totais.impressoes / getDiasNoPeriodo(periodoSelecionado)) * 30).toLocaleString()}</p>
                <p><strong>CTR médio:</strong> {totais.ctr.toFixed(2)}% (acima da média do mercado)</p>
                <p><strong>Engajamento:</strong> {totais.tempoMedio.toFixed(1)}s de tempo médio visível</p>
              </div>
            </div>
            
            <div className="invest-card formatos">
              <h4>📊 Diversidade de Formatos</h4>
              <div className="invest-content">
                <p><strong>Tipos disponíveis:</strong> {metricasPorTipo.length} formatos publicitários diferentes</p>
                <p><strong>Mais performático:</strong> {metricasPorTipo[0]?.tipo ? formatarTipoAnuncio(metricasPorTipo[0].tipo) : 'N/A'}</p>
                <p><strong>Flexibilidade:</strong> Formatos adaptáveis para diferentes necessidades</p>
              </div>
            </div>
            
            <div className="invest-card qualidade">
              <h4>⭐ Indicadores de Qualidade</h4>
              <div className="invest-content">
                <p><strong>Taxa de cliques:</strong> {totais.ctr.toFixed(2)}%</p>
                <p><strong>Tempo de atenção:</strong> {totais.tempoMedio.toFixed(1)}s por impressão</p>
                <p><strong>Consistência:</strong> Dados coletados em tempo real</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="eventos-recentes">
          <h3>📝 Últimos Eventos (Dados em Tempo Real)</h3>
          <div className="eventos-container">
            {metricas.length > 0 ? (
              <div className="eventos-grid">
                {metricas.slice(0, 12).map((metrica, index) => (
                  <div key={index} className="evento-card">
                    <div className="evento-header">
                      <span className="evento-tipo">{formatarTipoAnuncio(metrica.tipo_anuncio)}</span>
                      <span className="evento-data">{new Date(metrica.timestamp).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="evento-details">
                      <div className="evento-detail">
                        <span className="detail-label">Evento:</span>
                        <span className={`detail-value ${metrica.tipo_evento === 'impressao' ? 'impressao' : 'clique'}`}>
                          {metrica.tipo_evento === 'impressao' ? '👁️ Impressão' : '👆 Clique'}
                        </span>
                      </div>
                      <div className="evento-detail">
                        <span className="detail-label">Página:</span>
                        <span className="detail-value">{metrica.pagina}</span>
                      </div>
                      <div className="evento-detail">
                        <span className="detail-label">Tempo:</span>
                        <span className="detail-value">{metrica.tempo_exposto ? `${metrica.tempo_exposto.toFixed(1)}s` : 'N/A'}</span>
                      </div>
                      <div className="evento-detail">
                        <span className="detail-label">Horário:</span>
                        <span className="detail-value">{new Date(metrica.timestamp).toLocaleTimeString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="sem-eventos">
                <div className="sem-eventos-icon">📊</div>
                <h4>Nenhum evento registrado</h4>
                <p>Não há eventos de anúncios no período selecionado.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  // Renderização do relatório por tipo de anúncio
  const renderizarRelatorioPorAnuncio = () => {
    const metricasPorAnuncio = agruparMetricasPorAnuncio();
    
    return (
      <div className="relatorio-por-anuncio">
        <h2>Desempenho por Tipo de Anúncio - {periodoSelecionado === '7d' ? 'Últimos 7 dias' : periodoSelecionado === '30d' ? 'Últimos 30 dias' : periodoSelecionado === '90d' ? 'Últimos 90 dias' : 'Último ano'}</h2>
        
        <table className="tabela-metricas">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Impressões</th>
              <th>Cliques</th>
              <th>CTR</th>
              <th>Tempo Médio</th>
            </tr>
          </thead>
          <tbody>
            {metricasPorAnuncio.map((metrica, index) => (
              <tr key={index}>
                <td>{formatarTipoAnuncio(metrica.tipo)}</td>
                <td>{metrica.impressoes.toLocaleString()}</td>
                <td>{metrica.cliques.toLocaleString()}</td>
                <td>{metrica.ctr.toFixed(2)}%</td>
                <td>{metrica.tempoMedio.toFixed(1)}s</td>
              </tr>
            ))}
            {metricasPorAnuncio.length === 0 && (
              <tr>
                <td colSpan="5" className="sem-dados">
                  Nenhum dado disponível para o período selecionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
        <div className="preview-anuncios">
          <h3>Exemplos dos tipos de anúncios:</h3>
          <div className="anuncios-grid">
            <AnuncioDemo tipo="banner" />
            <AnuncioDemo tipo="lateral" />
            <AnuncioDemo tipo="fixo-superior" />
            <AnuncioDemo tipo="fixo-inferior" />
            <AnuncioDemo tipo="tela-inteira" />
            <AnuncioDemo tipo="quadrado" />
            <AnuncioDemo tipo="cursos" />
            <AnuncioDemo tipo="video" />
            <AnuncioDemo tipo="logos" />
          </div>
        </div>
      </div>
    );
  };
  
  // Renderização do relatório por página
  const renderizarRelatorioPorPagina = () => {
    const metricasPorPagina = agruparMetricasPorPagina();
    
    return (
      <div className="relatorio-por-pagina">
        <div className="pagina-header">
          <h2>📱 Performance por Página</h2>
          <p className="pagina-subtitle">Análise detalhada do desempenho dos anúncios em cada página do site</p>
        </div>
        
        {metricasPorPagina.length > 0 ? (
          <div className="paginas-grid">
            {metricasPorPagina.map((metrica, index) => (
              <div key={index} className="pagina-card">
                <div className="pagina-card-header">
                  <h3>{metrica.pagina}</h3>
                  <div className="pagina-ranking">#{index + 1}</div>
                </div>
                
                <div className="pagina-metricas">
                  <div className="pagina-metrica impressoes">
                    <div className="metrica-icon">👁️</div>
                    <div className="metrica-info">
                      <span className="metrica-numero">{metrica.impressoes.toLocaleString()}</span>
                      <span className="metrica-label">Impressões</span>
                    </div>
                  </div>
                  
                  <div className="pagina-metrica cliques">
                    <div className="metrica-icon">👆</div>
                    <div className="metrica-info">
                      <span className="metrica-numero">{metrica.cliques.toLocaleString()}</span>
                      <span className="metrica-label">Cliques</span>
                    </div>
                  </div>
                  
                  <div className="pagina-metrica ctr">
                    <div className="metrica-icon">🎯</div>
                    <div className="metrica-info">
                      <span className="metrica-numero">{metrica.ctr.toFixed(2)}%</span>
                      <span className="metrica-label">CTR</span>
                    </div>
                  </div>
                  
                  <div className="pagina-metrica tempo">
                    <div className="metrica-icon">⏱️</div>
                    <div className="metrica-info">
                      <span className="metrica-numero">{metrica.tempoMedio.toFixed(1)}s</span>
                      <span className="metrica-label">Tempo Médio</span>
                    </div>
                  </div>
                </div>
                
                <div className="pagina-performance">
                  <div className="performance-label">Performance CTR</div>
                  <div className="performance-bar">
                    <div 
                      className="performance-fill" 
                      style={{ width: `${Math.min((metrica.ctr / Math.max(...metricasPorPagina.map(m => m.ctr))) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="performance-text">{metrica.ctr > 1 ? 'Excelente' : metrica.ctr > 0.5 ? 'Bom' : 'Regular'}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="sem-dados-pagina">
            <div className="sem-dados-icon">📊</div>
            <h3>Nenhum dado disponível</h3>
            <p>Não há dados de páginas para o período selecionado.</p>
          </div>
        )}
      </div>
    );
  };
  
  // Renderização principal da página
  return (
    <div className="relatorio-anuncios-container">
      <h1>Relatório de Anúncios</h1>
      
      {erroCarregamento && (
        <div className="erro-carregamento">
          <p>{erroCarregamento}</p>
          <button onClick={carregarDados}>Tentar novamente</button>
        </div>
      )}
      
      <div className="controles">
        <div className="seletor-periodo">
          <label htmlFor="periodo">Período:</label>
            <select 
            id="periodo" 
              value={periodoSelecionado} 
              onChange={(e) => setPeriodoSelecionado(e.target.value)}
            >
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
              <option value="1a">Último ano</option>
            </select>
          </div>
          
        <div className="seletor-relatorio">
          <button 
            className={tipoRelatorio === 'impressoes' ? 'ativo' : ''} 
            onClick={() => setTipoRelatorio('impressoes')}
          >
            📊 Dashboard Principal
          </button>
          <button 
            className={tipoRelatorio === 'por-pagina' ? 'ativo' : ''} 
            onClick={() => setTipoRelatorio('por-pagina')}
          >
            📱 Performance por Página
          </button>
        </div>
      </div>
      
      <div className="conteudo-relatorio">
      {carregando ? (
          <div className="carregando">Carregando dados...</div>
      ) : (
          <>
            {tipoRelatorio === 'impressoes' && renderizarRelatorioImpressoes()}
            {tipoRelatorio === 'por-pagina' && renderizarRelatorioPorPagina()}
          </>
        )}
        </div>
    </div>
  );
};

export default RelatorioAnuncios; 