/* GET /api/config  ->  dados públicos para montar o checkout (preços vêm do servidor). */
const oferta = require("./_oferta");
const gw = require("./_gateway");
const { json } = require("./_util");

module.exports = (req, res) => json(res, 200, {
  produto: oferta.produto, descricao: oferta.descricao, preco: oferta.preco, pixExpiraMin: oferta.pixExpiraMin,
  extras: oferta.extras.filter((e) => e.ativo).map(({ id, nome, descricao, precoDe, preco }) => ({ id, nome, descricao, precoDe, preco })),
  demo: gw.modoDemo()
});
