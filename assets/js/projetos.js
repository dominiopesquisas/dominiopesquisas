/**
 * PESQUISAS ABERTAS
 * A lista agora vem do sistema (painel → projeto → aba Dados → "Divulgação no site").
 * Para uma pesquisa aparecer no site: marque "Mostrar no site" e deixe o projeto como "Recrutando".
 *
 * Esta lista abaixo é só uma RESERVA, usada se o sistema não responder.
 * Normalmente deve ficar vazia.
 */
window.PROJETOS = [];

/** Busca as pesquisas abertas no sistema (com reserva para a lista acima). */
window.carregarProjetos = function () {
  var url = (window.DP_CONFIG || {}).projetos;
  var reserva = function () { return (window.PROJETOS || []).filter(function (p) { return p.status !== 'encerrada'; }); };
  if (!url || !window.fetch) return Promise.resolve(reserva());
  var ctrl = window.AbortController ? new AbortController() : null;
  var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
  return fetch(url, { signal: ctrl ? ctrl.signal : undefined })
    .then(function (r) { return r.json(); })
    .then(function (d) { clearTimeout(t); if (!d || !d.ok) throw new Error('sem dados'); return d.projetos || []; })
    .catch(function () { clearTimeout(t); return reserva(); });
};
