/* ==========================================================
   Checkout (JS puro). Conversa só com as funções /api/* do próprio site.
   Sem servidor (arquivo aberto no computador ou prévia), roda uma demonstração local.
   ========================================================== */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var cfg = null, metodo = "pix", demoLocal = false, timerStatus = null, timerTempo = null;
  var chave = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random();
  var brl = function (v) { return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); };
  var dig = function (s) { return String(s || "").replace(/\D/g, ""); };

  /* ---------- Integração do cartão com a empresa de pagamento ----------
     TODO BUCKPAY: transformar os dados do cartão em TOKEN usando o script oficial da BuckPay
     (carregado no navegador com a chave pública cfg.publicKey). O número do cartão NUNCA
     deve ser enviado ao nosso servidor. Esta função deve devolver uma Promise com o token. */
  function tokenizarCartao(dados) {
    if (cfg.demo) return Promise.resolve("tok_demo");
    if (window.BuckPayTokenizar) return window.BuckPayTokenizar(dados, cfg.publicKey);
    return Promise.reject(new Error("O pagamento com cartão ainda não foi configurado. Use o Pix."));
  }

  /* ---------- Máscaras ---------- */
  function mascarar(el, fn) { el.addEventListener("input", function () { el.value = fn(el.value); }); }
  mascarar($("#cpf"), function (v) { v = dig(v).slice(0, 11); return v.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2"); });
  mascarar($("#telefone"), function (v) { v = dig(v).slice(0, 11); return v.length > 10 ? v.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3") : v.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/[-( )]+$/, ""); });
  mascarar($("#cc-numero"), function (v) { return dig(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 "); });
  mascarar($("#cc-validade"), function (v) { v = dig(v).slice(0, 4); return v.length > 2 ? v.slice(0, 2) + "/" + v.slice(2) : v; });
  mascarar($("#cc-cvv"), function (v) { return dig(v).slice(0, 4); });

  // Ao corrigir um campo, ele volta ao normal.
  document.addEventListener("input", function (e) { if (e.target.getAttribute && e.target.getAttribute("aria-invalid")) { e.target.removeAttribute("aria-invalid"); erro(""); } });

  /* ---------- Validação ---------- */
  function cpfValido(c) {
    c = dig(c); if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
    for (var t = 9; t < 11; t++) { var s = 0; for (var i = 0; i < t; i++) s += Number(c[i]) * (t + 1 - i); if (((s * 10) % 11) % 10 !== Number(c[t])) return false; }
    return true;
  }
  function luhn(n) { n = dig(n); var s = 0, alt = false; for (var i = n.length - 1; i >= 0; i--) { var d = Number(n[i]); if (alt) { d *= 2; if (d > 9) d -= 9; } s += d; alt = !alt; } return n.length >= 13 && s % 10 === 0; }
  function marcar(id, msg) { var el = $(id); el.setAttribute("aria-invalid", "true"); el.focus(); erro(msg); return false; }
  function limparMarcas() { $$("[aria-invalid]").forEach(function (e) { e.removeAttribute("aria-invalid"); }); erro(""); }
  function erro(msg) { $("#ck-erro").textContent = msg; }

  function lerCliente() {
    limparMarcas();
    var nome = $("#nome").value.trim().replace(/\s+/g, " "), email = $("#email").value.trim(), cpf = $("#cpf").value;
    if (nome.split(" ").length < 2) return marcar("#nome", "Digite seu nome completo.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return marcar("#email", "Digite um e-mail válido. É nele que você recebe o acesso.");
    if (!cpfValido(cpf)) return marcar("#cpf", "Confira o CPF: o número digitado não é válido.");
    return { nome: nome, email: email, cpf: dig(cpf), telefone: dig($("#telefone").value) };
  }
  function lerCartao() {
    var numero = $("#cc-numero").value, val = $("#cc-validade").value, cvv = $("#cc-cvv").value, nome = $("#cc-nome").value.trim();
    if (!luhn(numero)) return marcar("#cc-numero", "Confira o número do cartão.");
    if (nome.length < 3) return marcar("#cc-nome", "Digite o nome como está impresso no cartão.");
    var m = /^(\d{2})\/(\d{2})$/.exec(val), agora = new Date();
    if (!m || +m[1] < 1 || +m[1] > 12 || new Date(2000 + +m[2], +m[1], 0) < new Date(agora.getFullYear(), agora.getMonth(), 1)) return marcar("#cc-validade", "Confira a validade do cartão (MM/AA).");
    if (!/^\d{3,4}$/.test(cvv)) return marcar("#cc-cvv", "Confira o CVV, o código no verso do cartão.");
    return { numero: dig(numero), nome: nome, mes: m[1], ano: "20" + m[2], cvv: cvv, parcelas: Number($("#cc-parcelas").value) || 1 };
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
    if (caminho === "pix") return Promise.resolve({ demo: true, id: "demo-" + agora, status: "pending", expiraEm: new Date(agora + 30 * 60000).toISOString(), copiaECola: "00020126DEMONSTRACAO-ESTE-PIX-NAO-E-VALIDO", qrBase64: "" });
    if (caminho === "cartao") return Promise.resolve({ demo: true, id: "demo-" + agora, status: "approved" });
    if (caminho.indexOf("status") === 0) { var id = caminho.split("=")[1] || ""; return Promise.resolve({ status: agora - Number(id.slice(5)) > 12000 ? "approved" : "pending" }); }
    return Promise.reject(new Error("demo"));
  }

  /* ---------- Fluxo ---------- */
  function ocupado(btn, sim, texto) { btn.disabled = sim; if (texto) btn.textContent = texto; }

  function pagarPix(cliente) {
    var btn = $("#btn-pix"); ocupado(btn, true, "Gerando o Pix…");
    api("pix", { cliente: cliente, utms: utms(), chave: chave }).then(function (r) {
      salvarCompra(cliente, r.id);
      mostrarPix(r);
    }).catch(function (e) { erro(e.message); }).then(function () { ocupado(btn, false, "Gerar Pix"); });
  }

  function pagarCartao(cliente) {
    var cartao = lerCartao(); if (!cartao) return;
    var btn = $("#btn-cartao"); ocupado(btn, true, "Processando…");
    tokenizarCartao(cartao).then(function (token) {
      return api("cartao", { cliente: cliente, cartao: { token: token, parcelas: cartao.parcelas }, utms: utms(), chave: chave });
    }).then(function (r) {
      salvarCompra(cliente, r.id);
      if (r.status === "approved") return aprovado();
      if (r.status === "pending") { erro(""); $("#btn-cartao").textContent = "Pagamento em análise…"; return esperar(r.id); }
      erro(r.motivo || "Pagamento recusado. Tente outro cartão ou pague com Pix.");
      ocupado(btn, false, "Pagar com cartão");
    }).catch(function (e) { erro(e.message); ocupado(btn, false, "Pagar com cartão"); });
  }

  function mostrarPix(r) {
    $("#ck-form").hidden = true; $(".ck-resumo").hidden = window.innerWidth < 860; $("#ck-pix").hidden = false;
    var qr = $("#pix-qr");
    qr.innerHTML = r.qrBase64 ? '<img alt="QR Code do Pix" src="data:image/png;base64,' + r.qrBase64 + '">' : '<p class="ck-qr__demo">QR Code de demonstração. No site com a empresa de pagamento configurada, o QR Code real aparece aqui.</p>';
    $("#pix-codigo").value = r.copiaECola || "";
    $("#ck-pix").focus(); window.scrollTo(0, 0);
    var fim = new Date(r.expiraEm).getTime();
    clearInterval(timerTempo);
    timerTempo = setInterval(function () {
      var s = Math.max(0, Math.round((fim - Date.now()) / 1000));
      $("#pix-tempo").textContent = String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
      if (!s) { clearInterval(timerTempo); clearTimeout(timerStatus); $("#pix-status").textContent = "O código expirou. Volte e gere um novo Pix."; }
    }, 1000);
    esperar(r.id);
  }

  function esperar(id) {
    clearTimeout(timerStatus);
    var conferir = function () {
      api("status?id=" + encodeURIComponent(id)).then(function (r) {
        if (r.status === "approved") return aprovado();
        if (r.status === "rejected" || r.status === "expired") { $("#pix-status").textContent = "O pagamento não foi concluído. Volte e tente de novo."; erro("O pagamento não foi concluído. Tente de novo."); return; }
        timerStatus = setTimeout(conferir, 4000);
      }).catch(function () { timerStatus = setTimeout(conferir, 6000); });
    };
    timerStatus = setTimeout(conferir, 3000);
  }

  function salvarCompra(cliente, id) { try { sessionStorage.setItem("compra", JSON.stringify({ email: cliente.email, nome: cliente.nome.split(" ")[0], id: id })); } catch (e) { /* segue sem guardar */ } }

  function aprovado() {
    clearTimeout(timerStatus); clearInterval(timerTempo);
    var st = $("#pix-status"); if (st) { st.className = "ck-aguardando -ok"; st.textContent = "Pagamento confirmado! Abrindo seu acesso…"; }
    if (window.rastrear) window.rastrear("Purchase", { value: cfg.preco, currency: "BRL", content_name: cfg.produto });
    setTimeout(function () { window.location.href = "obrigado.html"; }, 900);
  }

  /* ---------- Interface ---------- */
  function escolher(m) {
    metodo = m;
    $$(".ck-metodo").forEach(function (b) { b.setAttribute("aria-checked", String(b.getAttribute("data-metodo") === m)); });
    $("#painel-pix").hidden = m !== "pix"; $("#painel-cartao").hidden = m !== "cartao"; erro("");
  }
  $$(".ck-metodo").forEach(function (b) {
    b.addEventListener("click", function () { escolher(b.getAttribute("data-metodo")); });
    b.addEventListener("keydown", function (e) { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { var o = metodo === "pix" ? "cartao" : "pix"; escolher(o); $('.ck-metodo[data-metodo="' + o + '"]').focus(); } });
  });
  $("#form-dados").addEventListener("submit", function (e) {
    e.preventDefault(); if (!cfg) return;
    var cliente = lerCliente(); if (!cliente) return;
    if (metodo === "pix") pagarPix(cliente); else pagarCartao(cliente);
  });
  $("#btn-copiar").addEventListener("click", function () {
    var campo = $("#pix-codigo"), rot = $("#btn-copiar span");
    var feito = function () { rot.textContent = "Copiado!"; setTimeout(function () { rot.textContent = "Copiar"; }, 2500); };
    if (navigator.clipboard) navigator.clipboard.writeText(campo.value).then(feito, function () { campo.select(); document.execCommand("copy"); feito(); });
    else { campo.select(); document.execCommand("copy"); feito(); }
  });
  $("#btn-voltar").addEventListener("click", function () {
    clearTimeout(timerStatus); clearInterval(timerTempo); chave = String(Date.now()) + Math.random();
    $("#ck-pix").hidden = true; $("#ck-form").hidden = false; $(".ck-resumo").hidden = false;
  });

  function aplicar(c) {
    cfg = c;
    $$("[data-produto-nome]").forEach(function (el) { el.textContent = (window.PRODUTO && PRODUTO.nome) || c.produto; });
    $("#ck-preco").textContent = brl(c.preco);
    $("#ck-parcelas").textContent = "Até " + c.parcelasMax + "x";
    var sel = $("#cc-parcelas");
    for (var i = 1; i <= c.parcelasMax; i++) { var o = document.createElement("option"); o.value = i; o.textContent = i + "x de " + brl(c.preco / i) + (i === 1 ? " (à vista)" : ""); sel.appendChild(o); }
    $("#ck-demo").hidden = !c.demo;
  }
  fetch("api/config").then(function (r) { if (!r.ok) throw new Error(); return r.json(); }).then(aplicar).catch(function () {
    // Sem servidor (prévia ou arquivo local): demonstração completa no navegador.
    demoLocal = true;
    aplicar({ produto: "Nome do Produto", preco: parseFloat(String((window.OFERTA && OFERTA.precoPor) || "19,90").replace(/[^0-9,]/g, "").replace(",", ".")) || 19.9, parcelasMax: 3, demo: true });
  });
  if (location.protocol !== "file:" && !sessionStorage.getItem("utms")) {
    var u = {}; new URLSearchParams(location.search).forEach(function (v, k) { if (/^(utm_|src$|sck$|fbclid$|gclid$)/.test(k)) u[k] = v; });
    try { sessionStorage.setItem("utms", JSON.stringify(u)); } catch (e) { /* ok */ }
  }
})();
