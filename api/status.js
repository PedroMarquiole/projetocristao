/* GET /api/status?id=...  ->  situação do pagamento (o checkout consulta enquanto espera o Pix). */
const gw = require("./_gateway");
const { json } = require("./_util");

module.exports = async (req, res) => {
  const id = String((req.query && req.query.id) || new URL(req.url, "http://x").searchParams.get("id") || "").slice(0, 80);
  if (!id) return json(res, 400, { erro: "Informe o id." });
  if (id.startsWith("demo-")) return json(res, 200, { demo: true, status: Date.now() - (Number(id.slice(5)) || 0) > 12000 ? "approved" : "pending" });
  if (gw.modoDemo()) return json(res, 404, { erro: "Pagamento não encontrado." });
  try { const p = await gw.consultar(id); return json(res, 200, { status: p.status }); }
  catch (e) { return json(res, e.status === 404 ? 404 : 502, { erro: "Não foi possível consultar o pagamento." }); }
};
