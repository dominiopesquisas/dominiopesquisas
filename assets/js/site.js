(function () {
  'use strict';
  var BASE = document.documentElement.getAttribute('data-base') || '';
  var ICONS = BASE + 'assets/img/icons.svg';
  function icon(name) {
    return '<svg aria-hidden="true"><use href="' + ICONS + '#i-' + name + '"></use></svg>';
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  window.DP = { icon: icon, esc: esc };

  // Cabeçalho: sombra ao rolar
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Menu mobile
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('nav');
  if (toggle && nav) {
    var setOpen = function (open) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.innerHTML = icon(open ? 'x' : 'menu');
    };
    toggle.addEventListener('click', function () { setOpen(!nav.classList.contains('is-open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  }

  // Pesquisas abertas
  var list = document.getElementById('lista-projetos');
  if (list && window.carregarProjetos) window.carregarProjetos().then(pintarProjetos);
  function pintarProjetos(projetos) {
    list.removeAttribute('aria-busy');
    if (!projetos.length) {
      list.outerHTML =
        '<div class="empty-state"><h3>Nenhuma pesquisa com inscrição aberta agora</h3>' +
        '<p>Novas pesquisas surgem toda semana. Faça seu cadastro e entre no grupo do WhatsApp para ser avisado(a) primeiro.</p>' +
        '<a class="btn btn--primary" href="cadastro/">Fazer meu cadastro ' + icon('arrow-right') + '</a></div>';
    } else {
      list.innerHTML = projetos.map(function (p) {
        var aberta = p.status === 'aberta';
        var facts = '';
        if (p.quando) facts += '<li>' + icon('calendar') + '<span><strong>Quando:</strong> ' + esc(p.quando) + '</span></li>';
        if (p.incentivo) facts += '<li>' + icon('money') + '<span><strong>Incentivo:</strong> ' + esc(p.incentivo) + '</span></li>';
        if (p.requisito) facts += '<li>' + icon('info') + '<span><strong>Importante:</strong> ' + esc(p.requisito) + '</span></li>';
        var chips = p.cidades && p.cidades.length
          ? '<ul class="project-chips" aria-label="Cidades aceitas">' + p.cidades.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>'
          : '';
        var cta = aberta
          ? '<a class="btn btn--dark btn--block" href="cadastro/?projeto=' + encodeURIComponent(p.id) + '">Quero participar ' + icon('arrow-right') + '</a>'
          : '<span class="btn btn--outline btn--block" aria-disabled="true">Inscrições em breve</span>';
        return '<article class="project is-visible">' +
          '<div class="project-head"><span class="project-place">' + icon('pin') + esc(p.local) + '</span>' +
          (aberta ? '<span class="pill pill--ok"><span class="dot"></span>Inscrições abertas</span>' : '<span class="pill pill--warn">Em breve</span>') +
          '</div>' +
          '<h3>' + esc(p.titulo) + '</h3>' +
          (p.resumo ? '<p>' + esc(p.resumo) + '</p>' : '') + chips +
          (facts ? '<ul class="project-facts">' + facts + '</ul>' : '') +
          cta +
          '</article>';
      }).join('');
    }
  }

  // Animação de entrada
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('is-visible'); });
  }

  // Ano no rodapé
  var y = document.getElementById('ano');
  if (y) y.textContent = new Date().getFullYear();
})();
