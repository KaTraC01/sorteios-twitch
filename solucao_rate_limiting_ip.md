# Solução: Rate Limiting Baseado em IP

## Problema Atual
O controle de 5 minutos baseado em localStorage pode ser facilmente burlado usando abas anônimas.

## Solução Implementada
Modificar o sistema para usar rate limiting baseado em IP, aproveitando a infraestrutura existente do Supabase.

## Arquivos a Modificar

### 1. Configuração no Supabase
```sql
-- Atualizar configurações de rate limiting para inserções em lote
UPDATE rate_limiting_settings 
SET intervalo_segundos = 300 -- 5 minutos
WHERE tipo_operacao = 'lote';

-- Criar nova configuração para inserção individual com limite menor
INSERT INTO rate_limiting_settings (tipo_operacao, intervalo_segundos, max_tentativas_consecutivas, tempo_bloqueio_segundos)
VALUES ('participante_add_individual', 60, 3, 300) -- 1 minuto entre inserções individuais
ON CONFLICT (tipo_operacao) DO UPDATE SET
intervalo_segundos = 60,
max_tentativas_consecutivas = 3,
tempo_bloqueio_segundos = 300;
```

### 2. Criar Middleware de Rate Limiting para Participantes
```javascript
// pages/api/middleware/rateLimitParticipantes.js
import { mcp_supabase_execute_sql } from '../../../mcp-functions';

export async function verificarRateLimitIP(req, identificadorIP, tipoOperacao = 'participante_add_individual') {
    const query = `
        SELECT verificar_rate_limiting_seguro($1, $2) as resultado;
    `;
    
    try {
        const { data } = await mcp_supabase_execute_sql({
            project_id: 'nsqiytflqwlyqhdmueki',
            query: query.replace('$1', `'${identificadorIP}'`).replace('$2', `'${tipoOperacao}'`)
        });
        
        if (data && data.length > 0) {
            const resultado = data[0].resultado;
            return {
                permitido: resultado.permitido,
                mensagem: resultado.mensagem,
                proximoPermitido: resultado.proximo_permitido
            };
        }
        
        return { permitido: false, mensagem: 'Erro na verificação' };
    } catch (error) {
        console.error('Erro ao verificar rate limit:', error);
        // Fail-safe: permitir em caso de erro
        return { permitido: true, mensagem: 'Verificação bypass por erro' };
    }
}

export function obterIPReal(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] || 
           req.headers['x-real-ip'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress || 
           'unknown';
}
```

### 3. Modificar Componente ListaSorteio
```javascript
// Adicionar verificação servidor-side antes das inserções
const verificarLimiteServidor = async (tipoOperacao = 'individual') => {
    try {
        const response = await fetch('/api/verificar-rate-limit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo: tipoOperacao })
        });
        
        const resultado = await response.json();
        return resultado;
    } catch (error) {
        console.error('Erro ao verificar limite:', error);
        return { permitido: true }; // Fail-safe
    }
};

// Modificar função adicionarDezParticipantes
const adicionarDezParticipantes = async () => {
    // Validações básicas existentes...
    
    // NOVA VERIFICAÇÃO: Rate limiting servidor-side
    const limiteSevidor = await verificarLimiteServidor('lote');
    if (!limiteSevidor.permitido) {
        mostrarFeedback(`Aguarde: ${limiteSevidor.mensagem}`, "erro");
        return;
    }
    
    // Resto da função permanece igual...
};

// Modificar função adicionarParticipante
const adicionarParticipante = async () => {
    // Validações básicas existentes...
    
    // NOVA VERIFICAÇÃO: Rate limiting servidor-side
    const limiteSevidor = await verificarLimiteServidor('individual');
    if (!limiteSevidor.permitido) {
        mostrarFeedback(`Aguarde: ${limiteSevidor.mensagem}`, "erro");
        return;
    }
    
    // Resto da função permanece igual...
};
```

### 4. Criar API Endpoint para Verificação
```javascript
// pages/api/verificar-rate-limit.js
import { verificarRateLimitIP, obterIPReal } from './middleware/rateLimitParticipantes';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }
    
    try {
        const { tipo } = req.body;
        const ip = obterIPReal(req);
        
        const tipoOperacao = tipo === 'lote' ? 'lote' : 'participante_add_individual';
        const resultado = await verificarRateLimitIP(req, ip, tipoOperacao);
        
        return res.status(200).json(resultado);
    } catch (error) {
        console.error('Erro na verificação de rate limit:', error);
        return res.status(500).json({ 
            permitido: true, // Fail-safe
            mensagem: 'Erro interno, prosseguindo...' 
        });
    }
}
```

## Vantagens desta Solução

1. **Segurança Real**: Baseada no IP, não pode ser burlada com localStorage
2. **Infraestrutura Existente**: Usa o sistema de rate limiting já implementado
3. **Graceful Degradation**: Em caso de erro, permite o funcionamento normal
4. **Dual Protection**: Mantém o controle frontend como backup UX
5. **Auditoria**: Todos os acessos ficam registrados no banco

## Implementação Gradual

1. **Fase 1**: Implementar verificação servidor-side como backup
2. **Fase 2**: Testar em produção por alguns dias
3. **Fase 3**: Tornar obrigatório removendo bypass de erro
4. **Fase 4**: Otimizar performance se necessário

## Configurações Recomendadas

- **Inserção Individual**: 60 segundos de intervalo
- **Inserção em Lote (10x)**: 300 segundos (5 minutos) de intervalo
- **Máximo de tentativas**: 3 tentativas consecutivas
- **Tempo de bloqueio**: 300 segundos após exceder tentativas

Esta solução resolve completamente o problema de burla via aba anônima mantendo a experiência do usuário.
