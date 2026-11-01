/*
  Rastreamento: Pixel do Facebook e Utmify.
  Fica DESLIGADO enquanto os IDs em js/config.js estiverem vazios.
  - Repasse de UTMs: já funciona hoje. Os parâmetros da URL (utm_*, src, sck, fbclid...)
    são copiados para todos os links de checkout, para a Utmify/Kiwify/Hotmart atribuírem a venda.
  - Eventos: PageView ao abrir, ViewContent ao ver a oferta, InitiateCheckout ao clicar em comprar.
*/
(function () {
  "use strict";
  var cfg = window.RASTREIO || (typeof RASTREIO !== "undefined" ? RASTREIO : {});

  // ---------- Pixel do Facebook ----------
  if (cfg.facebookPixelId) {
    /* Código oficial do Meta Pixel (base), carregado só quando há ID. */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", cfg.facebookPixelId);
    window.fbq("track", "PageView");
  }

  // ---------- Utmify ----------
  /* Script de UTMs da Utmify (fornecido pela Utmify, versão legível). Roda sempre, sem precisar de ID. */
  var u = document.createElement("script");
  u.async = true; u.defer = true; u.src = "https://cdn.utmify.com.br/scripts/utms/latest.js";
  u.setAttribute("data-utmify-prevent-xcod-sck", "");
  u.setAttribute("data-utmify-prevent-subids", "");
  document.head.appendChild(u);
  /* Pixel da Utmify: só carrega quando o ID estiver preenchido em js/config.js. */
  if (cfg.utmifyPixelId) {
    window.pixelId = cfg.utmifyPixelId;
    var p = document.createElement("script");
    p.async = true; p.defer = true; p.src = "https://cdn.utmify.com.br/scripts/pixel/pixel.js";
    document.head.appendChild(p);
  }

  // ---------- Eventos ----------
  window.rastrear = function (evento, dados) {
    try { if (window.fbq) window.fbq("track", evento, dados || {}); } catch (e) { /* nunca quebra a página */ }
  };

  // ---------- Repasse de UTMs para o checkout ----------
  var CHAVES = /^(utm_|src$|sck$|xcod$|fbclid$|gclid$|ttclid$)/;
  function paramsDaVisita() {
    var atuais = new URLSearchParams(window.location.search), guardar = {};
    atuais.forEach(function (v, k) { if (CHAVES.test(k)) guardar[k] = v; });
    try {
      if (Object.keys(guardar).length) sessionStorage.setItem("utms", JSON.stringify(guardar));
      else guardar = JSON.parse(sessionStorage.getItem("utms") || "{}");
    } catch (e) { /* armazenamento bloqueado: usa só a URL atual */ }
    return guardar;
  }
  window.linkCheckout = function (base) {
    try {
      var url = new URL(base, window.location.href), extras = paramsDaVisita();
      Object.keys(extras).forEach(function (k) { if (!url.searchParams.has(k)) url.searchParams.set(k, extras[k]); });
      return url.toString();
    } catch (e) { return base; }
  };
})();
