import React from "react";
import "./Header.css"; // Importando o CSS do Header
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from 'react-i18next'; // Importar hook de tradução
import LanguageSwitcher from "../LanguageSwitcher"; // Importar o componente de seleção de idioma

function Header() {
    const { t } = useTranslation(); // Hook de tradução
    // Usando o hook useLocation para obter a rota atual
    const location = useLocation();
    const pathname = location.pathname;
    
    return (
        <header className="header">
            <div className="logo">
                <Link to="/" className={`sorteio-link ${pathname === '/' ? 'active' : ''}`}>
                    {/* Usando a imagem PNG da pasta public */}
                    <img 
                        src="/presente.png" 
                        alt="Presente" 
                        style={{width: '24px', height: '24px', marginRight: '8px', verticalAlign: 'middle'}} 
                    /> 
                    {t('header.sorteio')}
                </Link>
            </div>
            <nav className="menu">
                <Link to="/ganhadores" className={pathname === '/ganhadores' ? 'active' : ''}>
                    {/* Adicionando ícone de troféu */}
                    <span className="trofeu-icon" role="img" aria-label="Troféu">🏆</span>
                    <span style={{marginLeft: '5px'}}>{t('header.ganhadores')}</span>
                </Link>
                <LanguageSwitcher />
            </nav>
        </header>
    );
}

export default Header;
