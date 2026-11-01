/* GET /api/config  ->  dados públicos para montar o checkout. */
const oferta = require("./_oferta");
const gw = require("./_gateway");
const { json } = require("./_util");

module.exports = (req, res) => json(res, 200, {
  produto: oferta.produto, descricao: oferta.descricao, preco: oferta.preco,
  parcelasMax: oferta.parcelasMax, pixExpiraMin: oferta.pixExpiraMin,
  publicKey: gw.publicKey(), demo: gw.modoDemo()
});
