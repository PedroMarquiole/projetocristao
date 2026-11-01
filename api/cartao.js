/* POST /api/cartao  { cliente, cartao: { token, parcelas }, utms, chave } */
const oferta = require("./_oferta");
const gw = require("./_gateway");
const { json, lerCorpo, validarCliente, limparUtms, urlBase } = require("./_util");

module.exports = async (req, res) => {
  if (req.method !== "POST") return json(res, 405, { erro: "Use POST." });
  const corpo = await lerCorpo(req);
  const v = validarCliente(corpo.cliente);
  if (v.erro) return json(res, 400, { erro: v.erro });
  const k = corpo.cartao || {};
  const parcelas = Math.min(Math.max(parseInt(k.parcelas, 10) || 1, 1), oferta.parcelasMax);

  if (gw.modoDemo()) return json(res, 200, { demo: true, id: "demo-" + Date.now(), status: "approved" });
  if (!k.token) return json(res, 400, { erro: "Preencha os dados do cartão." });
  try {
    const p = await gw.criarCartao({
      valor: oferta.preco, descricao: oferta.descricao, cliente: v.cliente, tokenCartao: k.token, parcelas,
      urlNotificacao: urlBase(req) + "/api/webhook", metadados: { produto: oferta.produto, ...limparUtms(corpo.utms) },
      idempotencia: String(corpo.chave || "").slice(0, 64) || undefined
    });
    const motivo = p.status === "rejected" ? "Pagamento recusado pelo banco. Confira os dados, tente outro cartão ou pague com Pix." : "";
    return json(res, 200, { id: p.id, status: p.status, motivo });
  } catch (e) {
    console.error("Erro no cartão:", e.message, JSON.stringify(e.detalhe || {}));
    return json(res, 502, { erro: "Não foi possível processar o cartão agora. Tente de novo ou pague com Pix." });
  }
};
