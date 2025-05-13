import React from 'react';
import { useTranslation } from 'react-i18next';
import './LanguageSwitcher.css';

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="language-switcher">
      <button 
        className={`language-btn ${i18n.language === 'pt' ? 'active' : ''}`} 
        onClick={() => changeLanguage('pt')}
      >
        🇧🇷 PT
      </button>
      <button 
        className={`language-btn ${i18n.language === 'en' ? 'active' : ''}`} 
        onClick={() => changeLanguage('en')}
      >
        🇺🇸 EN
      </button>
    </div>
  );
}

export default LanguageSwitcher; 