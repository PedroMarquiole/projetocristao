/*
  GET /api/acesso-dono?senha=...  ->  abre a área de membros para o dono do produto, sem compra.
  Funciona de dois jeitos:
  1. Link do dono: /api/acesso-dono?senha=CODIGO. Aqui fica só o HASH do código (o código não está no repositório).
  2. Senha própria: defina ACESSO_DONO_SENHA na Vercel (16+ caracteres).
  Para trocar o link do dono, gere um código novo e troque o HASH_DONO abaixo.
*/
const crypto = require("crypto");
const { json } = require("./_util");
const { emitir } = require("./_acesso");

function igual(a, b) {
  const x = crypto.createHash("sha256").update(String(a)).digest();
  const y = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

const HASH_DONO = "70a0db699f038af3ecea491a79af7dcabeb327f529b4d01a3f86251b177493a3";

module.exports = (req, res) => {
  const senhaCerta = process.env.ACESSO_DONO_SENHA || "";
  const recebida = String((req.query && req.query.senha) || new URL(req.url || "/", "http://x").searchParams.get("senha") || "");
  const hashRecebido = crypto.createHash("sha256").update(recebida).digest("hex");
  const okDono = recebida.length >= 16 && igual(hashRecebido, HASH_DONO);
  const okSenha = senhaCerta.length >= 16 && igual(recebida, senhaCerta);
  if (!okDono && !okSenha) return json(res, 403, { erro: "Acesso negado." });
  res.statusCode = 302;
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Location", "/area-de-membros/login.html?acesso=" + encodeURIComponent(emitir("dono")) + "&n=Dono");
  res.end();
};
