/* POST /api/acesso  { token }  ->  { ok: true } se o código foi emitido por um pagamento aprovado. */
const { json, lerCorpo } = require("./_util");
const { validar } = require("./_acesso");

module.exports = async (req, res) => {
  if (req.method !== "POST") return json(res, 405, { erro: "Use POST." });
  const corpo = await lerCorpo(req);
  return json(res, 200, { ok: validar(corpo && corpo.token) });
};
