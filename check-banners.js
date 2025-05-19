const { supabase } = require('../../utils/supabaseClient');

async function verificarAnuncios() {
  console.log('Verificando anúncios do tipo banner...');
  
  // Buscar todos os anúncios
  const { data: anuncios, error: erroAnuncios } = await supabase
    .from('anuncios')
    .select('*');
    
  if (erroAnuncios) {
    console.error('Erro ao buscar anúncios:', erroAnuncios);
    return;
  }
  
  console.log(`Total de anúncios encontrados: ${anuncios.length}`);
  
  // Contar anúncios por tipo
  const tiposAnuncios = {};
  anuncios.forEach(anuncio => {
    const tipo = anuncio.tipo_anuncio || 'indefinido';
    if (!tiposAnuncios[tipo]) tiposAnuncios[tipo] = 0;
    tiposAnuncios[tipo]++;
  });
  
  console.log('Tipos de anúncios encontrados:', tiposAnuncios);
  
  // Verificar especificamente anúncios do tipo banner
  const anunciosBanner = anuncios.filter(a => a.tipo_anuncio === 'banner');
  console.log(`Anúncios do tipo 'banner': ${anunciosBanner.length}`);
  
  if (anunciosBanner.length > 0) {
    console.log('Exemplo de anúncio banner:', anunciosBanner[0]);
  }
  
  // Buscar métricas resumo diárias
  const { data: metricas, error: erroMetricas } = await supabase
    .from('metricas_resumo_diarias')
    .select('*');
    
  if (erroMetricas) {
    console.error('Erro ao buscar métricas:', erroMetricas);
    return;
  }
  
  console.log(`Total de métricas encontradas: ${metricas.length}`);
  
  // Verificar se há métricas para anúncios do tipo banner
  const metricasPorTipo = {};
  
  // Criar mapa de ID para tipo
  const mapaTipos = {};
  anuncios.forEach(anuncio => {
    mapaTipos[anuncio.id] = anuncio.tipo_anuncio || 'indefinido';
  });
  
  // Agrupar métricas por tipo de anúncio
  metricas.forEach(metrica => {
    const anuncioId = metrica.anuncio_id;
    const tipoAnuncio = mapaTipos[anuncioId] || 'desconhecido';
    
    if (!metricasPorTipo[tipoAnuncio]) {
      metricasPorTipo[tipoAnuncio] = {
        impressoes: 0,
        cliques: 0
      };
    }
    
    metricasPorTipo[tipoAnuncio].impressoes += metrica.contagem_impressoes || 0;
    metricasPorTipo[tipoAnuncio].cliques += metrica.contagem_cliques || 0;
  });
  
  console.log('Métricas por tipo de anúncio:', metricasPorTipo);
  
  if (metricasPorTipo['banner']) {
    console.log('Métricas para anúncios do tipo banner:', metricasPorTipo['banner']);
  } else {
    console.log('Não foram encontradas métricas para anúncios do tipo banner');
  }
}

verificarAnuncios()
  .catch(erro => console.error('Erro na verificação:', erro))
  .finally(() => console.log('Verificação concluída')); 