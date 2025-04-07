import React from "react";
import "./Header.css"; // Importando o CSS do Header
import { Link, useLocation } from "react-router-dom";

function Header() {
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
                    Sorteio
                </Link>
            </div>
            <nav className="menu">
                <Link to="/ganhadores" className={pathname === '/ganhadores' ? 'active' : ''}>Ganhadores</Link>
            </nav>
        </header>
    );
}

export default Header;
