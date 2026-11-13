(function () {
  'use strict';

  var CONFIG = window.DP_CONFIG || {};
  var BAIRROS = window.BAIRROS || {};
  var form = document.getElementById('form-cadastro');
  if (!form) return;
  var $ = function (id) { return document.getElementById(id); };

  var ESTADOS = [
    ['AC', 'Acre'], ['AL', 'Alagoas'], ['AP', 'Amapá'], ['AM', 'Amazonas'], ['BA', 'Bahia'],
    ['CE', 'Ceará'], ['DF', 'Distrito Federal'], ['ES', 'Espírito Santo'], ['GO', 'Goiás'],
    ['MA', 'Maranhão'], ['MT', 'Mato Grosso'], ['MS', 'Mato Grosso do Sul'], ['MG', 'Minas Gerais'],
    ['PA', 'Pará'], ['PB', 'Paraíba'], ['PR', 'Paraná'], ['PE', 'Pernambuco'], ['PI', 'Piauí'],
    ['RJ', 'Rio de Janeiro'], ['RN', 'Rio Grande do Norte'], ['RS', 'Rio Grande do Sul'],
    ['RO', 'Rondônia'], ['RR', 'Roraima'], ['SC', 'Santa Catarina'], ['SP', 'São Paulo'],
    ['SE', 'Sergipe'], ['TO', 'Tocantins'],
  ];

  /* ---------- Ativar/desativar campos ----------
     Um campo só é validado e enviado se estiver habilitado. Ele fica desabilitado quando
     está escondido (seção condicional fechada) ou quando o próprio script não o quer ativo. */
  function apply(el) {
    var box = el.closest('.reveal-box');
    var visible = !el.hidden && !(box && !box.classList.contains('is-shown'));
    el.disabled = !(visible && el._want !== false);
  }
  function setActive(el, want) { el._want = want; apply(el); }

  function fillSelect(sel, items, placeholder) {
    var html = '<option value="">' + placeholder + '</option>';
    items.forEach(function (it) {
      var v = Array.isArray(it) ? it[0] : it;
      var l = Array.isArray(it) ? it[1] : it;
      html += '<option value="' + DP.esc(v) + '">' + DP.esc(l) + '</option>';
    });
    sel.innerHTML = html;
  }

  /* ---------- Cidades do IBGE ---------- */
  var cacheCidades = {};
  function carregarCidades(uf) {
    if (cacheCidades[uf]) return Promise.resolve(cacheCidades[uf]);
    var ctrl = 'AbortController' in window ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 12000);
    return fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/' + uf + '/municipios', ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (lista) {
        var nomes = lista.map(function (m) { return m.nome; }).sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
        cacheCidades[uf] = nomes;
        return nomes;
      })
      .finally(function () { clearTimeout(timer); });
  }

  /** Liga um combo de Estado a um combo de Cidade (com campo de texto reserva se o IBGE falhar). */
  function cascata(estadoSel, cidadeSel, cidadeTxt, aoMudarCidade) {
    var token = 0;
    var field = cidadeSel.closest('.field');
    function modo(texto) {
      cidadeSel.hidden = texto;
      cidadeTxt.hidden = !texto;
      apply(cidadeSel); apply(cidadeTxt);
    }
    estadoSel.addEventListener('change', function () {
      var uf = estadoSel.value;
      var meu = ++token;
      cidadeTxt.value = '';
      modo(false);
      if (!uf) {
        fillSelect(cidadeSel, [], 'Escolha o estado');
        setActive(cidadeSel, false); setActive(cidadeTxt, false);
        aoMudarCidade();
        return;
      }
      fillSelect(cidadeSel, [], 'Carregando cidades…');
      setActive(cidadeSel, false);
      field.classList.add('is-loading');
      aoMudarCidade();
      carregarCidades(uf).then(function (nomes) {
        if (meu !== token) return;
        fillSelect(cidadeSel, nomes, 'Selecione a cidade');
        setActive(cidadeSel, true); setActive(cidadeTxt, false);
      }).catch(function () {
        if (meu !== token) return;
        // Sem conexão com o IBGE: deixa a pessoa digitar a cidade.
        setActive(cidadeSel, false); setActive(cidadeTxt, true);
        modo(true);
        cidadeTxt.placeholder = 'Digite o nome da cidade';
      }).finally(function () {
        if (meu === token) { field.classList.remove('is-loading'); aoMudarCidade(); }
      });
    });
    cidadeSel.addEventListener('change', aoMudarCidade);
    cidadeTxt.addEventListener('input', aoMudarCidade);
  }

  /* ---------- Bairro ---------- */
  var estado = $('estado'), cidade = $('cidade'), cidadeTxt = $('cidade_texto');
  var bairro = $('bairro'), bairroTxt = $('bairro_texto');
  var ultimaChaveBairro = null;

  function cidadeAtual() {
    if (!cidade.disabled && cidade.value) return cidade.value;
    if (!cidadeTxt.disabled && cidadeTxt.value.trim()) return cidadeTxt.value.trim();
    return '';
  }
  function atualizarBairro() {
    var uf = estado.value, c = cidadeAtual();
    var chave = uf + '|' + c;
    var lista = BAIRROS[chave];
    if (chave === ultimaChaveBairro) return;
    ultimaChaveBairro = chave;
    if (!c) {
      bairro.hidden = false; bairroTxt.hidden = true;
      fillSelect(bairro, [], 'Escolha a cidade');
      setActive(bairro, false); setActive(bairroTxt, false);
    } else if (lista) {
      bairro.hidden = false; bairroTxt.hidden = true;
      fillSelect(bairro, lista.concat([['__outro', 'Outro (não está na lista)']]), 'Selecione o bairro');
      setActive(bairro, true); setActive(bairroTxt, false);
    } else {
      bairro.hidden = true; bairroTxt.hidden = false;
      bairroTxt.value = '';
      setActive(bairro, false); setActive(bairroTxt, true);
    }
    atualizarCondicionais();
  }

  /* ---------- Campos condicionais (data-show-if="campo=valor") ---------- */
  function valorDe(name) {
    var els = form.querySelectorAll('[name="' + name + '"]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.disabled) continue;
      if (el.type === 'radio' || el.type === 'checkbox') { if (el.checked) return el.value; }
      else return el.value;
    }
    return '';
  }
  function atualizarCondicionais() {
    form.querySelectorAll('.reveal-box').forEach(function (box) {
      var cond = box.getAttribute('data-show-if').split('=');
      var show = valorDe(cond[0]) === cond[1];
      box.classList.toggle('is-shown', show);
      box.querySelectorAll('input, select').forEach(apply);
      if (!show) box.classList.remove('is-invalid');
    });
    atualizarIdades();
  }

  /* ---------- Idades dos filhos ---------- */
  var idadesBox = $('idades'), fIdades = $('f-idades'), qtd = $('qtd_filhos');
  function atualizarIdades() {
    var n = (!qtd.disabled && parseInt(qtd.value, 10)) || 0;
    var antigos = Array.prototype.map.call(idadesBox.querySelectorAll('input'), function (i) { return i.value; });
    if (idadesBox.children.length !== n) {
      var html = '';
      for (var i = 1; i <= n; i++) {
        html += '<label class="sr-only" for="idade_' + i + '">Idade do filho ' + i + '</label>' +
          '<input class="input" type="number" inputmode="numeric" min="0" max="80" id="idade_' + i + '" name="idade_' + i +
          '" placeholder="Filho ' + i + '" required data-msg="Informe a idade de cada filho." value="' + (antigos[i - 1] || '') + '">';
      }
      idadesBox.innerHTML = html;
    }
    fIdades.hidden = n === 0;
    idadesBox.querySelectorAll('input').forEach(function (el) { el.disabled = n === 0; });
  }

  /* ---------- Máscara de telefone ---------- */
  var tel = $('telefone');
  tel.addEventListener('input', function () {
    var d = tel.value.replace(/\D/g, '').slice(0, 11);
    var out = d;
    if (d.length > 2) out = '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length > 6) {
      var corpo = d.slice(2);
      var meio = corpo.length > 8 ? 5 : 4;
      out = '(' + d.slice(0, 2) + ') ' + corpo.slice(0, meio) + '-' + corpo.slice(meio);
    }
    tel.value = out;
  });

  /* ---------- Validação ---------- */
  var hoje = new Date();
  var hojeISO = new Date(hoje.getTime() - hoje.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  $('nascimento').max = hojeISO;

  function fieldDe(el) { return el.closest('.field'); }
  function marcar(el, ok) {
    var f = fieldDe(el);
    if (!f) return;
    f.classList.toggle('is-invalid', !ok);
    var msg = f.querySelector('.error-msg');
    if (msg) msg.textContent = ok ? '' : (el.getAttribute('data-msg') || f.querySelector('[data-msg]') && f.querySelector('[data-msg]').getAttribute('data-msg') || 'Preencha este campo.');
    var alvo = el.type === 'radio' ? form.querySelectorAll('[name="' + el.name + '"]') : [el];
    Array.prototype.forEach.call(alvo, function (x) { x.setAttribute('aria-invalid', ok ? 'false' : 'true'); });
  }
  function valido(el) {
    if (el.name === 'nome') el.value = el.value.replace(/\s+/g, ' ').trimStart();
    if (!el.checkValidity()) return false;
    if (el.name === 'nome' && el.value.trim().split(' ').length < 2) return false;
    return true;
  }
  function controlesAtivos() {
    return Array.prototype.filter.call(form.elements, function (el) {
      return (el.tagName === 'INPUT' || el.tagName === 'SELECT') && !el.disabled && el.name && el.name !== 'website';
    });
  }
  function validarTudo() {
    var primeiro = null, vistos = {}, idadeRuim = null, idadeAlguma = null;
    controlesAtivos().forEach(function (el) {
      if (el.type === 'radio') { if (vistos[el.name]) return; vistos[el.name] = true; }
      var ok = valido(el);
      if (/^idade_/.test(el.name)) {
        // as idades dos filhos são validadas como um bloco só
        idadeAlguma = idadeAlguma || el;
        if (!ok && !idadeRuim) idadeRuim = el;
      } else {
        marcar(el, ok);
      }
      if (!ok && !primeiro) primeiro = el;
    });
    if (idadeAlguma) marcar(idadeRuim || idadeAlguma, !idadeRuim);
    return primeiro;
  }
  form.addEventListener('input', revalidar);
  form.addEventListener('change', revalidar);
  function revalidar(e) {
    var el = e.target;
    if (!el.name || el.disabled) return;
    var f = fieldDe(el);
    if (f && f.classList.contains('is-invalid')) {
      if (/^idade_/.test(el.name)) {
        var todos = Array.prototype.every.call(idadesBox.querySelectorAll('input'), valido);
        marcar(el, todos);
      } else {
        marcar(el, valido(el));
      }
    }
  }

  /* ---------- Alerta ---------- */
  var alerta = $('alerta'), alertaTxt = $('alerta-texto');
  function mostrarAlerta(html) { alertaTxt.innerHTML = html; alerta.classList.add('is-shown'); alerta.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  function esconderAlerta() { alerta.classList.remove('is-shown'); }

  /* ---------- Projeto (vindo do link ?projeto=...) ---------- */
  var params = new URLSearchParams(location.search);
  var projetoId = params.get('projeto') || '';
  var projeto = (window.PROJETOS || []).filter(function (p) { return p.id === projetoId; })[0];
  if (projeto) {
    $('nome-projeto').textContent = projeto.titulo + ' (' + projeto.local + ')';
    $('banner-projeto').hidden = false;
  }

  /* ---------- Montagem dos dados ---------- */
  function dados() {
    var fd = new FormData(form);
    var g = function (k) { return (fd.get(k) || '').toString().trim(); };
    var outro = function (k, marcador, kOutro) { return g(k) === marcador ? g(kOutro) : g(k); };
    var idades = [];
    for (var i = 1; i <= 10; i++) if (fd.has('idade_' + i)) idades.push(g('idade_' + i));
    var nasceuBR = g('nasceu_brasil') === 'Sim';
    var uf = g('estado');
    return {
      projeto: projeto ? projeto.titulo + ' (' + projeto.local + ')' : projetoId,
      nome: g('nome'),
      nascimento: g('nascimento'),
      genero: outro('genero', '__outro', 'genero_outro'),
      cor_raca: g('cor_raca'),
      religiao: outro('religiao', '__outra', 'religiao_outra'),
      escolaridade: g('escolaridade'),
      profissao: outro('profissao', '__outra', 'profissao_outra'),
      profissao_detalhe: g('vendedor_o_que') || g('autonomo_o_que'),
      estado: uf,
      cidade: g('cidade') || g('cidade_texto'),
      bairro: g('bairro') === '__outro' ? g('bairro_outro') : (g('bairro') || g('bairro_texto')),
      nasceu_no_brasil: g('nasceu_brasil'),
      naturalidade_cidade: nasceuBR ? (g('nat_cidade') || g('nat_cidade_texto')) : g('nat_cidade_ext'),
      naturalidade_estado: nasceuBR ? g('nat_estado') : '',
      naturalidade_pais: nasceuBR ? 'Brasil' : g('nat_pais'),
      tem_filhos: g('tem_filhos'),
      qtd_filhos: g('tem_filhos') === 'Sim' ? g('qtd_filhos') : '0',
      idades_filhos: idades.join(', '),
      renda: g('renda'),
      telefone: g('telefone'),
      email: g('email').toLowerCase(),
      consentimento: g('consentimento') === 'Sim' ? 'Sim' : 'Não',
      website: (document.getElementById('website').value || ''),
      origem: location.href,
    };
  }

  /* ---------- Envio ---------- */
  var btn = $('btn-enviar');
  var btnHTML = btn.innerHTML;
  function sucesso(nome) {
    form.hidden = true;
    $('banner-projeto').hidden = true;
    esconderAlerta();
    $('primeiro-nome').textContent = (nome || '').split(' ')[0] || 'pelo cadastro';
    if (CONFIG.grupoWhatsapp) $('link-grupo').href = CONFIG.grupoWhatsapp;
    var s = $('sucesso');
    s.hidden = false;
    $('card').scrollIntoView({ behavior: 'smooth', block: 'start' });
    s.focus({ preventScroll: true });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    esconderAlerta();
    var d = dados();
    if (d.website) { sucesso(d.nome); return; } // robô de spam: finge que deu certo

    var invalido = validarTudo();
    if (invalido) {
      mostrarAlerta('Alguns campos precisam de atenção. Confira os itens destacados em vermelho.');
      setTimeout(function () {
        (invalido.type === 'radio' ? invalido : invalido).focus({ preventScroll: true });
        fieldDe(invalido).scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 350);
      return;
    }
    if (!CONFIG.endpoint) {
      mostrarAlerta('O formulário ainda não está conectado à planilha. Fale com a gente pelo WhatsApp <a href="https://wa.me/5541995240324">(41) 99524-0324</a>.');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = 'Enviando…';
    var ctrl = 'AbortController' in window ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 70000); // servidor gratuito pode levar ~50 s para acordar
    fetch(CONFIG.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(d),
      redirect: 'follow',
      signal: ctrl ? ctrl.signal : undefined,
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res || !res.ok) throw new Error((res && res.erro) || 'Falha no envio');
        sucesso(d.nome);
      })
      .catch(function () {
        mostrarAlerta('Não conseguimos enviar seu cadastro agora. Verifique sua internet e tente de novo. Se o problema continuar, fale com a gente pelo WhatsApp <a href="https://wa.me/5541995240324">(41) 99524-0324</a>.');
      })
      .finally(function () {
        clearTimeout(timer);
        btn.disabled = false;
        btn.innerHTML = btnHTML;
      });
  });

  /* ---------- Inicialização ---------- */
  // "Acorda" o servidor (plano gratuito dorme sem uso) enquanto a pessoa preenche o formulário.
  if (CONFIG.endpoint) {
    try { fetch(CONFIG.endpoint.replace(/\/api\/.*$/, '/saude'), { mode: 'no-cors', cache: 'no-store' }).catch(function () {}); } catch (e) { /* ignora */ }
  }
  fillSelect(estado, ESTADOS.map(function (e) { return [e[0], e[1]]; }), 'Selecione');
  fillSelect($('nat_estado'), ESTADOS.map(function (e) { return [e[0], e[1]]; }), 'Selecione');
  cascata(estado, cidade, cidadeTxt, atualizarBairro);
  cascata($('nat_estado'), $('nat_cidade'), $('nat_cidade_texto'), function () {});
  setActive(cidade, false); setActive(cidadeTxt, false);
  setActive(bairro, false); setActive(bairroTxt, false);
  setActive($('nat_cidade'), false); setActive($('nat_cidade_texto'), false);
  form.addEventListener('change', function (e) {
    if (e.target.type === 'radio' || e.target.tagName === 'SELECT') atualizarCondicionais();
  });
  atualizarCondicionais();
})();
