/* ==========================================================
   Checkout Pix (JS puro). Conversa só com as funções /api/* do próprio site.
   Sem servidor (arquivo aberto no computador ou prévia), roda uma demonstração local.
   ========================================================== */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var cfg = null, demoLocal = false, timerStatus = null, timerTempo = null;
  var chave = novaChave();
  var brl = function (v) { return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); };
  var dig = function (s) { return String(s || "").replace(/\D/g, ""); };
  var esc = function (s) { var d = document.createElement("div"); d.textContent = String(s); return d.innerHTML; };
  function novaChave() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random(); }

  /* ---------- Máscaras ---------- */
  function mascarar(el, fn) { el.addEventListener("input", function () { el.value = fn(el.value); }); }
  mascarar($("#cpf"), function (v) { v = dig(v).slice(0, 11); return v.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2"); });
  mascarar($("#telefone"), function (v) { v = dig(v).slice(0, 11); return v.length > 10 ? v.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3") : v.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/[-( )]+$/, ""); });
  // Ao corrigir um campo, ele volta ao normal.
  document.addEventListener("input", function (e) { if (e.target.getAttribute && e.target.getAttribute("aria-invalid")) { e.target.removeAttribute("aria-invalid"); erro(""); } });

  /* ---------- Validação ---------- */
  function cpfValido(c) {
    c = dig(c); if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
    for (var t = 9; t < 11; t++) { var s = 0; for (var i = 0; i < t; i++) s += Number(c[i]) * (t + 1 - i); if (((s * 10) % 11) % 10 !== Number(c[t])) return false; }
    return true;
  }
  function erro(msg) { $("#ck-erro").textContent = msg; }
  function marcar(id, msg) { var el = $(id); el.setAttribute("aria-invalid", "true"); el.focus(); erro(msg); return false; }
  function lerCliente() {
    $$("[aria-invalid]").forEach(function (e) { e.removeAttribute("aria-invalid"); }); erro("");
    var nome = $("#nome").value.trim().replace(/\s+/g, " "), email = $("#email").value.trim(), cpf = $("#cpf").value;
    if (nome.split(" ").length < 2) return marcar("#nome", "Digite seu nome completo.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return marcar("#email", "Digite um e-mail válido. É nele que você recebe o acesso.");
    if (!cpfValido(cpf)) return marcar("#cpf", "Confira o CPF: o número digitado não é válido.");
    return { nome: nome, email: email, cpf: dig(cpf), telefone: dig($("#telefone").value) };
  }

  /* ---------- Extras e total ---------- */
  function extrasMarcados() { return $$("#ck-extras input:checked").map(function (i) { return i.value; }); }
  function total() {
    var ids = extrasMarcados();
    return cfg.preco + cfg.extras.filter(function (e) { return ids.indexOf(e.id) !== -1; }).reduce(function (s, e) { return s + e.preco; }, 0);
  }
  function atualizarTotal() {
    var ids = extrasMarcados(), linhas = $("#ck-linhas");
    linhas.innerHTML = ids.length ? '<li><span>Jornada pela Bíblia</span><span>' + brl(cfg.preco) + "</span></li>" +
      cfg.extras.filter(function (e) { return ids.indexOf(e.id) !== -1; }).map(function (e) { return "<li><span>" + esc(e.nome) + "</span><span>" + brl(e.preco) + "</span></li>"; }).join("") : "";
    $("#ck-preco").textContent = brl(total());
    $("#btn-pix").textContent = "Gerar Pix de " + brl(total());
  }
  function montarExtras() {
    var lista = $("#ck-extras");
    if (!cfg.extras || !cfg.extras.length) return;
    cfg.extras.forEach(function (e) {
      var l = document.createElement("label");
      l.className = "ck-extra";
      l.innerHTML = '<input type="checkbox" value="' + esc(e.id) + '">' +
        '<span class="ck-extra__caixa" aria-hidden="true"><svg class="icone" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
        "<span><b>" + esc(e.nome) + "</b><p>" + esc(e.descricao) + '</p><span class="ck-extra__preco">' +
        (e.precoDe ? "<s>" + brl(e.precoDe) + "</s>" : "") + "<strong>+ " + brl(e.preco) + '</strong><span class="ck-extra__adicionar">Adicionar ao pedido</span></span></span>';
      lista.appendChild(l);
    });
    lista.addEventListener("change", atualizarTotal);
    $("#ck-extras-bloco").hidden = false;
  }

  /* ---------- Depoimentos REAIS (lista DEPOIMENTOS em js/config.js) ---------- */
  function montarDepoimentos() {
    var d = window.DEPOIMENTOS || (typeof DEPOIMENTOS !== "undefined" ? DEPOIMENTOS : []);
    if (!Array.isArray(d) || !d.length) return;
    var s = document.createElement("section");
    s.className = "ck-depo"; s.setAttribute("aria-labelledby", "depo-titulo");
    s.innerHTML = '<h2 id="depo-titulo">Quem já começou a jornada</h2><ul class="limpa ck-depo__lista">' + d.slice(0, 3).map(function (x) {
      return '<li><span class="ck-depo__estrelas" aria-label="5 estrelas">★★★★★</span><p>“' + esc(x.texto) + '”</p><cite>' + esc(x.nome) + (x.cidade ? ", " + esc(x.cidade) : "") + "</cite></li>";
    }).join("") + "</ul>";
    var ref = document.querySelector(".ck-garantia");
    ref.parentNode.insertBefore(s, ref);
  }

  /* ---------- Comunicação com o servidor (ou demonstração local) ---------- */
  function utms() { try { return JSON.parse(sessionStorage.getItem("utms") || "{}"); } catch (e) { return {}; } }
  function api(caminho, corpo) {
    if (demoLocal) return demo(caminho, corpo);
    return fetch("api/" + caminho, corpo ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) } : {})
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.erro || "Erro " + r.status); return d; }); });
  }
  function demo(caminho, corpo) {
    var agora = Date.now();
    if (caminho === "pix") return Promise.resolve({ demo: true, id: "demo-" + agora, status: "pending", total: total(), expiraEm: new Date(agora + cfg.pixExpiraMin * 60000).toISOString(), copiaECola: "00020126DEMONSTRACAO-ESTE-PIX-NAO-E-VALIDO", qrBase64: "" });
    if (caminho.indexOf("status") === 0) { var id = caminho.split("=")[1] || ""; return Promise.resolve({ status: agora - Number(id.slice(5)) > 12000 ? "approved" : "pending" }); }
    return Promise.reject(new Error("demo"));
  }

  /* ---------- Fluxo ---------- */
  function pagarPix(cliente) {
    var btn = $("#btn-pix"); btn.disabled = true; btn.textContent = "Gerando o Pix…";
    api("pix", { cliente: cliente, extras: extrasMarcados(), utms: utms(), chave: chave }).then(function (r) {
      try { sessionStorage.setItem("compra", JSON.stringify({ email: cliente.email, nome: cliente.nome.split(" ")[0], id: r.id, total: r.total })); } catch (e) { /* ok */ }
      mostrarPix(r);
    }).catch(function (e) { erro(e.message); }).then(function () { btn.disabled = false; atualizarTotal(); });
  }

  function mostrarPix(r) {
    $("#ck-form").hidden = true; $(".ck-resumo").hidden = window.innerWidth < 860; $("#ck-pix").hidden = false;
    $("#pix-valor").textContent = brl(r.total || total());
    $("#pix-qr").innerHTML = r.qrBase64 ? '<img alt="QR Code do Pix" src="data:image/png;base64,' + r.qrBase64 + '">' : '<p class="ck-qr__demo">QR Code de demonstração. Com a empresa de pagamento configurada, o QR Code real aparece aqui.</p>';
    $("#pix-codigo").value = r.copiaECola || "";
    $("#ck-pix").focus(); window.scrollTo(0, 0);
    var fim = new Date(r.expiraEm).getTime(), dur = Math.max(1, fim - Date.now()), caixa = $(".ck-tempo");
    clearInterval(timerTempo);
    var tick = function () {
      var ms = Math.max(0, fim - Date.now()), s = Math.round(ms / 1000);
      $("#pix-tempo").textContent = String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
      $("#pix-barra").style.transform = "scaleX(" + (ms / dur) + ")";
      caixa.classList.toggle("-acabando", s <= 300);
      if (!s) { clearInterval(timerTempo); clearTimeout(timerStatus); $("#pix-status").textContent = "O código expirou. Volte e gere um novo Pix."; }
    };
    tick(); timerTempo = setInterval(tick, 1000);
    esperar(r.id);
  }

  function esperar(id) {
    clearTimeout(timerStatus);
    var conferir = function () {
      api("status?id=" + encodeURIComponent(id)).then(function (r) {
        if (r.status === "approved") return aprovado(r.acesso);
        if (r.status === "rejected" || r.status === "expired") { $("#pix-status").textContent = "O pagamento não foi concluído. Volte e gere um novo Pix."; return; }
        timerStatus = setTimeout(conferir, 4000);
      }).catch(function () { timerStatus = setTimeout(conferir, 6000); });
    };
    timerStatus = setTimeout(conferir, 3000);
  }

  function aprovado(acesso) {
    clearTimeout(timerStatus); clearInterval(timerTempo);
    var st = $("#pix-status"); st.className = "ck-aguardando -ok"; st.textContent = "Pagamento confirmado! Abrindo seu acesso…";
    var c = {}; try { c = JSON.parse(sessionStorage.getItem("compra") || "{}"); } catch (e) { /* ok */ }
    if (window.rastrear) window.rastrear("Purchase", { value: c.total || cfg.preco, currency: "BRL", content_name: cfg.produto });
    // Guarda a chave de acesso (só existe depois do pagamento aprovado).
    try { if (acesso) { localStorage.setItem("acesso", acesso); c.acesso = acesso; sessionStorage.setItem("compra", JSON.stringify(c)); } } catch (e) { /* sem armazenamento: o link da página de obrigado resolve */ }
    setTimeout(function () { window.location.href = "obrigado.html"; }, 900);
  }

  /* ---------- Interface ---------- */
  $("#form-dados").addEventListener("submit", function (e) {
    e.preventDefault(); if (!cfg) return;
    var cliente = lerCliente(); if (cliente) pagarPix(cliente);
  });
  $("#btn-copiar").addEventListener("click", function () {
    var campo = $("#pix-codigo"), rot = $("#btn-copiar span");
    var feito = function () { rot.textContent = "Copiado!"; setTimeout(function () { rot.textContent = "Copiar"; }, 2500); };
    var fallback = function () { campo.select(); try { document.execCommand("copy"); } catch (e) { /* ok */ } feito(); };
    if (navigator.clipboard) navigator.clipboard.writeText(campo.value).then(feito, fallback); else fallback();
  });
  $("#btn-voltar").addEventListener("click", function () {
    clearTimeout(timerStatus); clearInterval(timerTempo); chave = novaChave();
    $("#ck-pix").hidden = true; $("#ck-form").hidden = false; $(".ck-resumo").hidden = false;
  });

  function aplicar(c) {
    cfg = c; cfg.extras = cfg.extras || []; cfg.pixExpiraMin = cfg.pixExpiraMin || 30;
    $$("[data-produto-nome]").forEach(function (el) { el.textContent = (window.PRODUTO && PRODUTO.nome) || c.produto; });
    $$("[data-pix-min]").forEach(function (el) { el.textContent = cfg.pixExpiraMin; });
    $("#ck-demo").hidden = !c.demo;
    if (!cfg.extras.length) $("#passo-pix span").textContent = "2";
    montarExtras(); montarDepoimentos(); atualizarTotal();
  }
  fetch("api/config").then(function (r) { if (!r.ok) throw new Error(); return r.json(); }).then(aplicar).catch(function () {
    // Sem servidor (prévia ou arquivo local): demonstração no navegador, com os mesmos extras do servidor.
    demoLocal = true;
    aplicar({ produto: "Jornada do Pequeno Discípulo", preco: 19.9, pixExpiraMin: 30, demo: true, extras: [
      { id: "oracoes", nome: "Orações para a Hora de Dormir", descricao: "30 cartões de oração ilustrados para imprimir e rezar com seu filho antes de dormir.", precoDe: 19.9, preco: 9.9 },
      { id: "versiculos", nome: "Versículos para Decorar", descricao: "Cartões com um versículo para cada página da jornada, para a criança aprender de cor.", precoDe: 17.9, preco: 7.9 },
      { id: "datas", nome: "Kit Datas Cristãs", descricao: "Desenhos especiais de Natal, Páscoa e Pentecostes para colorir em família.", precoDe: 24.9, preco: 12.9 }
    ] });
  });
  if (location.protocol !== "file:") {
    try {
      if (!sessionStorage.getItem("utms")) {
        var u = {}; new URLSearchParams(location.search).forEach(function (v, k) { if (/^(utm_|src$|sck$|fbclid$|gclid$)/.test(k)) u[k] = v; });
        sessionStorage.setItem("utms", JSON.stringify(u));
      }
    } catch (e) { /* ok */ }
  }
})();
