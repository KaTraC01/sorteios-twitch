import React, { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next'; // Importar hook de tradução
import "./Timer.css"; // Importa o CSS do Timer

function Timer({ listaReiniciada }) {
    const { t } = useTranslation(); // Hook de tradução
    // Estado para armazenar o tempo restante
    const [tempoRestante, setTempoRestante] = useState(calcularTempoRestante());

    // Função que calcula o tempo restante até o sorteio
    function calcularTempoRestante() {
        const agora = new Date();
        const sorteioHora = new Date();
        sorteioHora.setHours(21, 0, 0, 0); // Define a hora do sorteio

        let diferenca = sorteioHora - agora;
        if (diferenca <= 0) {
            sorteioHora.setDate(sorteioHora.getDate() + 1); // Se já passou da hora, define para o dia seguinte
            diferenca = sorteioHora - agora;
        }

        const horas = String(Math.floor(diferenca / (1000 * 60 * 60))).padStart(2, "0");
        const minutos = String(Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, "0");
        const segundos = String(Math.floor((diferenca % (1000 * 60)) / 1000)).padStart(2, "0");

        return `${horas}:${minutos}:${segundos}`;
    }

    // Atualiza o timer a cada segundo
    useEffect(() => {
        const intervalo = setInterval(() => {
            setTempoRestante(calcularTempoRestante());
        }, 1000);

        return () => clearInterval(intervalo); // Limpa o intervalo ao desmontar
    }, []);

    // **Correção: Agora o timer reseta corretamente quando a lista for reiniciada**
    useEffect(() => {
        if (listaReiniciada) {
            setTempoRestante(calcularTempoRestante()); // Recalcula o tempo restante ao resetar a lista
        }
    }, [listaReiniciada]);

    return (
        <div className="timer">
            <span>⏳ {t('timer.sorteioEm')}: {tempoRestante}</span>
        </div>
    );
}

export default Timer;
