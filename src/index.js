import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css"; // Importação do CSS global (será criado em seguida)
import './i18n'; // Importar configuração do i18n

// Renderiza o aplicativo
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);

// Se você quiser implementar service workers para PWA no futuro
// serviceWorkerRegistration.register();
