# Solução Complementar: CAPTCHA Condicional

## Conceito
Implementar CAPTCHA apenas quando detectado comportamento suspeito ou tentativas múltiplas.

## Quando Ativar CAPTCHA
1. Múltiplas inserções em pouco tempo
2. Mesmo IP com padrões suspeitos
3. Fingerprint similar detectado recentemente
4. Tentativas após bloqueio de rate limiting

## Implementação

### 1. Integração com Google reCAPTCHA
```javascript
// components/CaptchaCondicional.jsx
import { useState, useEffect } from 'react';

export function CaptchaCondicional({ onVerified, required = false }) {
    const [captchaToken, setCaptchaToken] = useState(null);
    const [isVisible, setIsVisible] = useState(required);
    
    useEffect(() => {
        if (isVisible && !window.grecaptcha) {
            const script = document.createElement('script');
            script.src = 'https://www.google.com/recaptcha/api.js';
            script.async = true;
            document.head.appendChild(script);
        }
    }, [isVisible]);
    
    const handleCaptchaChange = (token) => {
        setCaptchaToken(token);
        onVerified(token);
    };
    
    if (!isVisible) return null;
    
    return (
        <div className="captcha-container">
            <p>⚠️ Verificação de segurança necessária:</p>
            <div 
                className="g-recaptcha" 
                data-sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
                data-callback="handleCaptchaChange"
            />
        </div>
    );
}
```

### 2. Detector de Comportamento Suspeito
```javascript
// utils/suspiciousActivityDetector.js
export class SuspiciousActivityDetector {
    constructor() {
        this.activities = this.loadActivities();
    }
    
    loadActivities() {
        try {
            return JSON.parse(localStorage.getItem('activityHistory') || '[]');
        } catch {
            return [];
        }
    }
    
    saveActivities() {
        localStorage.setItem('activityHistory', JSON.stringify(this.activities));
    }
    
    recordActivity(type, data = {}) {
        this.activities.push({
            type,
            timestamp: Date.now(),
            data
        });
        
        // Manter apenas últimas 50 atividades
        if (this.activities.length > 50) {
            this.activities = this.activities.slice(-50);
        }
        
        this.saveActivities();
    }
    
    isSuspicious() {
        const now = Date.now();
        const last5Minutes = now - (5 * 60 * 1000);
        const last1Hour = now - (60 * 60 * 1000);
        
        const recentActivities = this.activities.filter(a => a.timestamp > last5Minutes);
        const hourlyActivities = this.activities.filter(a => a.timestamp > last1Hour);
        
        // Muitas atividades em 5 minutos
        if (recentActivities.length > 10) return true;
        
        // Padrão de inserções muito regular (bot)
        const insertions = recentActivities.filter(a => a.type === 'participant_add');
        if (insertions.length > 3) {
            const intervals = [];
            for (let i = 1; i < insertions.length; i++) {
                intervals.push(insertions[i].timestamp - insertions[i-1].timestamp);
            }
            
            // Intervalos muito regulares (possível bot)
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const isRegular = intervals.every(interval => Math.abs(interval - avgInterval) < 1000);
            if (isRegular) return true;
        }
        
        // Muitas tentativas em 1 hora
        if (hourlyActivities.length > 50) return true;
        
        return false;
    }
    
    requiresCaptcha() {
        return this.isSuspicious() || this.hasRecentBlocks();
    }
    
    hasRecentBlocks() {
        const now = Date.now();
        const last30Minutes = now - (30 * 60 * 1000);
        
        return this.activities.some(a => 
            a.type === 'rate_limit_block' && 
            a.timestamp > last30Minutes
        );
    }
}
```

### 3. Integração no Componente Principal
```javascript
// Modificação em ListaSorteio/index.js
import { CaptchaCondicional } from '../CaptchaCondicional';
import { SuspiciousActivityDetector } from '../../utils/suspiciousActivityDetector';

const ListaSorteio = ({ onReiniciarLista }) => {
    const [captchaRequired, setCaptchaRequired] = useState(false);
    const [captchaToken, setCaptchaToken] = useState(null);
    const detector = new SuspiciousActivityDetector();
    
    const verificarNecessidadeCaptcha = () => {
        const needsCaptcha = detector.requiresCaptcha();
        setCaptchaRequired(needsCaptcha);
        return needsCaptcha;
    };
    
    const adicionarParticipante = async () => {
        // Verificar se precisa de CAPTCHA
        if (verificarNecessidadeCaptcha() && !captchaToken) {
            mostrarFeedback("Verificação de segurança necessária", "erro");
            return;
        }
        
        // Registrar atividade
        detector.recordActivity('participant_add', {
            nome: novoParticipante.nome,
            timestamp: Date.now()
        });
        
        // Resto da função...
        
        // Limpar CAPTCHA após uso
        setCaptchaToken(null);
        setCaptchaRequired(false);
    };
    
    return (
        <div>
            {/* Formulário existente */}
            
            {captchaRequired && (
                <CaptchaCondicional 
                    required={captchaRequired}
                    onVerified={setCaptchaToken}
                />
            )}
            
            {/* Resto do componente */}
        </div>
    );
};
```

### 4. Verificação Server-side do CAPTCHA
```javascript
// pages/api/verify-captcha.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }
    
    const { token } = req.body;
    
    try {
        const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`
        });
        
        const data = await response.json();
        
        if (data.success && data.score > 0.5) { // reCAPTCHA v3 score
            res.status(200).json({ valid: true, score: data.score });
        } else {
            res.status(400).json({ valid: false, error: 'CAPTCHA inválido' });
        }
    } catch (error) {
        res.status(500).json({ valid: false, error: 'Erro na verificação' });
    }
}
```

## Configuração
```env
# .env.local
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=sua_site_key_aqui
RECAPTCHA_SECRET_KEY=sua_secret_key_aqui
```

## Vantagens
- Não impacta usuários normais
- Só ativa quando necessário
- Eficaz contra bots automatizados
- Boa experiência do usuário
