/*
  Chave de acesso à área de membros, sem banco de dados.
  Quando o pagamento é aprovado, o servidor assina um código (HMAC) ligado àquele pedido.
  O navegador guarda o código; a área de membros só abre se o servidor confirmar que a assinatura é válida.
  A chave de assinatura vem de ACESSO_SEGREDO (opcional); se não existir, usa os segredos que já estão na Vercel.
*/
const crypto = require("crypto");

function chave() {
  return process.env.ACESSO_SEGREDO || process.env.GATEWAY_WEBHOOK_TOKEN || process.env.GATEWAY_SECRET_KEY || "demonstracao-sem-chave";
}
function assinatura(corpo) {
  return crypto.createHmac("sha256", chave()).update("acesso-v1:" + corpo).digest("base64url");
}
function emitir(idPedido) {
  const corpo = Buffer.from(JSON.stringify({ i: String(idPedido), t: Date.now() })).toString("base64url");
  return corpo + "." + assinatura(corpo);
}
function validar(token) {
  const [corpo, sig] = String(token || "").split(".");
  if (!corpo || !sig || corpo.length > 400) return false;
  const esperado = assinatura(corpo);
  try { return sig.length === esperado.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(esperado)); } catch (e) { return false; }
}
module.exports = { emitir, validar };
