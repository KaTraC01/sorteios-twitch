import React from "react";
import "./Header.css"; // Importando o CSS do Header
import { Link } from "react-router-dom";

function Header() {
    return (
        <header className="header">
            <div className="logo">🎲 Sorteio</div>
            <nav className="menu">
                <Link to="/">Lista</Link>
                <Link to="/ganhadores">Ganhadores</Link>
            </nav>
        </header>
    );
}

export default Header;
