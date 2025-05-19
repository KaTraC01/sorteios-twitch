// Script para investigar métricas de anúncios do tipo banner
const { supabase } = require('../../utils/supabaseClient');

async function verificarMetricasBanner() {
  console.log('Iniciando investigação sobre anúncios do tipo banner...');
  
  // 1. Buscar todos os anúncios do tipo banner
  const { data: anunciosBanner, error: erroBanner } = await supabase
    .from('anuncios')
    .select('*')
    .eq('tipo_anuncio', 'banner');
    
  if (erroBanner) {
    console.error('Erro ao buscar anúncios do tipo banner:', erroBanner);
    return;
  }
  
  console.log(`Encontrados ${anunciosBanner.length} anúncios do tipo banner:`);
  anunciosBanner.forEach(anuncio => {
    console.log(`ID: ${anuncio.id}, Nome: ${anuncio.nome}`);
  });
  
  // Extrair apenas os IDs para filtrar métricas
  const idsBanner = anunciosBanner.map(a => a.id);
  
  // 2. Verificar se existem métricas para esses anúncios
  const { data: metricasBanner, error: erroMetricas } = await supabase
    .from('metricas_resumo_diarias')
    .select('*')
    .in('anuncio_id', idsBanner);
    
  if (erroMetricas) {
    console.error('Erro ao buscar métricas para banners:', erroMetricas);
    return;
  }
  
  console.log(`\nEncontradas ${metricasBanner.length} métricas para anúncios do tipo banner:`);
  if (metricasBanner.length > 0) {
    console.log('Primeiras 5 métricas:');
    metricasBanner.slice(0, 5).forEach(metrica => {
      console.log(`Data: ${metrica.data}, Anúncio ID: ${metrica.anuncio_id}, Impressões: ${metrica.contagem_impressoes}, Cliques: ${metrica.contagem_cliques}`);
    });
    
    // Agrupar métricas por anúncio para análise
    const metricasPorAnuncio = {};
    metricasBanner.forEach(metrica => {
      if (!metricasPorAnuncio[metrica.anuncio_id]) {
        metricasPorAnuncio[metrica.anuncio_id] = {
          impressoes: 0,
          cliques: 0,
          registros: 0
        };
      }
      
      metricasPorAnuncio[metrica.anuncio_id].impressoes += metrica.contagem_impressoes || 0;
      metricasPorAnuncio[metrica.anuncio_id].cliques += metrica.contagem_cliques || 0;
      metricasPorAnuncio[metrica.anuncio_id].registros++;
    });
    
    console.log('\nResumo de métricas por anúncio:');
    Object.entries(metricasPorAnuncio).forEach(([anuncioId, metricas]) => {
      const anuncio = anunciosBanner.find(a => a.id === anuncioId);
      console.log(`${anuncio?.nome || anuncioId}:`);
      console.log(`- Impressões totais: ${metricas.impressoes}`);
      console.log(`- Cliques totais: ${metricas.cliques}`);
      console.log(`- Registros: ${metricas.registros}`);
    });
  } else {
    console.log('Não foram encontradas métricas para anúncios do tipo banner!');
    
    // 3. Verificar se existem métricas para qualquer tipo de anúncio nos últimos 30 dias
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - 30);
    
    const { data: metricasRecentes, error: erroRecentes } = await supabase
      .from('metricas_resumo_diarias')
      .select('*')
      .gte('data', dataInicio.toISOString())
      .limit(100);
      
    if (erroRecentes) {
      console.error('Erro ao buscar métricas recentes:', erroRecentes);
      return;
    }
    
    console.log(`\nVerificando se existem métricas recentes (últimos 30 dias) para qualquer anúncio:`);
    console.log(`Encontradas ${metricasRecentes.length} métricas recentes.`);
    
    if (metricasRecentes.length > 0) {
      console.log('Exemplos de métricas recentes:');
      metricasRecentes.slice(0, 5).forEach(metrica => {
        console.log(`Data: ${metrica.data}, Anúncio ID: ${metrica.anuncio_id}, Impressões: ${metrica.contagem_impressoes}, Cliques: ${metrica.contagem_cliques}`);
      });
    }
  }
  
  // 4. Verificar se a função de rastreamento de impressões está funcionando para banners
  console.log('\nVerificando se a função de rastreamento de impressões para banners está funcionando...');
  console.log('Verificação concluída. Você precisa verificar o código de rastreamento de impressões para garantir que está funcionando para banners.');
}

verificarMetricasBanner()
  .catch(erro => console.error('Erro durante a verificação:', erro))
  .finally(() => console.log('Investigação concluída.')); 