/* ==========================================================
   Área de Membros — comportamento (JS puro, sem dependências)
   Depende de: config.js (PRODUTO) e paginas.js (PAGINAS).
   Funciona nas duas páginas: login.html e index.html.
   ========================================================== */
(function () {
  "use strict";

  /* ---------- Ícones SVG de linha (stroke) — nunca emoji ---------- */
  var ICONES = {
    download: '<path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    circulo: '<circle cx="12" cy="12" r="8.5"/>',
    cadeado: '<rect x="5" y="11" width="14" height="10" rx="3"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    premio: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14 -1.5 7 5-3 5 3-1.5-7"/><path d="m9.5 9 1.8 1.8L15 7.2"/>',
    livro: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
    conversa: '<path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4A8 8 0 1 1 20 12z"/>',
    pincel: '<path d="M18.4 2.6a2 2 0 0 1 2.9 2.9L11 15.8 8.2 13z"/><path d="M8 14c-2.5 0-4 1.6-4 4 0 1.4-.6 2.2-2 3 3.5.7 8-.3 8-4.5"/>',
    sair: '<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="m15 8 4 4-4 4"/><path d="M19 12H9"/>'
  };
  function icone(nome, classe) {
    return '<svg class="icone ' + (classe || "") + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + ICONES[nome] + "</svg>";
  }

  /* ---------- Armazenamento com fallback ----------
     Se o navegador bloquear o localStorage (modo privado, WebView do WhatsApp,
     etc.), usamos memória: nada quebra, só não persiste entre visitas. */
  var memoria = {};
  var storageOk = true;
  var CHAVE = (typeof PRODUTO !== "undefined" ? PRODUTO.nomeArquivo : "membros") + ":";
  function ler(chave, padrao) {
    try {
      var v = window.localStorage.getItem(CHAVE + chave);
      return v === null ? padrao : JSON.parse(v);
    } catch (e) {
      storageOk = false;
      return chave in memoria ? memoria[chave] : padrao;
    }
  }
  function gravar(chave, valor) {
    memoria[chave] = valor;
    try { window.localStorage.setItem(CHAVE + chave, JSON.stringify(valor)); }
    catch (e) { storageOk = false; }
  }

  /* ---------- Marca: título da aba, meta tags, nome, rodapé ---------- */
  function aplicarMarca() {
    var titulo = document.body.getAttribute("data-titulo");
    document.title = (titulo ? titulo + " — " : "") + PRODUTO.nome;
    setMeta('meta[name="description"]', PRODUTO.slogan ? PRODUTO.nome + " — " + PRODUTO.slogan : "Área de membros — " + PRODUTO.nome);
    setMeta('meta[property="og:title"]', PRODUTO.nome);
    setMeta('meta[property="og:description"]', PRODUTO.slogan || PRODUTO.nome);
    setMeta('meta[property="og:site_name"]', PRODUTO.nome);
    qsa("[data-produto-nome]").forEach(function (el) { el.textContent = PRODUTO.nome; });
    qsa("[data-produto-slogan]").forEach(function (el) { el.textContent = PRODUTO.slogan; el.hidden = !PRODUTO.slogan; });
    qsa("[data-ano]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }
  function setMeta(sel, valor) { var m = document.querySelector(sel); if (m) m.setAttribute("content", valor); }
  function qsa(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  /* ---------- Sessão (simulada) ---------- */
  function nomeDoEmail(email) {
    var base = String(email || "").split("@")[0].split(/[._\-+0-9]/)[0];
    if (!base) return "";
    return base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
  }

  /* ===================== LOGIN ===================== */
  function iniciarLogin() {
    var form = document.getElementById("form-login");
    var campo = document.getElementById("email");
    var erro = document.getElementById("email-erro");

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var email = campo.value.trim();
      var valido = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
      if (!valido) {
        campo.setAttribute("aria-invalid", "true");
        erro.textContent = "Digite o e-mail que você usou na compra. Exemplo: nome@email.com";
        campo.focus();
        return;
      }
      campo.removeAttribute("aria-invalid");
      erro.textContent = "";

      /* TODO (BACKEND REAL): aqui entra a validação de verdade, por exemplo:
           fetch('/api/login', { method: 'POST', body: JSON.stringify({ email, senha }) })
         - conferir se o e-mail está na lista de compradores (webhook do checkout:
           Hotmart, Kiwify, Eduzz, Stripe...);
         - login com senha ou link mágico enviado por e-mail;
         - receber um token/cookie de sessão (HttpOnly) e só então redirecionar.
         Por enquanto, qualquer e-mail válido entra. */
      gravar("email", email);
      gravar("nome", nomeDoEmail(email));
      window.location.href = "index.html";
    });
  }

  /* ===================== ÁREA DE MEMBROS ===================== */
  var CATEGORIAS = [
    { id: "todas", nome: "Todas" },
    { id: "at", nome: "Antigo Testamento" },
    { id: "nt", nome: "Novo Testamento" },
    { id: "mil", nome: "Milagres de Jesus" },
    { id: "her", nome: "Heróis da Fé" }
  ];
  var ROTACOES = [-1.2, 0.8, -0.5, 1.4, -1.0, 0.6, -1.5, 1.1, -0.7, 0.4];

  var estado = { coloridas: [], categoria: "todas" };

  function iniciarMembros() {
    /* TODO (BACKEND REAL): proteger esta página. Sem sessão válida →
       window.location.replace('login.html'). Hoje ela abre direto para facilitar testes. */

    var nome = ler("nome", "");
    document.getElementById("saudacao-nome").textContent = nome || "amigo(a)";

    var salvas = ler("coloridas", []);
    estado.coloridas = Array.isArray(salvas) ? salvas.filter(function (n) { return typeof n === "number"; }) : [];
    var cat = ler("categoria", "todas");
    estado.categoria = CATEGORIAS.some(function (c) { return c.id === cat; }) ? cat : "todas";

    desenharAbas();
    desenharGrade();
    atualizarProgresso(false);

    if (!storageOk) {
      var aviso = document.getElementById("aviso-storage");
      aviso.hidden = false;
    }
  }

  function contar(cat) {
    return PAGINAS.filter(function (p) { return cat === "todas" || p.categoria === cat; }).length;
  }

  function desenharAbas() {
    var lista = document.getElementById("lista-abas");
    lista.innerHTML = "";
    CATEGORIAS.forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "aba";
      b.setAttribute("data-cat", c.id);
      b.setAttribute("aria-pressed", String(c.id === estado.categoria));
      b.innerHTML = c.nome + ' <span class="aba__qtd" aria-hidden="true">' + contar(c.id) + "</span>" +
        '<span class="sr-only">(' + contar(c.id) + " páginas)</span>";
      b.addEventListener("click", function () {
        estado.categoria = c.id;
        gravar("categoria", c.id);
        qsa(".aba").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        desenharGrade();
        document.getElementById("status-filtro").textContent =
          "Mostrando " + contar(c.id) + " páginas: " + c.nome + ".";
      });
      lista.appendChild(b);
    });
  }

  function desenharGrade() {
    var grade = document.getElementById("grade");
    grade.innerHTML = "";
    // Sempre na ordem da jornada pela Bíblia (da Criação à Ressurreição).
    var itens = PAGINAS.slice().sort(function (a, b) { return (a.jornada || a.n) - (b.jornada || b.n); })
      .filter(function (p) { return estado.categoria === "todas" || p.categoria === estado.categoria; });
    itens.forEach(function (p, i) { grade.appendChild(criarCard(p, i)); });
  }

  function criarCard(p, i) {
    var feito = estado.coloridas.indexOf(p.n) !== -1;
    var li = document.createElement("li");
    li.className = "card" + (feito ? " -feito" : "");
    li.setAttribute("data-cat", p.categoria);
    li.style.setProperty("--rot", ROTACOES[i % ROTACOES.length] + "deg");
    var pdf = "pdfs/" + p.arquivo + ".pdf";
    li.innerHTML =
      '<div class="card__arte">' +
        '<span class="card__num" aria-hidden="true">' + (p.jornada || p.n) + "</span>" +
        '<span class="card__selo" aria-hidden="true">' + icone("check") + "</span>" +
        '<img src="' + (p.imagem || "img/" + p.arquivo + ".svg") + '" width="400" height="300" loading="lazy" alt="Desenho para colorir: ' + p.titulo + '">' +
      "</div>" +
      '<div class="card__corpo">' +
        '<h3 class="card__titulo">' + p.titulo + "</h3>" +
        '<p class="card__ref">' + icone("livro") + p.ref + "</p>" +
        '<p class="card__texto">' + p.texto + "</p>" +
        '<p class="card__conversa">' + icone("conversa") + "<span>Converse: " + p.conversa + "</span></p>" +
        '<div class="card__acoes">' +
          '<a class="btn btn--azul btn--bloco" href="' + pdf + '" download>' + icone("download") +
            'Baixar PDF<span class="sr-only">: ' + p.titulo + "</span></a>" +
          '<button type="button" class="btn btn--sol btn--bloco btn-pintar">' + icone("pincel") +
            'Pintar no celular<span class="sr-only">: ' + p.titulo + "</span></button>" +
          '<button type="button" class="btn btn--claro btn--bloco btn-marcar" aria-pressed="' + feito + '">' +
            icone("circulo", "icone--vazio") + icone("check", "icone--ok") +
            '<span class="btn-marcar__texto"></span></button>' +
        "</div>" +
      "</div>";
    var btn = li.querySelector(".btn-marcar");
    rotularBotao(btn, p, feito);
    btn.addEventListener("click", function () { alternar(p, li, btn); });
    li.querySelector(".btn-pintar").addEventListener("click", function () {
      if (window.abrirPintura) window.abrirPintura(p);
    });
    return li;
  }

  function rotularBotao(btn, p, feito) {
    btn.querySelector(".btn-marcar__texto").textContent = feito ? "Colorido!" : "Marcar como colorido";
    btn.setAttribute("aria-label", (feito ? "Colorido: desmarcar " : "Marcar como colorido: ") + p.titulo);
  }

  function alternar(p, li, btn) {
    var idx = estado.coloridas.indexOf(p.n);
    var estavaCompleto = estado.coloridas.length === PAGINAS.length;
    if (idx === -1) estado.coloridas.push(p.n); else estado.coloridas.splice(idx, 1);
    var feito = idx === -1;
    gravar("coloridas", estado.coloridas);
    li.classList.toggle("-feito", feito);
    btn.setAttribute("aria-pressed", String(feito));
    rotularBotao(btn, p, feito);
    atualizarProgresso(feito && !estavaCompleto && estado.coloridas.length === PAGINAS.length);
  }

  /* Anel de progresso, mensagem do banner e bloco do diploma */
  function atualizarProgresso(acabouDeCompletar) {
    var total = PAGINAS.length;
    var feitas = estado.coloridas.length;
    var circ = 2 * Math.PI * 56;
    var anel = document.getElementById("anel-valor");
    anel.style.strokeDasharray = circ;
    anel.style.strokeDashoffset = circ * (1 - feitas / total);
    anel.style.opacity = feitas === 0 ? "0" : "1";   /* sem "pontinho" quando está zerado */
    if (!anel.getAttribute("data-pronto")) {          /* 1ª pintura sem animação; depois anima */
      anel.style.transition = "none";
      anel.getBoundingClientRect();
      requestAnimationFrame(function () { anel.style.transition = ""; anel.setAttribute("data-pronto", "1"); });
    }
    document.getElementById("anel-numero").textContent = feitas;
    document.getElementById("anel-total").textContent = "de " + total;
    var anelBox = document.getElementById("anel");
    anelBox.setAttribute("aria-label", feitas + " de " + total + " páginas coloridas");

    var msg = document.getElementById("banner-msg");
    var falta = total - feitas;
    if (feitas === 0) msg.textContent = "Escolha uma página, baixe o PDF e comece a colorir em família.";
    else if (falta > 0) msg.textContent = "Que lindo! Faltam " + falta + (falta === 1 ? " página" : " páginas") + " para o diploma.";
    else msg.textContent = "Você coloriu tudo! Seu diploma está pronto lá embaixo.";

    var bloco = document.getElementById("diploma");
    var completo = feitas === total;
    bloco.className = "diploma " + (completo ? "-liberado" + (acabouDeCompletar ? " -novo" : "") : "-bloqueado");
    var arquivo = "pdfs/diploma.pdf";
    if (completo) {
      bloco.innerHTML =
        '<div class="diploma__icone">' + icone("premio") + "</div>" +
        '<div><h2 class="diploma__titulo">Diploma de Pequeno Discípulo</h2>' +
        '<p class="diploma__texto">Parabéns! Você coloriu as ' + total + " páginas. Baixe, imprima e preencha com o nome da criança.</p></div>" +
        '<a class="btn btn--sol" href="' + arquivo + '" download>' + icone("download") + "Baixar diploma</a>";
      if (acabouDeCompletar) {
        bloco.setAttribute("tabindex", "-1");
        bloco.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
        bloco.focus({ preventScroll: true });
      }
    } else {
      bloco.removeAttribute("tabindex");
      bloco.innerHTML =
        '<div class="diploma__icone">' + icone("cadeado") + "</div>" +
        '<div><h2 class="diploma__titulo">Diploma de Pequeno Discípulo</h2>' +
        '<p class="diploma__texto">Marque as ' + total + " páginas como coloridas para liberar o diploma. Faltam " + falta + ".</p></div>";
    }
  }

  /* ---------- Início ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    aplicarMarca();
    if (document.getElementById("form-login")) iniciarLogin();
    if (document.getElementById("grade")) iniciarMembros();
  });
})();
