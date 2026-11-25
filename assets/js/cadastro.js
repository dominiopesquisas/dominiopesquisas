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
     está escondido (seção condicional fechada), quando a equipe tirou a pergunta do formulário
     (data-desligado) ou quando o próprio script não o quer ativo. */
  function apply(el) {
    var box = el.closest('.reveal-box');
    var visible = !el.hidden && !(box && !box.classList.contains('is-shown')) && !el.closest('[data-desligado]');
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
    // perguntas de várias respostas obrigatórias: pelo menos uma marcada
    form.querySelectorAll('[data-multipla][data-obrigatoria]').forEach(function (f) {
      var caixas = f.querySelectorAll('input[type="checkbox"]');
      if (!caixas.length || caixas[0].disabled) return;
      var ok = grupoMarcado(f);
      marcar(caixas[0], ok);
      if (!ok && !primeiro) primeiro = caixas[0];
    });
    return primeiro;
  }
  function grupoMarcado(f) { return !!f.querySelector('input[type="checkbox"]:checked'); }
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
      } else if (f.hasAttribute('data-multipla')) {
        marcar(el, !f.hasAttribute('data-obrigatoria') || grupoMarcado(f));
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
  var projeto = null;
  if (projetoId && window.carregarProjetos) {
    window.carregarProjetos().then(function (lista) {
      projeto = lista.filter(function (p) { return p.id === projetoId; })[0] || null;
      if (projeto && !form.hidden) {
        $('nome-projeto').textContent = projeto.titulo + (projeto.local ? ' (' + projeto.local + ')' : '');
        $('banner-projeto').hidden = false;
      }
    });
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
      projeto: projeto ? projeto.titulo + (projeto.local ? ' (' + projeto.local + ')' : '') : projetoId,
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
      extras: extrasPreenchidos(fd),
      formularioVersao: versaoAplicada,
    };
  }

  /* ---------- Envio ---------- */
  var btn = $('btn-enviar');
  var btnHTML = btn.innerHTML;
  function sucesso(nome, res) {
    res = res || {};
    form.hidden = true;
    $('banner-projeto').hidden = true;
    esconderAlerta();
    var primeiro = (nome || '').split(' ')[0] || '';
    var msg = $('msg-sucesso');
    // já tinha cadastro: nada é trocado (a equipe confere o que veio diferente)
    if (res.novo === false) {
      msg.textContent = 'Obrigado' + (primeiro ? ', ' + primeiro : '') + '! Você já tinha cadastro com a gente. Para sua segurança, nada foi trocado automaticamente: nossa equipe confere os dados enviados. '
        + (res.projeto ? 'Sua inscrição na pesquisa "' + res.projeto + '" foi registrada e vamos te mandar o convite pelo WhatsApp.' : 'Vamos entrar em contato quando houver uma pesquisa para você.');
    } else if (res.convite) {
      msg.textContent = 'Obrigado' + (primeiro ? ', ' + primeiro : '') + '! Agora falta pouco: responda as perguntas da pesquisa' + (res.projeto ? ' "' + res.projeto + '"' : '') + ' para a equipe ver se o seu perfil combina.';
    } else {
      $('primeiro-nome').textContent = primeiro || 'pelo cadastro';
    }
    if (res.convite) { $('link-convite').href = res.convite; $('passo-pesquisa').hidden = false; }
    if (res.app) { $('link-app').href = res.app; $('passo-app').hidden = false; $('dica-app').hidden = false; }
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
      mostrarAlerta('O formulário ainda não está conectado à planilha. Fale com a gente pelo WhatsApp <a href="https://wa.me/5541997526552?text=Ol%C3%A1!%20Tentei%20fazer%20meu%20cadastro%20no%20site%20da%20Dom%C3%ADnio%20Pesquisas%2C%20mas%20n%C3%A3o%20consegui%20enviar.">(41) 99752-6552</a>.');
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
        sucesso(d.nome, res);
      })
      .catch(function () {
        mostrarAlerta('Não conseguimos enviar seu cadastro agora. Verifique sua internet e tente de novo. Se o problema continuar, fale com a gente pelo WhatsApp <a href="https://wa.me/5541997526552?text=Ol%C3%A1!%20Tentei%20fazer%20meu%20cadastro%20no%20site%20da%20Dom%C3%ADnio%20Pesquisas%2C%20mas%20n%C3%A3o%20consegui%20enviar.">(41) 99752-6552</a>.');
      })
      .finally(function () {
        clearTimeout(timer);
        btn.disabled = false;
        btn.innerHTML = btnHTML;
      });
  });

  /* ---------- Formulário definido pela equipe no sistema ("Formulário do site") ----------
     A página já traz o formulário completo; se o sistema responder, aplicamos por cima: textos e ajuda,
     ordem dentro de cada parte, perguntas tiradas e perguntas novas. Se não responder, fica o formulário de sempre.
     Aplicar é seguro de repetir (mantém o que a pessoa já digitou). */
  var versaoAplicada = null;
  var CHAVE_CACHE = 'dp_formulario_v1';

  function el(tag, attrs, texto) {
    var e = document.createElement(tag);
    for (var k in attrs) if (attrs[k] != null && attrs[k] !== false) e.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    if (texto != null) e.textContent = texto;
    return e;
  }
  function blocoDe(id) { return form.querySelectorAll('[data-bloco="' + id + '"]'); }

  /* texto e ajuda de uma pergunta padrão (guardamos o original para poder voltar) */
  function aplicarTexto(principal, texto, ajuda) {
    var rot = principal.querySelector('label, .field-label');
    if (rot && texto) {
      if (rot._orig == null) rot._orig = rot.textContent;
      var opt = rot.querySelector('.opt'); // "(opcional)" continua depois do texto definido pela equipe
      rot.textContent = texto;
      if (opt) { rot.appendChild(document.createTextNode(' ')); rot.appendChild(opt); }
    }
    var hint = principal.querySelector('.hint');
    if (ajuda) {
      if (!hint) { hint = el('p', { 'class': 'hint' }); rot ? rot.insertAdjacentElement('afterend', hint) : principal.prepend(hint); }
      hint.textContent = ajuda; hint.hidden = false;
    } else if (hint) hint.hidden = true;
  }

  /* pergunta nova criada pela equipe */
  function criarExtra(q) {
    var nome = 'extra_' + q.id;
    var escolha = q.tipo === 'unica' || q.tipo === 'multipla';
    var f = el('div', { 'class': 'field span-2', 'data-bloco': q.id, 'data-principal': true, 'data-extra': q.id,
      'data-multipla': q.tipo === 'multipla', 'data-obrigatoria': q.tipo === 'multipla' && q.obrigatoria,
      role: escolha ? (q.tipo === 'unica' ? 'radiogroup' : 'group') : null, 'aria-labelledby': escolha ? 'lbl-' + nome : null });
    var rot = escolha ? el('span', { 'class': 'field-label', id: 'lbl-' + nome }, q.texto) : el('label', { 'for': nome }, q.texto);
    if (!q.obrigatoria) { rot.appendChild(document.createTextNode(' ')); rot.appendChild(el('span', { 'class': 'opt' }, '(opcional)')); }
    f.appendChild(rot);
    if (q.ajuda) f.appendChild(el('p', { 'class': 'hint' }, q.ajuda));
    if (escolha) {
      var box = el('div', { 'class': 'choices' });
      q.opcoes.forEach(function (o, i) {
        var lab = el('label', { 'class': 'choice' });
        lab.appendChild(el('input', { type: q.tipo === 'unica' ? 'radio' : 'checkbox', name: nome, value: o,
          required: q.tipo === 'unica' && q.obrigatoria && i === 0, 'data-msg': q.tipo === 'unica' ? 'Selecione uma opção.' : 'Marque pelo menos uma opção.' }));
        lab.appendChild(el('span', null, o));
        box.appendChild(lab);
      });
      f.appendChild(box);
    } else {
      f.appendChild(el('input', { 'class': 'input', id: nome, name: nome, type: q.tipo === 'numero' ? 'number' : 'text',
        inputmode: q.tipo === 'numero' ? 'numeric' : null, maxlength: q.tipo === 'numero' ? null : '1000',
        required: q.obrigatoria, 'data-msg': q.tipo === 'numero' ? 'Informe um número.' : 'Preencha este campo.' }));
    }
    f.appendChild(el('span', { 'class': 'error-msg' }));
    f._assinatura = JSON.stringify(q);
    return f;
  }

  function aplicarFormulario(def) {
    if (!def || !def.secoes) return;
    var foco = document.activeElement;
    var ids = {};
    def.secoes.forEach(function (s) { s.itens.forEach(function (q) { ids[q.id] = true; }); });
    // perguntas novas que saíram
    form.querySelectorAll('[data-extra]').forEach(function (f) { if (!ids[f.getAttribute('data-extra')]) f.remove(); });
    def.secoes.forEach(function (s) {
      var fs = form.querySelector('[data-secao="' + s.id + '"]');
      var grade = fs && fs.querySelector('.grid');
      if (!grade) return;
      s.itens.forEach(function (q) {
        var els;
        if (q.propria) {
          var atual = form.querySelector('[data-extra="' + q.id + '"]');
          if (atual && atual._assinatura !== JSON.stringify(q)) { atual.remove(); atual = null; }
          els = [atual || criarExtra(q)];
        } else {
          els = Array.prototype.slice.call(blocoDe(q.id));
          if (els.length) aplicarTexto(els[0], q.texto, q.ajuda);
        }
        els.forEach(function (e) {
          grade.appendChild(e); // na ordem definida (move o que já existe, sem perder o que foi digitado)
          if (q.ligada === false) { e.setAttribute('data-desligado', ''); e.hidden = true; }
          else if (e.hasAttribute('data-desligado')) { e.removeAttribute('data-desligado'); e.hidden = false; }
        });
      });
    });
    // partes sem nenhuma pergunta somem; a numeração acompanha
    var n = 0;
    form.querySelectorAll('[data-secao]').forEach(function (fs) {
      var tem = fs.querySelector('[data-principal]:not([data-desligado])');
      fs.hidden = !tem;
      if (tem) { n++; var num = fs.querySelector('legend .num'); if (num) num.textContent = n; }
    });
    form.querySelectorAll('input, select').forEach(apply);
    atualizarCondicionais();
    if (foco && foco !== document.activeElement && document.contains(foco)) { try { foco.focus({ preventScroll: true }); } catch (e) { /* ignora */ } }
    versaoAplicada = def.versao;
  }

  function extrasPreenchidos(fd) {
    var saida = {};
    form.querySelectorAll('[data-extra]').forEach(function (f) {
      if (f.hasAttribute('data-desligado')) return;
      var id = f.getAttribute('data-extra');
      var v = f.hasAttribute('data-multipla') ? fd.getAll('extra_' + id) : (fd.get('extra_' + id) || '').toString().trim();
      if (v && v.length) saida[id] = v;
    });
    return saida;
  }

  function carregarFormulario() {
    var usar = function (def) { try { if (def && def.versao !== versaoAplicada) aplicarFormulario(def); } catch (e) { /* fica o formulário de sempre */ } };
    try { usar(JSON.parse(localStorage.getItem(CHAVE_CACHE) || 'null')); } catch (e) { /* sem cópia guardada */ }
    if (!CONFIG.formulario || !window.fetch) return;
    fetch(CONFIG.formulario, { cache: 'no-cache' })
      .then(function (r) { return r.json(); })
      .then(function (r) {
        if (!r || !r.ok || !r.formulario) return;
        if (form.hidden) return; // já enviou
        usar(r.formulario);
        try { localStorage.setItem(CHAVE_CACHE, JSON.stringify(r.formulario)); } catch (e) { /* ignora */ }
      })
      .catch(function () { /* sistema fora do ar: fica o formulário de sempre */ });
  }

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
  carregarFormulario();
})();
