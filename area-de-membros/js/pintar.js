/* ==========================================================
   Pintar no celular: abre a página num quadro e pinta por toque (balde de tinta).
   Usado pela área de membros (js/app.js chama window.abrirPintura(pagina)).
   Observação: precisa do site publicado (http/https). Aberto direto do computador
   (file://) o navegador bloqueia ler os pixels da imagem, e a página mostra um aviso.
   ========================================================== */
(function () {
  "use strict";
  var CORES = [
    ["vermelho", "#E53935"], ["laranja", "#FB8C00"], ["amarelo", "#FFC933"], ["verde-claro", "#9CCC65"],
    ["verde", "#43A047"], ["azul-claro", "#4FC3F7"], ["azul", "#1E66D0"], ["roxo", "#8E5CC4"],
    ["rosa", "#F48FB1"], ["pele", "#F2C29B"], ["marrom", "#8D5A3B"], ["cinza", "#9E9E9E"]
  ];
  var LINHA = 150, dlg, canvas, ctx, aviso, titulo, W, H, lum, img, foto, hist = [], cor = CORES[0][1], pagAtual;

  function svgGiz(c) {
    return '<svg viewBox="0 0 34 64" aria-hidden="true"><path d="M9 21 17 3l8 18z" fill="' + c + '" stroke="#3A2A1E" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<rect x="7" y="20" width="20" height="42" rx="3" fill="' + c + '" stroke="#3A2A1E" stroke-width="2.5"/>' +
      '<rect x="7" y="31" width="20" height="15" fill="#fff" fill-opacity=".8" stroke="#3A2A1E" stroke-width="2"/></svg>';
  }

  function montar() {
    dlg = document.createElement("dialog");
    dlg.className = "pintor";
    dlg.setAttribute("aria-labelledby", "pintor-titulo");
    dlg.innerHTML =
      '<div class="pintor__topo"><h2 id="pintor-titulo"></h2>' +
      '<button type="button" class="pintor__fechar" data-acao="fechar" aria-label="Fechar">✕</button></div>' +
      '<div class="pintor__tela"><canvas aria-label="Toque numa área do desenho para pintar com a cor escolhida"></canvas>' +
      '<p class="pintor__aviso" hidden></p></div>' +
      '<div class="pintor__gizes" role="group" aria-label="Cores"></div>' +
      '<div class="pintor__acoes">' +
      '<button type="button" class="btn btn--claro" data-acao="desfazer">Desfazer</button>' +
      '<button type="button" class="btn btn--claro" data-acao="limpar">Limpar</button>' +
      '<button type="button" class="btn btn--azul" data-acao="salvar">Salvar imagem</button></div>';
    document.body.appendChild(dlg);
    canvas = dlg.querySelector("canvas"); ctx = canvas.getContext("2d", { willReadFrequently: true });
    aviso = dlg.querySelector(".pintor__aviso"); titulo = dlg.querySelector("h2");
    var gz = dlg.querySelector(".pintor__gizes");
    CORES.forEach(function (c, i) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "giz"; b.innerHTML = svgGiz(c[1]);
      b.setAttribute("aria-label", "Cor " + c[0]); b.setAttribute("aria-pressed", String(i === 0));
      b.addEventListener("click", function () {
        cor = c[1];
        gz.querySelectorAll(".giz").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      });
      gz.appendChild(b);
    });
    canvas.addEventListener("click", function (e) {
      if (!lum) return;
      var r = canvas.getBoundingClientRect();
      var x = Math.floor((e.clientX - r.left) * W / r.width), y = Math.floor((e.clientY - r.top) * H / r.height);
      if (x >= 0 && y >= 0 && x < W && y < H) pintar(x, y);
    });
    dlg.addEventListener("click", function (e) {
      var a = e.target.closest("[data-acao]"); if (!a) return;
      var acao = a.getAttribute("data-acao");
      if (acao === "fechar") dlg.close();
      if (acao === "desfazer" && hist.length) { img.data.set(hist.pop()); ctx.putImageData(img, 0, 0); }
      if (acao === "limpar" && foto) { hist = []; desenharBase(); }
      if (acao === "salvar" && img) {
        var link = document.createElement("a");
        link.download = pagAtual.arquivo + "-colorido.png";
        link.href = canvas.toDataURL("image/png"); document.body.appendChild(link); link.click(); link.remove();
      }
    });
  }

  function desenharBase() {
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); ctx.drawImage(foto, 0, 0, W, H);
    try { img = ctx.getImageData(0, 0, W, H); } catch (e) {
      lum = null;
      aviso.textContent = "A pintura no celular funciona no site publicado. Aqui, abra o arquivo PDF para imprimir.";
      aviso.hidden = false; return false;
    }
    return true;
  }

  function pintar(x, y) {
    var i0 = y * W + x;
    if (lum[i0] < LINHA) {                         // tocou na linha: procura área branca perto
      var ok = -1;
      for (var r = 1; r <= 10 && ok < 0; r++) for (var dy = -r; dy <= r && ok < 0; dy++) for (var dx = -r; dx <= r; dx++) {
        var xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < W && yy < H && lum[yy * W + xx] >= LINHA) { ok = yy * W + xx; break; }
      }
      if (ok < 0) return; i0 = ok;
    }
    hist.push(new Uint8ClampedArray(img.data)); if (hist.length > 8) hist.shift();
    var cr = parseInt(cor.slice(1, 3), 16), cg = parseInt(cor.slice(3, 5), 16), cb = parseInt(cor.slice(5, 7), 16);
    var visto = new Uint8Array(W * H), pilha = [i0], d = img.data, reg = [];
    visto[i0] = 1;
    while (pilha.length) {
      var idx = pilha.pop(), px = idx % W, py = (idx - px) / W, e = px, di = px;
      while (e > 0 && !visto[py * W + e - 1] && lum[py * W + e - 1] >= LINHA) { e--; visto[py * W + e] = 1; }
      while (di < W - 1 && !visto[py * W + di + 1] && lum[py * W + di + 1] >= LINHA) { di++; visto[py * W + di] = 1; }
      for (var xi = e; xi <= di; xi++) {
        var k = py * W + xi; reg.push(k);
        if (py > 0) { var a = k - W; if (!visto[a] && lum[a] >= LINHA) { visto[a] = 1; pilha.push(a); } }
        if (py < H - 1) { var b = k + W; if (!visto[b] && lum[b] >= LINHA) { visto[b] = 1; pilha.push(b); } }
      }
    }
    function tingir(k) { var l = lum[k] / 255, p = k * 4; d[p] = cr * l; d[p + 1] = cg * l; d[p + 2] = cb * l; }
    for (var i = 0; i < reg.length; i++) {
      var k2 = reg[i]; tingir(k2);
      var vz = [k2 - 1, k2 + 1, k2 - W, k2 + W];
      for (var j = 0; j < 4; j++) { var n = vz[j]; if (n >= 0 && n < lum.length && !visto[n] && lum[n] >= 40) { visto[n] = 1; tingir(n); } }
    }
    ctx.putImageData(img, 0, 0);
  }

  window.abrirPintura = function (p) {
    if (!dlg) montar();
    pagAtual = p; hist = []; lum = null; aviso.hidden = true;
    titulo.textContent = p.titulo;
    foto = new Image();
    foto.onload = function () {
      var k = Math.min(1, 1400 / Math.max(foto.naturalWidth, foto.naturalHeight));
      W = canvas.width = Math.round(foto.naturalWidth * k); H = canvas.height = Math.round(foto.naturalHeight * k);
      if (!desenharBase()) return;
      lum = new Uint8Array(W * H);
      for (var i = 0, q = 0; i < lum.length; i++, q += 4) lum[i] = img.data[q];
      canvas.setAttribute("data-pronto", "1");
    };
    canvas.removeAttribute("data-pronto");
    foto.src = p.imagem || ("img/" + p.arquivo + ".png");
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
  };
})();
