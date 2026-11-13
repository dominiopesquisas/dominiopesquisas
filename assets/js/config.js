/**
 * CONFIGURAÇÃO DO SITE
 * sistema:   endereço do sistema Domínio Pesquisas (recebe cadastros e informa as pesquisas abertas).
 * No computador de desenvolvimento (localhost) usa o sistema rodando localmente.
 */
(function () {
  var local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  var sistema = local ? 'http://localhost:3100' : 'https://dominio-sistema.onrender.com';
  window.DP_CONFIG = {
    endpoint: sistema + '/api/publico/cadastro',
    projetos: sistema + '/api/publico/projetos',
    grupoWhatsapp: (location.pathname.indexOf('/cadastro') >= 0 ? '../' : '') + 'grupowhatsapp/',
  };
})();
