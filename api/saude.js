/*
  GET /api/saude  ->  diz se as variáveis do checkout foram reconhecidas pelo site.
  Mostra só "sim/não", NUNCA os valores. Serve para conferir a configuração depois de um deploy.
*/
const { json } = require("./_util");
const gw = require("./_gateway");

module.exports = (req, res) => {
  const tem = (nome) => Boolean(process.env[nome]);
  const variaveis = {
    GATEWAY_SECRET_KEY: tem("GATEWAY_SECRET_KEY"),       // obrigatória: sem ela o checkout fica em demonstração
    GATEWAY_USER_AGENT: tem("GATEWAY_USER_AGENT"),       // pedida pela BuckPay; sem ela a cobrança pode ser recusada
    GATEWAY_WEBHOOK_TOKEN: tem("GATEWAY_WEBHOOK_TOKEN"), // recomendada: protege o aviso de pagamento
    GATEWAY_OFFER_SLUG: tem("GATEWAY_OFFER_SLUG")        // opcional: liga a venda à oferta da BuckPay
  };
  const faltando = Object.keys(variaveis).filter((k) => !variaveis[k]);
  json(res, 200, {
    modo: gw.modoDemo() ? "demonstracao (nada é cobrado)" : "real (cobra de verdade)",
    variaveis,
    faltando,
    dica: gw.modoDemo()
      ? "Cadastre GATEWAY_SECRET_KEY na Vercel (Settings > Environment Variables) e faça um novo deploy."
      : (variaveis.GATEWAY_USER_AGENT ? "Tudo certo para cobrar." : "Pronto para testar. Se o Pix falhar, peça o User-Agent ao gerente da BuckPay e cadastre GATEWAY_USER_AGENT.")
  });
};
