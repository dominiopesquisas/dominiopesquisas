/**
 * CONFIGURAÇÃO DO SITE
 * sistema:   endereço do sistema Domínio Pesquisas (recebe cadastros, informa as pesquisas abertas
 *            e as perguntas do formulário de cadastro, definidas na tela "Formulário do site").
 * No computador de desenvolvimento (localhost) usa o sistema rodando localmente.
 */
(function () {
  var local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  var sistema = local ? 'http://localhost:3100' : 'https://app.dominiopesquisas.com.br';
  window.DP_CONFIG = {
    sistema: sistema,
    endpoint: sistema + '/api/publico/cadastro',
    projeto: sistema + '/api/publico/projeto/',
    projetos: sistema + '/api/publico/projetos',
    formulario: sistema + '/api/publico/formulario',
    grupoWhatsapp: (location.pathname.indexOf('/cadastro') >= 0 ? '../' : '') + 'grupowhatsapp/',
  };
})();
