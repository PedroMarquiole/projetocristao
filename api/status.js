/* GET /api/status?id=...  ->  situação do pagamento (o checkout consulta enquanto espera o Pix). */
const gw = require("./_gateway");
const { json } = require("./_util");
const { emitir } = require("./_acesso");

module.exports = async (req, res) => {
  const id = String((req.query && req.query.id) || new URL(req.url, "http://x").searchParams.get("id") || "").slice(0, 80);
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) return json(res, 400, { erro: "Informe um id válido." });
  if (id.startsWith("demo-")) return json(res, 200, { demo: true, ...(Date.now() - (Number(id.slice(5)) || 0) > 12000 ? { status: "approved", acesso: emitir(id) } : { status: "pending" }) });
  if (gw.modoDemo()) return json(res, 404, { erro: "Pagamento não encontrado." });
  try { const p = await gw.consultar(id); return json(res, 200, p.status === "approved" ? { status: p.status, acesso: emitir(id) } : { status: p.status }); }
  catch (e) { return json(res, e.status === 404 ? 404 : 502, { erro: "Não foi possível consultar o pagamento." }); }
};
