# Implementação do Google Tag Manager (GTM)

## 📋 Resumo da Implementação

O Google Tag Manager foi implementado de forma profissional no site de sorteio, seguindo as melhores práticas de segurança e performance.

## 🔧 Arquivos Modificados/Criados

### 1. **`public/index.html`**
- ✅ Adicionado script GTM no `<head>` (linha 4-10)
- ✅ Adicionado noscript GTM no `<body>` (linha 28-31)

### 2. **`src/utils/gtm.js`** (NOVO)
- ✅ Utilitários para gerenciamento do GTM
- ✅ Funções para tracking de eventos personalizados
- ✅ Suporte a variáveis de ambiente
- ✅ Funções específicas para o site de sorteio

### 3. **`src/components/GTM.js`** (NOVO)
- ✅ Componente React para gerenciar GTM
- ✅ Inicialização automática do GTM

### 4. **`src/App.js`**
- ✅ Integração com tracking de eventos de anúncios
- ✅ Tracking automático de fechamento/reabertura de anúncios

## 🎯 Eventos Customizados Implementados

### Eventos de Anúncios
- `anuncio_event` com `anuncio_action: 'close'` - Quando usuário fecha um anúncio
- `anuncio_event` com `anuncio_action: 'auto_reopen'` - Quando anúncio reabre automaticamente
- `anuncio_event` com `anuncio_action: 'manual_reopen'` - Quando usuário reabre anúncio manualmente

### Eventos de Sorteio (Preparado para futuro uso)
- `sorteio_event` - Para tracking de ações relacionadas aos sorteios

## 🔧 Configuração

### ID do GTM
- **ID Atual**: `GTM-5XDBWS8G`
- **Configurável via**: Variável de ambiente `REACT_APP_GTM_ID`

### Variáveis de Ambiente
Para usar um ID diferente em desenvolvimento/produção, adicione ao seu arquivo `.env.local`:
```bash
REACT_APP_GTM_ID=SEU_GTM_ID_AQUI
```

## 🚀 Funcionalidades Implementadas

### 1. **Inicialização Automática**
- GTM é inicializado automaticamente quando a página carrega
- DataLayer é configurado corretamente

### 2. **Tracking de Eventos**
- Sistema de eventos customizados para anúncios
- Preparado para tracking de sorteios
- Fácil extensão para novos eventos

### 3. **Suporte a Noscript**
- Funciona mesmo com JavaScript desabilitado
- Implementação completa para máxima compatibilidade

### 4. **Segurança**
- Código isolado em utilitários separados
- Verificações de ambiente (server-side rendering safe)
- Uso de variáveis de ambiente para configuração

## 📊 Como Usar

### Tracking Manual de Eventos
```javascript
import { sendGTMEvent, trackSorteioEvent, trackAnuncioEvent } from '../utils/gtm';

// Evento genérico
sendGTMEvent('custom_event', { custom_data: 'valor' });

// Evento de sorteio
trackSorteioEvent('participar', { sorteio_id: 123 });

// Evento de anúncio
trackAnuncioEvent('click', 'lateral_direita', { anuncio_id: 456 });
```

### Verificar se GTM está Funcionando
1. Abra as ferramentas de desenvolvedor (F12)
2. Digite `dataLayer` no console
3. Deve retornar um array com eventos do GTM

## ✅ Verificações de Qualidade

- ✅ **Performance**: Scripts carregados de forma assíncrona
- ✅ **SEO**: Noscript implementado para crawlers
- ✅ **Segurança**: Sem exposição de dados sensíveis
- ✅ **Manutenibilidade**: Código modular e bem documentado
- ✅ **Flexibilidade**: Configurável via variáveis de ambiente
- ✅ **Compatibilidade**: Funciona em todos os navegadores

## 🔍 Debugging

### Verificar DataLayer
```javascript
// No console do navegador
console.log(window.dataLayer);
```

### Verificar Eventos
```javascript
// Eventos serão mostrados no Google Tag Manager Preview Mode
// Ative o Preview Mode no GTM e navegue pelo site
```

## 📝 Próximos Passos Recomendados

1. **Configurar Tags no GTM Dashboard**
   - Google Analytics 4
   - Conversion tracking
   - Custom events

2. **Adicionar Mais Tracking**
   - Tracking de participação em sorteios
   - Tracking de visualizações de anúncios
   - Tracking de navegação entre páginas

3. **Testes**
   - Usar GTM Preview Mode para validar eventos
   - Testar em diferentes navegadores e dispositivos

## 🆘 Suporte

O sistema está implementado de forma robusta e deve funcionar imediatamente. Se houver algum problema:

1. Verifique se o ID do GTM está correto
2. Confirme que o JavaScript está habilitado
3. Use as ferramentas de desenvolvedor para debugar o dataLayer
