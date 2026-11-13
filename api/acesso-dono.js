/*
  GET /api/acesso-dono?senha=...  ->  abre a área de membros para o dono do produto, sem compra.
  A senha fica SÓ na Vercel, na variável ACESSO_DONO_SENHA (use pelo menos 16 caracteres).
  Sem essa variável, a rota fica desligada.
*/
const crypto = require("crypto");
const { json } = require("./_util");
const { emitir } = require("./_acesso");

function igual(a, b) {
  const x = crypto.createHash("sha256").update(String(a)).digest();
  const y = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

module.exports = (req, res) => {
  const senhaCerta = process.env.ACESSO_DONO_SENHA || "";
  if (senhaCerta.length < 16) return json(res, 404, { erro: "Não encontrado." });
  const recebida = String((req.query && req.query.senha) || new URL(req.url || "/", "http://x").searchParams.get("senha") || "");
  if (!igual(recebida, senhaCerta)) return json(res, 403, { erro: "Senha incorreta." });
  res.statusCode = 302;
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Location", "/area-de-membros/login.html?acesso=" + encodeURIComponent(emitir("dono")) + "&n=Dono");
  res.end();
};
