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
                <Link to="/" className={`sorteio-link ${pathname === '/' ? 'active' : ''}`}>🎲 Sorteio</Link>
            </div>
            <nav className="menu">
                <Link to="/ganhadores" className={pathname === '/ganhadores' ? 'active' : ''}>Ganhadores</Link>
            </nav>
        </header>
    );
}

export default Header;
