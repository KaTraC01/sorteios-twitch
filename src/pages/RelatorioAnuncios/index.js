import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient'; // Importando o cliente Supabase já configurado
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

  // Carregar a configuração de anúncios
  const carregarConfigAnuncios = async () => {
    try {
      const response = await fetch('/anuncios/config.json');
      const data = await response.json();
      
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
    
    return (
      <div className="relatorio-impressoes">
        <h2>Desempenho Geral - {periodoSelecionado === '7d' ? 'Últimos 7 dias' : periodoSelecionado === '30d' ? 'Últimos 30 dias' : periodoSelecionado === '90d' ? 'Últimos 90 dias' : 'Último ano'}</h2>
        
        <div className="metricas-cards">
          <div className="metrica-card">
            <div className="metrica-valor">{totais.impressoes.toLocaleString()}</div>
            <div className="metrica-label">Impressões</div>
          </div>
          
          <div className="metrica-card">
            <div className="metrica-valor">{totais.cliques.toLocaleString()}</div>
            <div className="metrica-label">Cliques</div>
          </div>
          
          <div className="metrica-card">
            <div className="metrica-valor">{totais.ctr.toFixed(2)}%</div>
            <div className="metrica-label">CTR</div>
          </div>
          
          <div className="metrica-card">
            <div className="metrica-valor">{totais.tempoMedio.toFixed(1)}s</div>
            <div className="metrica-label">Tempo médio visível</div>
          </div>
          
          <div className="metrica-card">
            <div className="metrica-valor">{totais.alcance.toLocaleString()}</div>
            <div className="metrica-label">Alcance (usuários)</div>
          </div>
        </div>
        
        <div className="eventos-recentes">
          <h3>Últimos 20 Eventos</h3>
          <table className="tabela-metricas">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Tipo Anúncio</th>
                <th>ID Anúncio</th>
                <th>Página</th>
                <th>Evento</th>
                <th>Tempo Visível</th>
                <th>Dispositivo</th>
              </tr>
            </thead>
            <tbody>
              {metricas.slice(0, 20).map((metrica, index) => (
                <tr key={index}>
                  <td>{new Date(metrica.timestamp).toLocaleString('pt-BR')}</td>
                  <td>{formatarTipoAnuncio(metrica.tipo_anuncio)}</td>
                  <td>{metrica.anuncio_id}</td>
                  <td>{metrica.pagina}</td>
                  <td>{metrica.tipo_evento === 'impressao' ? 'Impressão' : 'Clique'}</td>
                  <td>{metrica.tempo_exposto ? `${metrica.tempo_exposto.toFixed(1)}s` : 'N/A'}</td>
                  <td>{metrica.dispositivo || 'Desconhecido'}</td>
                </tr>
              ))}
              {metricas.length === 0 && (
                <tr>
                  <td colSpan="7" className="sem-dados">
                    Nenhum evento registrado no período selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
              <th>Alcance</th>
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
                <td>{metrica.alcance.toLocaleString()}</td>
              </tr>
            ))}
            {metricasPorAnuncio.length === 0 && (
              <tr>
                <td colSpan="6" className="sem-dados">
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
        <h2>Desempenho por Página - {periodoSelecionado === '7d' ? 'Últimos 7 dias' : periodoSelecionado === '30d' ? 'Últimos 30 dias' : periodoSelecionado === '90d' ? 'Últimos 90 dias' : 'Último ano'}</h2>
        
        <table className="tabela-metricas">
          <thead>
            <tr>
              <th>Página</th>
              <th>Impressões</th>
              <th>Cliques</th>
              <th>CTR</th>
              <th>Tempo Médio</th>
              <th>Alcance</th>
            </tr>
          </thead>
          <tbody>
            {metricasPorPagina.map((metrica, index) => (
              <tr key={index}>
                <td>{metrica.pagina}</td>
                <td>{metrica.impressoes.toLocaleString()}</td>
                <td>{metrica.cliques.toLocaleString()}</td>
                <td>{metrica.ctr.toFixed(2)}%</td>
                <td>{metrica.tempoMedio.toFixed(1)}s</td>
                <td>{metrica.alcance.toLocaleString()}</td>
              </tr>
            ))}
            {metricasPorPagina.length === 0 && (
              <tr>
                <td colSpan="6" className="sem-dados">
                  Nenhum dado disponível para o período selecionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
            Visão Geral
          </button>
          <button 
            className={tipoRelatorio === 'por-anuncio' ? 'ativo' : ''} 
            onClick={() => setTipoRelatorio('por-anuncio')}
          >
            Por Tipo de Anúncio
          </button>
          <button 
            className={tipoRelatorio === 'por-pagina' ? 'ativo' : ''} 
            onClick={() => setTipoRelatorio('por-pagina')}
          >
            Por Página
          </button>
        </div>
      </div>
      
      <div className="conteudo-relatorio">
      {carregando ? (
          <div className="carregando">Carregando dados...</div>
      ) : (
          <>
            {tipoRelatorio === 'impressoes' && renderizarRelatorioImpressoes()}
            {tipoRelatorio === 'por-anuncio' && renderizarRelatorioPorAnuncio()}
            {tipoRelatorio === 'por-pagina' && renderizarRelatorioPorPagina()}
          </>
        )}
        </div>
    </div>
  );
};

export default RelatorioAnuncios; 