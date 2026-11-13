/**
 * CONFIGURAÇÃO DO FORMULÁRIO
 * endpoint: endereço que recebe os cadastros (sistema Domínio Pesquisas).
 * No computador de desenvolvimento (localhost) usa o sistema rodando localmente.
 */
(function () {
  var local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  window.DP_CONFIG = {
    endpoint: local
      ? 'http://localhost:3100/api/publico/cadastro'
      : 'https://dominio-sistema.onrender.com/api/publico/cadastro',
    grupoWhatsapp: '../grupowhatsapp/',
  };
})();
