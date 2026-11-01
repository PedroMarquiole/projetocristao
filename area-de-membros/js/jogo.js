/* Jogo da Memória Bíblico: usa os desenhos da jornada (PAGINAS) como cartas. */
(function () {
  "use strict";
  var grade = document.getElementById("m-grade"), pares = 6, abertas = [], travado = false, jogadas = 0, achados = 0;
  var el = function (id) { return document.getElementById(id); };
  document.querySelectorAll("[data-produto-nome]").forEach(function (n) { if (typeof PRODUTO !== "undefined") n.textContent = PRODUTO.nome; });

  function embaralhar(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  function iniciar() {
    var escolhidas = embaralhar(PAGINAS.slice()).slice(0, pares);
    var cartas = embaralhar(escolhidas.concat(escolhidas));
    abertas = []; travado = false; jogadas = 0; achados = 0;
    el("m-jogadas").textContent = 0; el("m-pares").textContent = 0; el("m-total").textContent = pares; el("m-fim").hidden = true;
    grade.innerHTML = ""; grade.className = "memoria__grade -p" + pares;
    cartas.forEach(function (p) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "carta"; b.dataset.n = p.n; b.setAttribute("aria-label", "Carta virada para baixo");
      b.innerHTML = '<span class="carta__lado carta__costas"><img src="img/logo.svg" alt="" width="40" height="40"></span>' +
        '<span class="carta__lado carta__frente"><img src="img/memoria/pagina-' + (p.n < 10 ? "0" : "") + p.n + '.webp" alt="" width="260" height="186" loading="lazy"></span>';
      b.addEventListener("click", function () { virar(b, p); });
      grade.appendChild(b);
    });
  }

  function virar(b, p) {
    if (travado || b.classList.contains("-aberta") || b.classList.contains("-par")) return;
    b.classList.add("-aberta"); b.setAttribute("aria-label", p.titulo);
    abertas.push({ b: b, p: p });
    if (abertas.length < 2) return;
    jogadas++; el("m-jogadas").textContent = jogadas; travado = true;
    var a = abertas[0], c = abertas[1];
    if (a.p.n === c.p.n) {
      setTimeout(function () {
        a.b.classList.add("-par"); c.b.classList.add("-par"); abertas = []; travado = false; achados++;
        el("m-pares").textContent = achados;
        if (achados === pares) fim(a.p.titulo);
      }, 450);
    } else {
      setTimeout(function () {
        [a, c].forEach(function (x) { x.b.classList.remove("-aberta"); x.b.setAttribute("aria-label", "Carta virada para baixo"); });
        abertas = []; travado = false;
      }, 900);
    }
  }

  function fim() {
    el("m-fim-txt").textContent = "Você encontrou os " + pares + " pares em " + jogadas + " jogadas. Que tal contar para alguém a história de uma das cartas?";
    el("m-fim").hidden = false; el("m-fim").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  document.querySelectorAll(".memoria__nivel button").forEach(function (b) {
    b.addEventListener("click", function () {
      pares = +b.dataset.pares;
      document.querySelectorAll(".memoria__nivel button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      iniciar();
    });
  });
  el("m-novo").addEventListener("click", iniciar); el("m-de-novo").addEventListener("click", iniciar);
  iniciar();
})();
