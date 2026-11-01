/* Barreira de acesso: a página só aparece se a chave guardada neste aparelho foi emitida por um pagamento aprovado. */
(function () {
  "use strict";
  var html = document.documentElement;
  html.classList.add("checando");
  function sair() { try { localStorage.removeItem("acesso"); sessionStorage.removeItem("acessoOk"); } catch (e) {} location.replace("login.html"); }
  var token = ""; try { token = localStorage.getItem("acesso") || ""; } catch (e) {}
  if (!token) return sair();
  try { if (sessionStorage.getItem("acessoOk") === token) return html.classList.remove("checando"); } catch (e) {}
  fetch("/api/acesso", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: token }) })
    .then(function (r) { return r.json(); })
    .then(function (r) {
      if (!r || !r.ok) return sair();
      try { sessionStorage.setItem("acessoOk", token); } catch (e) {}
      html.classList.remove("checando");
    })
    .catch(function () { html.classList.remove("checando"); }); /* sem internet: deixa abrir quem já tem a chave */
  setTimeout(function () { html.classList.remove("checando"); }, 6000);
})();
