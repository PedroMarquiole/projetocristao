/* POST /api/pix  { cliente, utms, chave }  ->  cria a cobrança Pix e devolve o QR Code. */
const oferta = require("./_oferta");
const gw = require("./_gateway");
const { json, lerCorpo, validarCliente, limparUtms, urlBase } = require("./_util");

module.exports = async (req, res) => {
  if (req.method !== "POST") return json(res, 405, { erro: "Use POST." });
  const corpo = await lerCorpo(req);
  const v = validarCliente(corpo.cliente);
  if (v.erro) return json(res, 400, { erro: v.erro });
  // Tempo mostrado na tela. Confirme com a BuckPay quanto tempo o Pix vale de verdade.
  const expira = new Date(Date.now() + oferta.pixExpiraMin * 60000);

  // Total calculado no servidor: produto + extras válidos marcados (ids desconhecidos são ignorados).
  const pedidos = Array.isArray(corpo.extras) ? corpo.extras.map(String) : [];
  const extras = oferta.extras.filter((e) => e.ativo && pedidos.includes(e.id));
  const total = Math.round((oferta.preco + extras.reduce((s, e) => s + e.preco, 0)) * 100) / 100;
  const descricao = [oferta.descricao, ...extras.map((e) => e.nome)].join(" + ").slice(0, 250);

  if (gw.modoDemo()) {
    // Código de exemplo: NÃO é um Pix válido. O status aprova sozinho em ~12 s para testar o fluxo.
    return json(res, 200, { demo: true, id: "demo-" + Date.now(), status: "pending", expiraEm: expira.toISOString(), total, extras: extras.map((e) => e.id),
      copiaECola: "00020126DEMONSTRACAO-ESTE-PIX-NAO-E-VALIDO520400005303986540" + total.toFixed(2) + "5802BR6304DEMO", qrBase64: "" });
  }
  try {
    const p = await gw.criarPix({
      valor: total, nomeProduto: descricao, cliente: v.cliente, utms: limparUtms(corpo.utms),
      urlNotificacao: gw.urlWebhook(urlBase(req)), slugOferta: process.env.GATEWAY_OFFER_SLUG || oferta.slugBuckPay
    });
    if (!p.copiaECola) throw new Error("resposta sem código Pix");
    return json(res, 200, { id: p.id, status: p.status, copiaECola: p.copiaECola, qrBase64: p.qrBase64, expiraEm: expira.toISOString(), total, extras: extras.map((e) => e.id) });
  } catch (e) {
    console.error("Erro ao criar Pix:", e.message, JSON.stringify(e.detalhe || {}));
    return json(res, 502, { erro: "Não foi possível gerar o Pix agora. Tente de novo em instantes." });
  }
};
