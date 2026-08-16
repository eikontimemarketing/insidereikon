/* ============================================================
   EIKON INSIDER — Playbook Funil de Aquisição Qualificada
   ------------------------------------------------------------
   ⚙️ CONFIGURAÇÃO RÁPIDA:
   - Endpoint do lead ..... data-endpoint no <form id="leadForm"> (index.html)
   - URL do Playbook ...... data-playbook-url no mesmo <form>
     (as duas configurações valem para o formulário principal E o popup)
   - Duração do preloader . constante PRELOADER_MS logo abaixo
   Com data-endpoint vazio, os formulários rodam em modo demonstração
   (validam, simulam o envio e mostram o estado de sucesso).

   📊 TRACKING (dispara sozinho, sem depender de Pixel instalado):
   - dataLayer: { event:'form_start',          form_location }  → 1º clique no formulário
   - dataLayer: { event:'lead_playbook',       form_location }  → lead enviado com sucesso
   - dataLayer: { event:'popup_saida_exibido' }                 → popup de saída aberto
   - fbq('track','Lead') → disparado se o Meta Pixel existir na página
   ============================================================ */
(function () {
  'use strict';

  var PRELOADER_MS = 800; // ✏️ duração do preloader em milissegundos

  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js');

  /* ---------- Preloader ---------- */
  var pre = document.getElementById('preloader');
  if (pre) {
    setTimeout(function () {
      pre.classList.add('hidden');
      setTimeout(function () { pre.style.display = 'none'; }, 600);
    }, reduceMotion ? 0 : PRELOADER_MS);
  }

  /* ---------- Scroll suave até o formulário ---------- */
  var firstField = document.getElementById('f-nome');
  document.querySelectorAll('[data-goto-form]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      document.getElementById('capturar').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
      if (firstField) setTimeout(function () { firstField.focus({ preventScroll: true }); }, reduceMotion ? 0 : 600);
    });
  });

  /* ---------- Revelação ao entrar no viewport ---------- */
  if (!reduceMotion && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('reveal-ready');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  }

  /* ---------- "O que você vai aprender": cards juntos → se espalham ---------- */
  var stages = document.getElementById('stagesGrid');
  if (stages && !reduceMotion && 'IntersectionObserver' in window && matchMedia('(min-width: 768px)').matches) {
    var stageCards = stages.querySelectorAll('.scard');
    var stagesSpread = false;
    var setGather = function () {
      var r = stages.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      stageCards.forEach(function (c, i) {
        var cr = c.getBoundingClientRect();
        c.style.setProperty('--dx', (cx - (cr.left + cr.width / 2)).toFixed(1) + 'px');
        c.style.setProperty('--dy', (cy - (cr.top + cr.height / 2)).toFixed(1) + 'px');
        c.style.setProperty('--rot', ((i % 2 ? 1 : -1) * (3 + i * 1.5)).toFixed(1) + 'deg');
        c.style.transitionDelay = (i * 70) + 'ms';
      });
      stages.classList.add('gather');
    };
    setGather();
    addEventListener('resize', function () { if (!stagesSpread) setGather(); });
    var ioStages = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          stagesSpread = true;
          stages.classList.add('spread');
          ioStages.disconnect();
          // após a animação, remove as classes e limpa os delays para o
          // hover dos cards responder na hora
          setTimeout(function () {
            stageCards.forEach(function (c) { c.style.transitionDelay = ''; });
            stages.classList.remove('gather', 'spread');
          }, stageCards.length * 70 + 1000);
        }
      });
    }, { threshold: 0.18 });
    ioStages.observe(stages);
  }

  /* ---------- Tilt sutil no mockup (desktop, ponteiro fino) ---------- */
  var tiltEl = document.getElementById('mockTilt');
  if (tiltEl && !reduceMotion && matchMedia('(pointer: fine)').matches) {
    tiltEl.addEventListener('pointermove', function (e) {
      var r = tiltEl.getBoundingClientRect();
      tiltEl.style.setProperty('--ry', (((e.clientX - r.left) / r.width - 0.5) * 7).toFixed(2) + 'deg');
      tiltEl.style.setProperty('--rx', (((e.clientY - r.top) / r.height - 0.5) * -6).toFixed(2) + 'deg');
    });
    tiltEl.addEventListener('pointerleave', function () {
      tiltEl.style.setProperty('--rx', '0deg');
      tiltEl.style.setProperty('--ry', '0deg');
    });
  }

  /* ---------- UTM / fbclid ---------- */
  var TRACK_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];
  var urlParams = new URLSearchParams(location.search);
  var tracking = {};
  TRACK_PARAMS.forEach(function (k) {
    var v = urlParams.get(k);
    if (v) tracking[k] = v;
  });

  /* ---------- Tracking de eventos ---------- */
  function pushEvent(data) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(data);
  }
  function fireLead(formLocation) {
    pushEvent({ event: 'lead_playbook', lead_magnet: 'funil_aquisicao_10x', form_location: formLocation });
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'Lead', {
        content_name: 'Playbook Funil de Aquisição 10X',
        content_category: 'Eikon Insider'
      });
    }
  }

  /* ---------- Configuração compartilhada (formulário principal + popup) ---------- */
  var mainForm = document.getElementById('leadForm');
  if (!mainForm) return;
  var endpoint = (mainForm.dataset.endpoint || '').trim();
  var playbookUrl = (mainForm.dataset.playbookUrl || '').trim();
  var converted = false;

  /* Máscara brasileira: (00) 00000-0000 (10 ou 11 dígitos) */
  function maskBR(input) {
    var d = input.value.replace(/\D/g, '').slice(0, 11);
    var out = d;
    if (d.length > 2) {
      var split = d.length === 11 ? 7 : 6;
      var mid = d.slice(2, split), end = d.slice(split);
      out = '(' + d.slice(0, 2) + ') ' + mid + (end ? '-' + end : '');
    } else if (d.length > 0) {
      out = '(' + d;
    }
    input.value = out;
  }

  /* Telefone internacional (+DDI) — usa intl-tel-input se o CDN carregar */
  function initPhone(input) {
    if (typeof window.intlTelInput !== 'function') {
      input.addEventListener('input', function () { maskBR(input); });
      return null;
    }
    var iti = window.intlTelInput(input, {
      initialCountry: 'br',
      separateDialCode: true,
      nationalMode: true,
      formatOnDisplay: false,
      utilsScript: 'https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.19/js/utils.js'
    });
    input.addEventListener('input', function () {
      if (iti.getSelectedCountryData().iso2 === 'br') maskBR(input);
      else input.value = input.value.replace(/[^\d ()+-]/g, '');
    });
    return iti;
  }

  function phoneIsValid(iti, input) {
    if (iti && window.intlTelInputUtils && typeof iti.isValidNumber === 'function') {
      if (iti.getSelectedCountryData().iso2 !== 'br') return iti.isValidNumber();
      // BR: exige DDD + número (10 ou 11 dígitos)
      var br = input.value.replace(/\D/g, '');
      return br.length >= 10 && br.length <= 11 && iti.isValidNumber();
    }
    var d = input.value.replace(/\D/g, '');
    return d.length >= 10 && d.length <= 15;
  }

  function phoneValue(iti, input) {
    if (iti && window.intlTelInputUtils && iti.getNumber()) return iti.getNumber(); // formato +5511999999999
    var d = input.value.replace(/\D/g, '');
    return iti ? '+' + iti.getSelectedCountryData().dialCode + d : d;
  }

  /* Monta o comportamento completo de um formulário de captura (wizard em etapas) */
  function setupForm(cfg) {
    var form = cfg.form;
    if (!form) return;
    var location_ = form.dataset.formLocation || 'principal';
    var iti = initPhone(cfg.whats);

    /* etapas + barra de progresso */
    var steps = Array.prototype.slice.call(form.querySelectorAll('.fstep'));
    var progTxt = form.querySelector('.fprog-txt');
    var progBar = form.querySelector('.fprog-bar i');
    var backBtn = form.querySelector('.fback');
    var stepIdx = 0;

    function setBtnLabel(txt) { cfg.btn.querySelector('.btn-label').textContent = txt; }
    function isLast() { return stepIdx === steps.length - 1; }
    function showStep(i) {
      steps[stepIdx].classList.remove('on');
      stepIdx = i;
      steps[stepIdx].classList.add('on');
      progTxt.textContent = 'Etapa ' + (stepIdx + 1) + ' de ' + steps.length;
      progBar.style.width = (((stepIdx + 1) / steps.length) * 100) + '%';
      backBtn.hidden = stepIdx === 0;
      setBtnLabel(isLast() ? cfg.btnLabel : 'Continuar');
      var input = steps[stepIdx].querySelector('input');
      if (input) input.focus({ preventScroll: true });
    }
    backBtn.addEventListener('click', function () { if (stepIdx > 0) showStep(stepIdx - 1); });

    // campos ocultos de UTM/fbclid
    Object.keys(tracking).forEach(function (k) {
      var input = document.createElement('input');
      input.type = 'hidden';
      input.name = k;
      input.value = tracking[k];
      form.appendChild(input);
    });

    // evento form_start no primeiro foco
    var started = false;
    form.addEventListener('focusin', function (e) {
      if (!started && e.target.tagName === 'INPUT') {
        started = true;
        pushEvent({ event: 'form_start', form_location: location_ });
      }
    });

    function setFieldError(input, errEl, show) {
      input.setAttribute('aria-invalid', show ? 'true' : 'false');
      errEl.hidden = !show;
    }
    [[cfg.nome, cfg.errNome], [cfg.email, cfg.errEmail], [cfg.whats, cfg.errWhats]].forEach(function (pair) {
      pair[0].addEventListener('input', function () {
        setFieldError(pair[0], pair[1], false);
        cfg.errBox.textContent = '';
      });
    });

    /* faturamento: limpa o erro ao escolher uma opção */
    form.addEventListener('change', function (e) {
      if (e.target.name === 'faturamento') cfg.errFat.hidden = true;
    });

    /* valida a etapa i (0=nome, 1=email, 2=whats, 3=instagram, 4=faturamento) */
    function validateStep(i) {
      var ok = true;
      if (i === 0) {
        ok = cfg.nome.value.trim().length >= 2;
        setFieldError(cfg.nome, cfg.errNome, !ok);
        if (!ok) cfg.nome.focus();
      } else if (i === 1) {
        ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cfg.email.value.trim());
        setFieldError(cfg.email, cfg.errEmail, !ok);
        if (!ok) cfg.email.focus();
      } else if (i === 2) {
        ok = phoneIsValid(iti, cfg.whats);
        setFieldError(cfg.whats, cfg.errWhats, !ok);
        if (!ok) cfg.whats.focus();
      } else if (i === 4) {
        ok = !!form.elements.faturamento.value;
        cfg.errFat.hidden = ok;
      }
      return ok; // etapa 3 (instagram) é opcional
    }

    function setLoading(on) {
      cfg.btn.disabled = on;
      backBtn.disabled = on;
      cfg.btn.classList.toggle('loading', on);
      setBtnLabel(on ? 'Enviando…' : cfg.btnLabel);
      form.querySelectorAll('input').forEach(function (i) { i.disabled = on; });
    }

    function showSuccess() {
      converted = true;
      form.style.display = 'none';
      cfg.okBox.classList.add('show');
      if (playbookUrl) {
        cfg.okBtn.href = playbookUrl;
        cfg.okBtn.hidden = false;
        cfg.okBtn.focus();
      } else {
        cfg.okNote.hidden = false;
      }
      if (cfg.onSuccess) cfg.onSuccess();
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      cfg.errBox.textContent = '';

      // honeypot: bots preenchem, humanos não
      if (form.elements.website.value) return;

      // etapas intermediárias: valida e avança
      if (!isLast()) {
        if (validateStep(stepIdx)) showStep(stepIdx + 1);
        return;
      }

      // última etapa: revalida tudo antes de enviar
      for (var i = 0; i < steps.length; i++) {
        if (!validateStep(i)) {
          if (i !== stepIdx) showStep(i);
          return;
        }
      }

      var insta = cfg.insta ? cfg.insta.value.trim().replace(/\s+/g, '') : '';
      if (insta && insta[0] !== '@') insta = '@' + insta;
      var payload = {
        nome: cfg.nome.value.trim(),
        email: cfg.email.value.trim(),
        whatsapp: phoneValue(iti, cfg.whats),
        instagram: insta,
        faturamento: form.elements.faturamento.value,
        lead_magnet: 'funil_aquisicao_10x',
        form_location: location_,
        page: location.href
      };
      Object.keys(tracking).forEach(function (k) { payload[k] = tracking[k]; });

      setLoading(true);
      var done = function () { fireLead(location_); showSuccess(); };
      var fail = function () {
        setLoading(false);
        cfg.errBox.textContent = 'Não foi possível enviar agora. Tente novamente em instantes.';
      };

      if (!endpoint) { setTimeout(done, 900); return; } // modo demonstração

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        done();
      }).catch(fail);
    });
  }

  /* Formulário principal */
  setupForm({
    form: mainForm,
    nome: document.getElementById('f-nome'),
    email: document.getElementById('f-email'),
    whats: document.getElementById('f-whats'),
    insta: document.getElementById('f-insta'),
    errNome: document.getElementById('err-nome'),
    errEmail: document.getElementById('err-email'),
    errWhats: document.getElementById('err-whats'),
    errFat: document.getElementById('err-fat'),
    btn: document.getElementById('submitBtn'),
    btnLabel: 'QUERO RECEBER O PLAYBOOK', // ✏️ texto do botão na última etapa
    errBox: document.getElementById('formErr'),
    okBox: document.getElementById('formOk'),
    okBtn: document.getElementById('playbookBtn'),
    okNote: document.getElementById('okNote')
  });

  /* ---------- Popup de saída (exit intent) ---------- */
  var overlay = document.getElementById('exitPopup');
  if (overlay) {
    var popupShown = false;
    try { popupShown = sessionStorage.getItem('eikon_popup') === '1'; } catch (err) { /* modo privado */ }

    var openPopup = function () {
      if (popupShown || converted || !overlay.hidden) return;
      popupShown = true;
      try { sessionStorage.setItem('eikon_popup', '1'); } catch (err) { /* modo privado */ }
      overlay.hidden = false;
      requestAnimationFrame(function () { overlay.classList.add('show'); });
      document.body.classList.add('popup-open');
      pushEvent({ event: 'popup_saida_exibido' });
      var first = document.getElementById('p-nome');
      if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 380);
    };
    var closePopup = function () {
      overlay.classList.remove('show');
      document.body.classList.remove('popup-open');
      setTimeout(function () { overlay.hidden = true; }, 350);
    };

    document.getElementById('popupClose').addEventListener('click', closePopup);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closePopup(); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape' && !overlay.hidden) closePopup(); });

    // Desktop: mouse saindo pelo topo da janela
    document.addEventListener('mouseout', function (e) {
      if (!e.relatedTarget && e.clientY <= 0) openPopup();
    });

    // Mobile/touch: rolou bastante a página e voltou rápido para o topo
    if (matchMedia('(pointer: coarse)').matches) {
      var maxScroll = 0, lastY = scrollY, upAccum = 0;
      addEventListener('scroll', function () {
        var y = scrollY;
        maxScroll = Math.max(maxScroll, y);
        var dy = lastY - y;
        upAccum = dy > 0 ? upAccum + dy : 0;
        lastY = y;
        if (maxScroll > innerHeight * 1.5 && upAccum > 420 && y < 320) openPopup();
      }, { passive: true });
    }

    /* Formulário do popup */
    setupForm({
      form: document.getElementById('popupForm'),
      nome: document.getElementById('p-nome'),
      email: document.getElementById('p-email'),
      whats: document.getElementById('p-whats'),
      insta: document.getElementById('p-insta'),
      errNome: document.getElementById('perr-nome'),
      errEmail: document.getElementById('perr-email'),
      errWhats: document.getElementById('perr-whats'),
      errFat: document.getElementById('perr-fat'),
      btn: document.getElementById('popupSubmit'),
      btnLabel: 'QUERO RECEBER ACESSO', // ✏️ texto do botão na última etapa
      errBox: document.getElementById('popupErr'),
      okBox: document.getElementById('popupOk'),
      okBtn: document.getElementById('popupPlaybookBtn'),
      okNote: document.getElementById('popupOkNote')
    });
  }
})();
