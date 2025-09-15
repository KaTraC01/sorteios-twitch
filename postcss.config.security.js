
/**
 * CONFIGURAÇÃO SEGURA DO POSTCSS
 * ===============================
 */

module.exports = {
  parser: 'safe-parser',
  
  plugins: [
    // Plugins seguros
    require('autoprefixer'),
    
    // Validação de tamanho
    {
      postcssPlugin: 'size-validator',
      OnceExit(root, { result }) {
        const css = root.toString();
        if (css.length > 1024 * 1024) { // 1MB
          throw new Error('CSS muito grande - possível ataque');
        }
      }
    }
  ]
};
