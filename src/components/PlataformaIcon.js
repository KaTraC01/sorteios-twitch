import React from 'react';
import './PlataformaIcon.css';

function PlataformaIcon({ plataforma, tamanho = 'pequeno' }) {
  // Define as classes baseadas no tamanho (para usar em diferentes contextos)
  const classesTamanho = {
    pequeno: 'plataforma-icon-pequeno',
    medio: 'plataforma-icon-medio',
    grande: 'plataforma-icon-grande'
  };

  // Mapeia o nome da plataforma para o arquivo de imagem correspondente
  const getIconeSrc = () => {
    switch (plataforma) {
      case 'twitch':
        return '/images/platforms/twitch-icon.svg';
      case 'youtube':
        return '/images/platforms/youtube-icon.svg';
      case 'steam':
        return '/images/platforms/steam-icon.svg';
      case 'xbox':
        return '/images/platforms/xbox-icon.svg';
      case 'playstation':
        return '/images/platforms/playstation-icon.svg';
      default:
        return '/images/platforms/twitch-icon.svg';
    }
  };

  // Textos alternativos para acessibilidade
  const getAltText = () => {
    switch (plataforma) {
      case 'twitch':
        return 'Ícone da Twitch';
      case 'youtube':
        return 'Ícone do YouTube';
      case 'steam':
        return 'Ícone da Steam';
      case 'xbox':
        return 'Ícone do Xbox';
      case 'playstation':
        return 'Ícone do PlayStation';
      default:
        return 'Ícone de plataforma';
    }
  };

  return (
    <div className={`plataforma-icon-container ${classesTamanho[tamanho] || 'plataforma-icon-pequeno'}`}>
      <img
        src={getIconeSrc()}
        alt={getAltText()}
        className="plataforma-icon"
      />
    </div>
  );
}

export default PlataformaIcon; 