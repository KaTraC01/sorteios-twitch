import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import AnuncioDemo from '../../components/AnuncioDemo';
import './RelatorioAnuncios.css';

const RelatorioAnuncios = () => {
  const [metricas, setMetricas] = useState([]);
  const [resumoDiario, setResumoDiario] = useState([]);
  const [anuncios, setAnuncios] = useState([]);
  const [paginas, setPaginas] = useState([]);
  const [periodoSelecionado, setPeriodoSelecionado] = useState('30d');
  const [carregando, setCarregando] = useState(true);
  const [tipoRelatorio, setTipoRelatorio] = useState('impressoes');
  const [erroCarregamento, setErroCarregamento] = useState(null);

  // Buscar dados quando o componente montar
  useEffect(() => {
    carregarDados();
  }, [periodoSelecionado, tipoRelatorio]);

  // Função para carregar dados com base no período selecionado
  const carregarDados = async () => {
    setCarregando(true);
    setErroCarregamento(null);
    
    try {
      // Buscar anúncios
      const { data: dadosAnuncios, error: erroAnuncios } = await supabase
        .from('anuncios')
        .select('*')
        .order('data_criacao', { ascending: false });
        
      if (erroAnuncios) throw erroAnuncios;
      
      // Verificar dados de anúncios (especialmente os tipos)
      console.log('Anúncios carregados:', dadosAnuncios);
      if (dadosAnuncios && dadosAnuncios.length > 0) {
        console.log('Exemplo de tipos de anúncios:');
        dadosAnuncios.slice(0, 5).forEach(a => {
          console.log(`ID: ${a.id}, Nome: ${a.nome}, Tipo: ${a.tipo_anuncio || 'NÃO DEFINIDO'}`);
        });
      } else {
        console.warn('Nenhum anúncio encontrado!');
      }
      
      setAnuncios(dadosAnuncios || []);
      
      // Buscar páginas
      const { data: dadosPaginas, error: erroPaginas } = await supabase
        .from('paginas')
        .select('*');
        
      if (erroPaginas) throw erroPaginas;
      setPaginas(dadosPaginas || []);
      
      // Determinar data de início com base no período
      const dataInicio = obterDataInicio(periodoSelecionado);
      
      // Buscar métricas de resumo diário
      const { data: dadosResumo, error: erroResumo } = await supabase
        .from('metricas_resumo_diarias')
        .select('*')
        .gte('data', dataInicio.toISOString());
        
      if (erroResumo) throw erroResumo;
      
      // Verificar dados de resumo diário
      console.log('Métricas de resumo carregadas:', dadosResumo?.length || 0, 'registros');
      if (dadosResumo && dadosResumo.length > 0) {
        console.log('Exemplo de métricas de resumo:');
        dadosResumo.slice(0, 3).forEach(m => {
          console.log(`Data: ${m.data}, Anúncio ID: ${m.anuncio_id}, Impressões: ${m.contagem_impressoes}, Cliques: ${m.contagem_cliques}`);
        });
      } else {
        console.warn('Nenhuma métrica de resumo encontrada!');
      }
      
      setResumoDiario(dadosResumo || []);
      
      // Buscar eventos detalhados
      const { data: dadosEventos, error: erroEventos } = await supabase
        .from('eventos_anuncios')
        .select('*')
        .gte('data_hora', dataInicio.toISOString())
        .order('data_hora', { ascending: false })
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
  
  // Função para obter nome de anúncio pelo ID (mantida para compatibilidade)
  const obterNomeAnuncio = (anuncioId) => {
    const anuncio = anuncios.find(a => a.id === anuncioId);
    return anuncio ? anuncio.nome : 'Desconhecido';
  };

  // Função para obter tipo de anúncio pelo ID e formatá-lo
  const obterTipoAnuncio = (anuncioId) => {
    const anuncio = anuncios.find(a => a.id === anuncioId);
    if (!anuncio) return 'Desconhecido';
    
    // Formatar o tipo de anúncio (primeira letra maiúscula e hífen substituído por espaço)
    const tipo = anuncio.tipo_anuncio || 'desconhecido';
    return tipo.charAt(0).toUpperCase() + tipo.slice(1).replace(/-/g, ' ');
  };
  
  // Função para obter URL da página pelo ID
  const obterUrlPagina = (paginaId) => {
    const pagina = paginas.find(p => p.id === paginaId);
    return pagina ? pagina.url : 'Desconhecida';
  };
  
  // Calcular totais para o relatório de impressões
  const calcularTotaisImpressoes = () => {
    const totais = {
      impressoes: 0,
      cliques: 0,
      ctr: 0,
      tempoMedio: 0,
      visibilidade: 0
    };
    
    // Usar os dados de resumo diário para cálculos mais precisos
    if (resumoDiario && resumoDiario.length > 0) {
      // Calcular totais
      let impressoesTotal = 0;
      let cliquesTotal = 0;
      let tempoTotalExposicao = 0;
      let visibilidadeTotal = 0;
      let diasComImpressoes = 0;
      
      resumoDiario.forEach(metrica => {
        if (metrica.contagem_impressoes) {
          impressoesTotal += metrica.contagem_impressoes;
          cliquesTotal += metrica.contagem_cliques || 0;
          
          if (metrica.tempo_medio_exposicao) {
            tempoTotalExposicao += metrica.tempo_medio_exposicao * metrica.contagem_impressoes;
          }
          
          if (metrica.taxa_visibilidade) {
            visibilidadeTotal += metrica.taxa_visibilidade;
            diasComImpressoes++;
          }
        }
      });
      
      totais.impressoes = impressoesTotal;
      totais.cliques = cliquesTotal;
      totais.ctr = impressoesTotal > 0 ? (cliquesTotal / impressoesTotal) * 100 : 0;
      totais.tempoMedio = impressoesTotal > 0 ? tempoTotalExposicao / impressoesTotal : 0;
      totais.visibilidade = diasComImpressoes > 0 ? (visibilidadeTotal / diasComImpressoes) * 100 : 0;
    }
    
    return totais;
  };
  
  // Agrupar métricas por tipo de anúncio para o relatório de desempenho
  const agruparMetricasPorAnuncio = () => {
    // Modificada para agrupar por tipo de anúncio em vez de ID de anúncio
    const metricasPorTipo = {};
    
    // Verificar se temos dados suficientes para processar
    if (!anuncios || anuncios.length === 0) {
      console.warn('Sem anúncios para agrupar métricas por tipo');
      return [];
    }
    
    if (!resumoDiario || resumoDiario.length === 0) {
      console.warn('Sem métricas de resumo para agrupar');
      return [];
    }
    
    console.log(`Tentando agrupar métricas por tipo. Anúncios: ${anuncios.length}, Resumo: ${resumoDiario.length}`);
    
    // Primeiro, mapeamos cada anúncio para seu tipo
    const mapaTipos = {};
    anuncios.forEach(anuncio => {
      // Garantir que tipo_anuncio existe e não é vazio
      mapaTipos[anuncio.id] = anuncio.tipo_anuncio || 'desconhecido';
    });
    
    // DEBUG: verificar o mapa de tipos
    console.log('Mapa de tipos de anúncios:', mapaTipos);
    
    // Usar os dados de resumo para agrupamento por tipo
    resumoDiario.forEach(metrica => {
      const anuncioId = metrica.anuncio_id;
      // Tentar obter o tipo do anúncio, ou usar 'desconhecido' se não encontrar
      const tipoAnuncio = mapaTipos[anuncioId] || 'desconhecido';
      
      if (!metricasPorTipo[tipoAnuncio]) {
        metricasPorTipo[tipoAnuncio] = {
          tipo: tipoAnuncio,
          // Formatar o tipo para exibição (primeira letra maiúscula, hífen por espaço)
          tipoFormatado: tipoAnuncio.charAt(0).toUpperCase() + tipoAnuncio.slice(1).replace(/-/g, ' '),
          impressoes: 0,
          cliques: 0,
          ctr: 0,
          tempoMedio: 0,
          visibilidade: 0,
          tempoTotalPonderado: 0,
          visibilidadeTotal: 0,
          diasComImpressoes: 0
        };
      }
      
      metricasPorTipo[tipoAnuncio].impressoes += metrica.contagem_impressoes || 0;
      metricasPorTipo[tipoAnuncio].cliques += metrica.contagem_cliques || 0;
      
      if (metrica.tempo_medio_exposicao && metrica.contagem_impressoes) {
        metricasPorTipo[tipoAnuncio].tempoTotalPonderado += metrica.tempo_medio_exposicao * metrica.contagem_impressoes;
      }
      
      if (metrica.taxa_visibilidade) {
        metricasPorTipo[tipoAnuncio].visibilidadeTotal += metrica.taxa_visibilidade;
        metricasPorTipo[tipoAnuncio].diasComImpressoes++;
      }
    });
    
    // Calcular médias e CTR
    Object.values(metricasPorTipo).forEach(metrica => {
      metrica.ctr = metrica.impressoes > 0 ? (metrica.cliques / metrica.impressoes) * 100 : 0;
      metrica.tempoMedio = metrica.impressoes > 0 ? metrica.tempoTotalPonderado / metrica.impressoes : 0;
      metrica.visibilidade = metrica.diasComImpressoes > 0 ? 
        (metrica.visibilidadeTotal / metrica.diasComImpressoes) * 100 : 0;
    });
    
    // Exibir resultado do agrupamento para debug
    console.log('Métricas agrupadas por tipo:', Object.values(metricasPorTipo));
    
    return Object.values(metricasPorTipo)
      .sort((a, b) => b.impressoes - a.impressoes);
  };
  
  // Agrupar métricas por página para o relatório de páginas
  const agruparMetricasPorPagina = () => {
    const metricasPorPagina = {};
    
    resumoDiario.forEach(metrica => {
      const paginaId = metrica.pagina_id;
      
      if (!metricasPorPagina[paginaId]) {
        metricasPorPagina[paginaId] = {
          paginaId,
          url: obterUrlPagina(paginaId),
          impressoes: 0,
          cliques: 0,
          ctr: 0
        };
      }
      
      metricasPorPagina[paginaId].impressoes += metrica.contagem_impressoes || 0;
      metricasPorPagina[paginaId].cliques += metrica.contagem_cliques || 0;
    });
    
    // Calcular CTR
    Object.values(metricasPorPagina).forEach(metrica => {
      metrica.ctr = metrica.impressoes > 0 ? (metrica.cliques / metrica.impressoes) * 100 : 0;
    });
    
    return Object.values(metricasPorPagina)
      .sort((a, b) => b.impressoes - a.impressoes);
  };
  
  // Renderizar o relatório de impressões
  const renderizarRelatorioImpressoes = () => {
    const totais = calcularTotaisImpressoes();
    
    return (
      <div className="relatorio-card">
        <h2>Relatório de Impressões e Cliques</h2>
        <div className="relatorio-resumo">
          <div className="metrica-card">
            <h3>Impressões</h3>
            <p className="metrica-valor">{totais.impressoes.toLocaleString()}</p>
          </div>
          
          <div className="metrica-card">
            <h3>Cliques</h3>
            <p className="metrica-valor">{totais.cliques.toLocaleString()}</p>
          </div>
          
          <div className="metrica-card">
            <h3>CTR</h3>
            <p className="metrica-valor">{totais.ctr.toFixed(2)}%</p>
          </div>
          
          <div className="metrica-card">
            <h3>Tempo Médio</h3>
            <p className="metrica-valor">{totais.tempoMedio.toFixed(1)}s</p>
          </div>
          
          <div className="metrica-card">
            <h3>Visibilidade</h3>
            <p className="metrica-valor">{totais.visibilidade.toFixed(1)}%</p>
          </div>
        </div>
      </div>
    );
  };
  
  // Renderizar o relatório de desempenho por anúncio
  const renderizarRelatorioPorAnuncio = () => {
    // Agora exibe por tipo de anúncio em vez de por anúncio individual
    const metricasPorTipo = agruparMetricasPorAnuncio();
    
    return (
      <div className="relatorio-card">
        <h2>Desempenho por Tipo de Anúncio</h2>
        <table className="relatorio-tabela">
          <thead>
            <tr>
              <th>TIPO DE ANÚNCIO</th>
              <th>IMPRESSÕES</th>
              <th>CLIQUES</th>
              <th>CTR</th>
              <th>TEMPO MÉDIO</th>
              <th>VISIBILIDADE</th>
            </tr>
          </thead>
          <tbody>
            {metricasPorTipo.map(metrica => (
              <tr key={metrica.tipo}>
                <td>{metrica.tipoFormatado}</td>
                <td className="metrica-impressoes">{metrica.impressoes.toLocaleString()}</td>
                <td className="metrica-cliques">{metrica.cliques.toLocaleString()}</td>
                <td className="metrica-ctr">{metrica.ctr.toFixed(2)}%</td>
                <td className="metrica-tempo">{metrica.tempoMedio.toFixed(1)}s</td>
                <td className="metrica-visibilidade">{metrica.visibilidade.toFixed(1)}%</td>
              </tr>
            ))}
            {metricasPorTipo.length === 0 && (
              <tr>
                <td colSpan="6" className="sem-dados">Nenhum dado disponível para o período selecionado</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };
  
  // Renderizar o relatório por página
  const renderizarRelatorioPorPagina = () => {
    const metricasPorPagina = agruparMetricasPorPagina();
    
    return (
      <div className="relatorio-card">
        <h2>Desempenho por Página</h2>
        <table className="relatorio-tabela">
          <thead>
            <tr>
              <th>Página</th>
              <th>Impressões</th>
              <th>Cliques</th>
              <th>CTR</th>
            </tr>
          </thead>
          <tbody>
            {metricasPorPagina.map(metrica => (
              <tr key={metrica.paginaId}>
                <td>{metrica.url}</td>
                <td className="metrica-impressoes">{metrica.impressoes.toLocaleString()}</td>
                <td className="metrica-cliques">{metrica.cliques.toLocaleString()}</td>
                <td className="metrica-ctr">{metrica.ctr.toFixed(2)}%</td>
              </tr>
            ))}
            {metricasPorPagina.length === 0 && (
              <tr>
                <td colSpan="4" className="sem-dados">Nenhum dado disponível para o período selecionado</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };
  
  return (
    <div className="relatorio-anuncios-container">
      <h1>Relatório de Métricas de Anúncios</h1>
      
      <div className="relatorio-controles">
        <div className="relatorio-filtros">
          <div className="relatorio-select-container">
            <div className="relatorio-select-header">Período</div>
            <select 
              value={periodoSelecionado} 
              onChange={(e) => setPeriodoSelecionado(e.target.value)}
              className="relatorio-select"
            >
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
              <option value="1a">Último ano</option>
            </select>
          </div>
          
          <div className="relatorio-select-container">
            <div className="relatorio-select-header">Relatório</div>
            <select 
              value={tipoRelatorio} 
              onChange={(e) => setTipoRelatorio(e.target.value)}
              className="relatorio-select"
            >
              <option value="impressoes">Visão Geral</option>
              <option value="anuncios">Por Tipo de Anúncio</option>
              <option value="paginas">Por Página</option>
            </select>
          </div>
          
          <button 
            onClick={carregarDados} 
            className="relatorio-botao-atualizar"
            disabled={carregando}
          >
            {carregando ? 'Atualizando...' : 'Atualizar Dados'}
          </button>
        </div>
        
        <div className="relatorio-info">
          <p>Dados de {formatarData(obterDataInicio(periodoSelecionado))} até hoje</p>
        </div>
      </div>
      
      {erroCarregamento && (
        <div className="relatorio-erro">
          <p>{erroCarregamento}</p>
        </div>
      )}
      
      {carregando ? (
        <div className="relatorio-carregando">
          <p>Carregando dados...</p>
        </div>
      ) : (
        <div className="relatorio-conteudo">
          {/* Sempre mostrar o relatório de impressões */}
          {renderizarRelatorioImpressoes()}
          
          {/* Mostrar relatório por anúncio se selecionado */}
          {(tipoRelatorio === 'anuncios' || tipoRelatorio === 'impressoes') && 
            renderizarRelatorioPorAnuncio()}
          
          {/* Mostrar relatório por página se selecionado */}
          {(tipoRelatorio === 'paginas' || tipoRelatorio === 'impressoes') && 
            renderizarRelatorioPorPagina()}
            
          {/* Exemplo de anúncio */}
          <div className="relatorio-exemplo-anuncio">
            <h2>Exemplo de Formato de Anúncio</h2>
            <p>Este é um exemplo do formato de anúncio banner (970×90)</p>
            <AnuncioDemo tamanho="banner" />
          </div>
        </div>
      )}
    </div>
  );
};

export default RelatorioAnuncios; 