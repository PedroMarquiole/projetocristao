/* POST /api/pix  { cliente, utms, chave }  ->  cria a cobrança Pix e devolve o QR Code. */
const oferta = require("./_oferta");
const gw = require("./_gateway");
const { json, lerCorpo, validarCliente, limparUtms, urlBase } = require("./_util");

module.exports = async (req, res) => {
  if (req.method !== "POST") return json(res, 405, { erro: "Use POST." });
  const corpo = await lerCorpo(req);
  const v = validarCliente(corpo.cliente);
  if (v.erro) return json(res, 400, { erro: v.erro });
  const expira = new Date(Date.now() + oferta.pixExpiraMin * 60000);

  if (gw.modoDemo()) {
    // Código de exemplo: NÃO é um Pix válido. O status aprova sozinho em ~12 s para testar o fluxo.
    return json(res, 200, { demo: true, id: "demo-" + Date.now(), status: "pending", expiraEm: expira.toISOString(),
      copiaECola: "00020126DEMONSTRACAO-ESTE-PIX-NAO-E-VALIDO520400005303986540" + oferta.preco.toFixed(2) + "5802BR6304DEMO", qrBase64: "" });
  }
  try {
    const p = await gw.criarPix({
      valor: oferta.preco, descricao: oferta.descricao, cliente: v.cliente, expiraEm: expira,
      urlNotificacao: urlBase(req) + "/api/webhook", metadados: { produto: oferta.produto, ...limparUtms(corpo.utms) },
      idempotencia: String(corpo.chave || "").slice(0, 64) || undefined
    });
    if (!p.copiaECola) throw new Error("resposta sem código Pix");
    return json(res, 200, { ...p, expiraEm: expira.toISOString() });
  } catch (e) {
    console.error("Erro ao criar Pix:", e.message, JSON.stringify(e.detalhe || {}));
    return json(res, 502, { erro: "Não foi possível gerar o Pix agora. Tente de novo em instantes." });
  }
};
