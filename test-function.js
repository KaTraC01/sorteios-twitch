// Script para testar a função inserir_eventos_anuncios_lote_otimizado
import { createClient } from '@supabase/supabase-js';

// Inicializar o cliente Supabase
const supabaseUrl = 'https://nsqiytflqwlyqhdmueki.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zcWl5dGZscXdseXFoZG11ZWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDgzMDQ3MDQsImV4cCI6MjAyMzg4MDcwNH0.8BgwDcAVyFdNSAJWdxjL0X_0Zw07QPvet1ov6t3-V-8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFunction() {
  console.log('Testando função inserir_eventos_anuncios_lote_otimizado...');
  
  // Criar payload de teste
  const payload = {
    comuns: {
      navegador: 'Chrome',
      idioma: 'pt-BR',
      plataforma: 'Windows'
    },
    eventos: [
      {
        a_id: 'teste1',
        p_id: 'pagina_teste',
        t_e: 'impressao',
        t_a: 'banner',
        t_exp: 10,
        ts: new Date().toISOString(),
        s_id: 'teste_session_' + Date.now(),
        disp: 'd'
      }
    ]
  };
  
  try {
    // Chamar a função RPC
    const { data, error } = await supabase
      .rpc('inserir_eventos_anuncios_lote_otimizado', payload);
    
    if (error) {
      console.error('Erro ao chamar a função:', error);
      return;
    }
    
    console.log('Sucesso! Resposta:', data);
  } catch (error) {
    console.error('Exceção ao chamar a função:', error);
  }
}

// Executar o teste
testFunction(); 