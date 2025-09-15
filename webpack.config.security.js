
/**
 * CONFIGURAÇÃO SEGURA DO WEBPACK
 * ===============================
 * 
 * Configurações para mitigar vulnerabilidades do webpack-dev-server
 */

const path = require('path');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  
  // Configurações de segurança para dev server
  devServer: {
    allowedHosts: ["localhost","127.0.0.1",".vercel.app"],
    historyApiFallback: false,
    hot: false,
    liveReload: false,
    
    // Headers de segurança
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block'
    },
    
    // Configurações de rede seguras
    host: 'localhost',
    port: 3000,
    
    // Desabilitar funcionalidades perigosas
    overlay: false,
    client: {
      overlay: false,
      logging: 'warn'
    }
  },
  
  // Otimizações de segurança
  optimization: {
    minimize: process.env.NODE_ENV === 'production',
    
    // Evitar chunks muito grandes
    splitChunks: {
      maxSize: 250000 // 250KB
    }
  },
  
  // Configurações de resolução seguras
  resolve: {
    // Prevenir path traversal
    symlinks: false,
    
    // Extensões permitidas
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
  }
};
