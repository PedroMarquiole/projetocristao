/* ==========================================================
   Página de vendas — interações (JS puro, sem dependências)
   Depende de: config.js e rastreio.js
   ========================================================== */
(function () {
  "use strict";
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var reduzMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Marca, oferta e links de checkout ---------- */
  function aplicarConfig() {
    $$("[data-produto-nome]").forEach(function (el) { el.textContent = PRODUTO.nome; });
    $$("[data-oferta]").forEach(function (el) {
      var v = OFERTA[el.getAttribute("data-oferta")];
      if (v === "" || v === undefined || v === null) { el.hidden = true; return; }
      el.textContent = v;
    });
    $$("[data-area-membros]").forEach(function (a) { a.href = OFERTA.areaMembrosUrl; });

    var atualizar = function () {
      $$("a[data-checkout]").forEach(function (a) { a.href = window.linkCheckout(OFERTA.checkoutUrl); });
    };
    atualizar();
    $$("a[data-checkout]").forEach(function (a) {
      a.addEventListener("click", function () {
        a.href = window.linkCheckout(OFERTA.checkoutUrl);
        window.rastrear("InitiateCheckout", { content_name: PRODUTO.nome, currency: "BRL" });
      });
    });

    // Lembrete para quem está configurando: some sozinho quando o link real for colado.
    if (/exemplo\.com/.test(OFERTA.checkoutUrl)) {
      var aviso = document.createElement("div");
      aviso.className = "aviso-config";
      aviso.innerHTML = "Configure o link do checkout e os preços em <code>js/config.js</code> antes de publicar.";
      document.body.insertBefore(aviso, document.body.firstChild);
    }
  }

  /* ---------- Demonstração: pinte a página ---------- */
  var CORES = [
    ["Vermelho", "#E53935"], ["Laranja", "#FB8C00"], ["Amarelo", "#FFD54F"], ["Verde-limão", "#C0CA33"], ["Verde", "#43A047"],
    ["Verde-escuro", "#2E7D32"], ["Azul-claro", "#4FC3F7"], ["Azul", "#1E66D0"], ["Azul-marinho", "#283593"], ["Roxo", "#8E5CC4"],
    ["Lilás", "#CE93D8"], ["Rosa", "#F48FB1"], ["Pink", "#EC407A"], ["Pêssego", "#FFCC80"], ["Pele clara", "#F6D2B5"],
    ["Pele", "#E0AC82"], ["Pele morena", "#A86B47"], ["Marrom", "#6D4C41"], ["Cinza", "#9E9E9E"], ["Preto", "#424242"]
  ];
  function svgGiz(cor) {
    return '<svg viewBox="0 0 34 64" aria-hidden="true" focusable="false">' +
      '<path d="M9 21 17 3l8 18z" fill="' + cor + '" stroke="#3A2A1E" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<rect x="7" y="20" width="20" height="42" rx="3" fill="' + cor + '" stroke="#3A2A1E" stroke-width="2.5"/>' +
      '<rect x="7" y="31" width="20" height="15" fill="#fff" fill-opacity=".8" stroke="#3A2A1E" stroke-width="2"/></svg>';
  }

  function iniciarDemo() {
    var canvas = $("#tela-demo");
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    var gizes = $("#gizes"), dica = $("#demo-dica");
    var corAtual = CORES[0][1];
    var W = 0, H = 0, lum = null, livre = null, img = null, historico = [];

    CORES.forEach(function (c, i) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "giz";
      b.setAttribute("aria-pressed", String(i === 0));
      b.setAttribute("aria-label", "Giz " + c[0]);
      b.innerHTML = svgGiz(c[1]);
      b.addEventListener("click", function () {
        corAtual = c[1];
        $$(".giz", gizes).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        mostrarCor(c);
      });
      gizes.appendChild(b);
    });
    function mostrarCor(c) {
      var am = $("#demo-cor-amostra"), nm = $("#demo-cor-nome");
      if (am) am.style.background = c[1];
      if (nm) nm.textContent = c[0];
    }
    mostrarCor(CORES[0]);
    if (dica) dica.addEventListener("click", function (e) { e.stopPropagation(); dica.classList.add("-some"); });
    if (!reduzMovimento) gizes.classList.add("-acenar");

    var foto = new Image();
    foto.decoding = "async";
    foto.onload = function () {
      W = canvas.width = foto.naturalWidth; H = canvas.height = foto.naturalHeight;
      ctx.drawImage(foto, 0, 0);
      try { img = ctx.getImageData(0, 0, W, H); } catch (e) { canvas.setAttribute("data-erro", "1"); return; }
      lum = new Uint8Array(W * H);
      for (var i = 0, p = 0; i < lum.length; i++, p += 4) lum[i] = img.data[p];
      livre = new Uint8Array(W * H);                 // 1 = área que a tinta pode ocupar
      for (var q = 0; q < lum.length; q++) livre[q] = lum[q] >= LINHA ? 1 : 0;
      criarHorizonte();
      canvas.setAttribute("data-pronto", "1");
    };
    foto.onerror = function () { canvas.setAttribute("data-erro", "1"); };
    if (window.location.protocol === "file:") {
      // Aberto direto do computador: o navegador bloqueia ler pixels de arquivos locais.
      // Carrega a cópia embutida (só neste caso; no site publicado não é usada).
      var s = document.createElement("script");
      s.src = "js/demo-imagem-local.js";
      s.onload = function () { foto.src = window.DEMO_IMG_LOCAL; };
      document.head.appendChild(s);
    } else {
      var celular = window.matchMedia("(max-width: 759px)").matches && canvas.getAttribute("data-src-celular");
      var carregar = function () { if (!foto.src) foto.src = celular || canvas.getAttribute("data-src"); };
      // Só baixa o desenho da amostra quando ela estiver chegando na tela (página abre mais rápido no 4G).
      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (e) { if (e[0].isIntersecting) { io.disconnect(); carregar(); } }, { rootMargin: "800px 0px" });
        io.observe(canvas);
      } else carregar();
    }

    var LINHA = 150;  // abaixo disso é traço do desenho (não pinta)

    /* Divisa invisível entre céu e mar. No desenho não há linha separando os dois,
       então sem isto o balde de tinta pintaria céu e mar juntos. Vale só para o fundo
       (a área ligada ao topo da imagem); barco, redes e pessoas não são afetados. */
    function criarHorizonte() {
      var h = parseFloat(canvas.getAttribute("data-horizonte"));
      if (!h) return;
      var y0 = Math.round(h * H), fundo = new Uint8Array(W * H), pilha = [Math.floor(W / 2)];
      fundo[pilha[0]] = 1;
      while (pilha.length) {
        var k = pilha.pop(), x = k % W, viz = [x > 0 ? k - 1 : -1, x < W - 1 ? k + 1 : -1, k - W, k + W];
        for (var v = 0; v < 4; v++) { var n = viz[v]; if (n >= 0 && n < lum.length && !fundo[n] && livre[n]) { fundo[n] = 1; pilha.push(n); } }
      }
      for (var xi = 0; xi < W; xi++) if (fundo[y0 * W + xi]) livre[y0 * W + xi] = 0;
    }

    function pintar(x, y) {
      if (!livre) return;
      var inicio = y * W + x;
      if (!livre[inicio]) {                      // tocou em cima do traço: procura área branca perto
        var achou = -1;
        for (var r = 1; r <= 8 && achou < 0; r++) {
          for (var dy = -r; dy <= r && achou < 0; dy++) for (var dx = -r; dx <= r; dx++) {
            var xx = x + dx, yy = y + dy;
            if (xx >= 0 && yy >= 0 && xx < W && yy < H && livre[yy * W + xx]) { achou = yy * W + xx; break; }
          }
        }
        if (achou < 0) return;
        inicio = achou;
      }
      historico.push(new Uint8ClampedArray(img.data));
      if (historico.length > 6) historico.shift();

      var cr = parseInt(corAtual.slice(1, 3), 16), cg = parseInt(corAtual.slice(3, 5), 16), cb = parseInt(corAtual.slice(5, 7), 16);
      var visto = new Uint8Array(W * H), pilha = [inicio], d = img.data, regiao = [];
      visto[inicio] = 1;
      while (pilha.length) {                          // preenchimento por varredura (rápido no celular)
        var idx = pilha.pop(), px = idx % W, py = (idx - px) / W;
        var esq = px, dir = px;
        while (esq > 0 && !visto[py * W + esq - 1] && livre[py * W + esq - 1]) { esq--; visto[py * W + esq] = 1; }
        while (dir < W - 1 && !visto[py * W + dir + 1] && livre[py * W + dir + 1]) { dir++; visto[py * W + dir] = 1; }
        for (var xi = esq; xi <= dir; xi++) {
          var k = py * W + xi; regiao.push(k);
          if (py > 0) { var a = k - W; if (!visto[a] && livre[a]) { visto[a] = 1; pilha.push(a); } }
          if (py < H - 1) { var b2 = k + W; if (!visto[b2] && livre[b2]) { visto[b2] = 1; pilha.push(b2); } }
        }
      }
      function tingir(k) { var l = lum[k] / 255, p = k * 4; d[p] = cr * l; d[p + 1] = cg * l; d[p + 2] = cb * l; }
      for (var i = 0; i < regiao.length; i++) {
        var k2 = regiao[i]; tingir(k2);
        var vz = [k2 - 1, k2 + 1, k2 - W, k2 + W];    // borda suave: tinge o meio-tom colado ao traço
        for (var j = 0; j < 4; j++) { var n = vz[j]; if (n >= 0 && n < lum.length && !visto[n] && lum[n] >= 40) { visto[n] = 1; tingir(n); } }
      }
      ctx.putImageData(img, 0, 0);
      if (dica && !dica.classList.contains("-some")) dica.classList.add("-some");
    }

    canvas.addEventListener("click", function (e) {
      var r = canvas.getBoundingClientRect();
      var x = Math.floor((e.clientX - r.left) * W / r.width), y = Math.floor((e.clientY - r.top) * H / r.height);
      if (x >= 0 && y >= 0 && x < W && y < H) pintar(x, y);
    });
    $("#demo-desfazer").addEventListener("click", function () {
      if (!historico.length) return;
      img.data.set(historico.pop()); ctx.putImageData(img, 0, 0);
    });
    $("#demo-limpar").addEventListener("click", function () {
      if (!foto.complete) return;
      historico = []; ctx.drawImage(foto, 0, 0); img = ctx.getImageData(0, 0, W, H);
    });
  }

  /* ---------- Calculadora de tela ---------- */
  function iniciarCalculadora() {
    var faixa = $("#horas");
    if (!faixa) return;
    var fmt = function (n) { return Math.round(n).toLocaleString("pt-BR"); };
    var atualizar = function () {
      var h = parseFloat(faixa.value);
      var ano = h * 365, dias = ano / 24;
      var pct = ((h - faixa.min) / (faixa.max - faixa.min)) * 100;
      faixa.style.setProperty("--p", pct + "%");
      $("#horas-valor").textContent = (h % 1 ? h.toLocaleString("pt-BR") : h) + (h === 1 ? " hora" : " horas");
      $("#tela-ano").textContent = fmt(ano) + " horas";
      $("#tela-dias").textContent = "Mais de " + fmt(Math.floor(dias)) + " dias inteiros, 24 horas por dia, olhando para uma tela.";
    };
    faixa.addEventListener("input", atualizar);
    atualizar();
    var trocaHoras = 20 * 365 / 60;   // 20 minutos por dia
    $("#troca-ano").textContent = fmt(Math.floor(trocaHoras)) + " horas";
  }

  /* ---------- Galeria: setas no computador ---------- */
  function iniciarGaleria() {
    var g = $("#galeria");
    if (!g) return;
    $$("[data-galeria]").forEach(function (b) {
      b.addEventListener("click", function () {
        g.scrollBy({ left: (b.getAttribute("data-galeria") === "dir" ? 1 : -1) * g.clientWidth * .9, behavior: reduzMovimento ? "auto" : "smooth" });
      });
    });
  }

  /* ---------- Depoimentos reais (a seção só é criada se houver depoimentos em config.js) ---------- */
  function iniciarDepoimentos() {
    if (typeof DEPOIMENTOS === "undefined" || !Array.isArray(DEPOIMENTOS) || !DEPOIMENTOS.length) return;
    var oferta = $("#oferta");
    if (!oferta) return;
    var secao = document.createElement("section");
    secao.className = "secao"; secao.id = "depoimentos"; secao.style.paddingTop = "0";
    secao.setAttribute("aria-labelledby", "depo-titulo");
    var cont = document.createElement("div"); cont.className = "container";
    var h = document.createElement("h2"); h.className = "secao__titulo"; h.id = "depo-titulo"; h.textContent = "O que as famílias estão dizendo";
    var ul = document.createElement("ul"); ul.className = "limpa depoimentos";
    DEPOIMENTOS.forEach(function (d) {
      var li = document.createElement("li"); li.className = "depoimento";
      var p = document.createElement("p"); p.textContent = "“" + d.texto + "”";
      var c = document.createElement("cite"); c.textContent = d.nome + (d.cidade ? ", " + d.cidade : "");
      li.appendChild(p); li.appendChild(c); ul.appendChild(li);
    });
    cont.appendChild(h); cont.appendChild(ul); secao.appendChild(cont);
    var antes = oferta.previousElementSibling;                    // a onda que vem antes da oferta
    oferta.parentNode.insertBefore(secao, antes && antes.classList.contains("onda") ? antes : oferta);
  }

  /* ---------- Barra fixa de compra (celular) e evento ViewContent ---------- */
  function iniciarBarra() {
    var barra = $("#barra"), heroCta = $("#hero-cta"), oferta = $("#oferta");
    if (!barra || !("IntersectionObserver" in window)) return;
    var heroVisivel = true, ofertaVisivel = false, viu = false;
    var ajustar = function () {
      var mostrar = !heroVisivel && !ofertaVisivel;
      barra.classList.toggle("-visivel", mostrar);
      barra.setAttribute("aria-hidden", String(!mostrar));
      $$("a", barra).forEach(function (a) { a.tabIndex = mostrar ? 0 : -1; });
    };
    // A barra (com o preço) só aparece depois que a pessoa passa do botão do topo.
    var agendado = false;
    var conferirTopo = function () {
      agendado = false;
      heroVisivel = heroCta.getBoundingClientRect().bottom > 0;   // ainda não passou do botão do topo
      ajustar();
    };
    window.addEventListener("scroll", function () {
      if (!agendado) { agendado = true; requestAnimationFrame(conferirTopo); }
    }, { passive: true });
    conferirTopo();
    new IntersectionObserver(function (e) {
      ofertaVisivel = e[0].isIntersecting; ajustar();
      if (ofertaVisivel && !viu) { viu = true; window.rastrear("ViewContent", { content_name: PRODUTO.nome, currency: "BRL" }); }
    }, { threshold: .15 }).observe(oferta);
    var medir = function () { document.body.style.setProperty("--barra-h", barra.offsetHeight + "px"); };
    medir(); window.addEventListener("resize", medir);
    ajustar();
  }


  /* ---------- Antes e depois: arraste para comparar ---------- */
  function iniciarComparar() {
    var box = $("#comparar"), faixa = $("#comparar-faixa");
    if (!box || !faixa) return;
    var mover = function () { box.style.setProperty("--pos", faixa.value + "%"); };
    faixa.addEventListener("input", mover);
    mover();
  }

  /* ---------- Back redirect (código da Utmify, adaptado): "Voltar" leva ao destino do config.js ---------- */
  function iniciarBackRedirect() {
    var alvo = (typeof RASTREIO !== "undefined" && RASTREIO.backRedirectUrl) || "";
    if (!alvo) return;
    var url;
    if (alvo.charAt(0) === "#") url = location.pathname + location.search + alvo;
    else url = alvo.trim() + (alvo.indexOf("?") > 0 ? "&" : "?") + location.search.replace("?", "");
    // As entradas extras do histórico levam uma marca. Só um "Voltar" de verdade (que cai numa delas)
    // aciona o redirecionamento. Sem isso, qualquer clique em link "#oferta" disparava o evento
    // popstate e o redirecionamento entrava em loop, travando a página.
    var MARCA = "backRedirect", indo = false;
    for (var n = 0; n < 3; n++) history.pushState({ marca: MARCA }, "", location.href);
    window.addEventListener("popstate", function (e) {
      if (indo || !e.state || e.state.marca !== MARCA) return;
      indo = true;
      setTimeout(function () { location.href = url; indo = false; }, 1);
    });
  }

  /* ---------- Preço por desenho (conta feita com os valores do config.js) ---------- */
  function precoPorDesenho() {
    var el = $("#preco-unidade");
    if (!el) return;
    var v = parseFloat(String(OFERTA.precoPor).replace(/[^0-9,]/g, "").replace(",", "."));
    if (!v || !OFERTA.totalPaginas) return;
    var unid = v / OFERTA.totalPaginas;
    // Arredonda para cima, de 5 em 5 centavos (R$ 19,90 / 37 = R$ 0,537 -> "menos de R$ 0,55").
    var teto = (Math.ceil(unid * 20) / 20).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    el.textContent = "Menos de " + teto + " por história";
    el.hidden = false;
  }

  document.addEventListener("DOMContentLoaded", function () {
    aplicarConfig();
    iniciarDemo();
    iniciarCalculadora();
    iniciarGaleria();
    iniciarDepoimentos();
    iniciarBarra();
    iniciarComparar();
    iniciarBackRedirect();
    precoPorDesenho();
  });
})();
