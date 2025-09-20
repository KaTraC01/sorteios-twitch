# Solução Alternativa: Identificador de Sessão Híbrido

## Conceito
Combinar múltiplas técnicas de identificação para tornar mais difícil burlar o sistema.

## Implementação

### 1. Gerador de Fingerprint do Navegador
```javascript
// src/utils/browserFingerprint.js
export function gerarFingerprintNavegador() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Fingerprint test', 2, 2);
    
    const fingerprint = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        canvas: canvas.toDataURL(),
        webgl: getWebGLFingerprint(),
        fonts: detectFonts(),
        timestamp: Date.now()
    };
    
    return btoa(JSON.stringify(fingerprint)).slice(0, 32);
}

function getWebGLFingerprint() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return 'no-webgl';
        
        return gl.getParameter(gl.RENDERER) + gl.getParameter(gl.VENDOR);
    } catch (e) {
        return 'webgl-error';
    }
}

function detectFonts() {
    const testFonts = ['Arial', 'Times', 'Helvetica', 'Georgia', 'Verdana'];
    const detected = [];
    
    testFonts.forEach(font => {
        const span = document.createElement('span');
        span.style.fontFamily = font;
        span.textContent = 'test';
        document.body.appendChild(span);
        
        if (span.offsetWidth > 0) {
            detected.push(font);
        }
        
        document.body.removeChild(span);
    });
    
    return detected.join(',');
}
```

### 2. Sistema de Armazenamento Múltiplo
```javascript
// src/utils/storageManager.js
export class StorageManager {
    constructor() {
        this.storageKeys = {
            localStorage: 'tempoExpiracao',
            sessionStorage: 'tempoExpiracaoSessao',
            indexedDB: 'tempoExpiracaoIDB',
            cookie: 'tempoExpiracaoCookie'
        };
    }
    
    async setExpiracao(timestamp) {
        // localStorage
        localStorage.setItem(this.storageKeys.localStorage, timestamp);
        
        // sessionStorage
        sessionStorage.setItem(this.storageKeys.sessionStorage, timestamp);
        
        // Cookie
        document.cookie = `${this.storageKeys.cookie}=${timestamp}; max-age=3600; path=/`;
        
        // IndexedDB
        await this.setIndexedDBValue(this.storageKeys.indexedDB, timestamp);
        
        // Server-side storage
        await this.setServerStorage(timestamp);
    }
    
    async getExpiracao() {
        const valores = await Promise.all([
            localStorage.getItem(this.storageKeys.localStorage),
            sessionStorage.getItem(this.storageKeys.sessionStorage),
            this.getCookieValue(this.storageKeys.cookie),
            this.getIndexedDBValue(this.storageKeys.indexedDB),
            this.getServerStorage()
        ]);
        
        // Retorna o maior valor (mais restritivo)
        const valoresValidos = valores.filter(v => v && !isNaN(v)).map(Number);
        return valoresValidos.length > 0 ? Math.max(...valoresValidos) : null;
    }
    
    async setIndexedDBValue(key, value) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('SorteioStorage', 1);
            
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('config')) {
                    db.createObjectStore('config', { keyPath: 'key' });
                }
            };
            
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['config'], 'readwrite');
                const store = transaction.objectStore('config');
                store.put({ key, value });
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            };
        });
    }
    
    getCookieValue(name) {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? match[2] : null;
    }
    
    async setServerStorage(timestamp) {
        try {
            await fetch('/api/set-session-timer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    fingerprint: gerarFingerprintNavegador(),
                    timestamp 
                })
            });
        } catch (error) {
            console.warn('Erro ao salvar no servidor:', error);
        }
    }
}
```

### 3. API para Armazenamento Server-side
```javascript
// pages/api/set-session-timer.js
import { mcp_supabase_execute_sql } from '../../mcp-functions';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }
    
    try {
        const { fingerprint, timestamp } = req.body;
        const ip = req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
        
        const query = `
            INSERT INTO secure_rate_control (
                identificador, 
                tipo_operacao, 
                timestamp_operacao,
                metadados_operacao
            ) VALUES (
                '${fingerprint}', 
                'session_timer', 
                NOW(),
                '{"ip": "${ip}", "expires": ${timestamp}}'::jsonb
            ) ON CONFLICT (identificador, tipo_operacao) 
            DO UPDATE SET 
                timestamp_operacao = NOW(),
                metadados_operacao = '{"ip": "${ip}", "expires": ${timestamp}}'::jsonb;
        `;
        
        await mcp_supabase_execute_sql({
            project_id: 'nsqiytflqwlyqhdmueki',
            query
        });
        
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Erro ao salvar timer:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
}
```

## Vantagens
- Mais difícil de burlar que localStorage simples
- Múltiplas camadas de verificação
- Funciona mesmo com algumas técnicas de bypass

## Desvantagens
- Mais complexo de implementar
- Pode ser contornado por usuários técnicos
- Performance ligeiramente inferior
