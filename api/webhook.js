/*
  POST /api/webhook  ->  a empresa de pagamento avisa aqui quando um pagamento muda.
  Cadastre https://SEU-DOMINIO/api/webhook no painel da BuckPay (postback / webhook).
  A situação é SEMPRE confirmada consultando a API, nunca só pelo corpo da notificação.
*/
const gw = require("./_gateway");
const { json, lerCorpo } = require("./_util");

module.exports = async (req, res) => {
  if (req.method !== "POST") return json(res, 200, { ok: true });
  if (gw.modoDemo()) return json(res, 200, { ok: true });
  const corpo = await lerCorpo(req);
  const id = gw.lerNotificacao(req, corpo);
  if (!id) return json(res, 401, { erro: "Notificação inválida." });
  try {
    const p = await gw.consultar(id);
    console.log("Pagamento", id, p.status, p.email);
    if (p.status === "approved") {
      /* TODO (PRÓXIMO PASSO): liberar o acesso.
         1. Gravar p.email numa lista de compradoras (ex.: Supabase).
         2. Enviar o e-mail de boas-vindas com o link da área de membros (ex.: Resend).
         3. A área de membros consulta essa lista no login.
         4. Liberar também os extras comprados (lista em metadados.extras, ex.: "oracoes,datas").
         5. Avisar a Utmify da venda (as UTMs vão em metadados). */
    }
    return json(res, 200, { ok: true });
  } catch (e) {
    console.error("Webhook: erro ao consultar", id, e.message);
    return json(res, 500, { erro: "tente de novo" });
  }
};
