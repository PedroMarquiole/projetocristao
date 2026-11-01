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
  const n = gw.lerNotificacao(req, corpo);
  if (n.erro) return json(res, 401, { erro: "Notificação inválida." });
  if (!n.externalId) {
    // Formato inesperado: registra o evento para ajustarmos (sem dados pessoais) e responde 200 para não reenviar.
    console.warn("Webhook sem external_id. Evento:", n.evento, "chaves:", Object.keys((corpo && corpo.data) || {}).join(","));
    return json(res, 200, { ok: true });
  }
  try {
    const p = await gw.consultar(n.externalId);          // a situação final vem sempre da API
    console.log("Pagamento", n.externalId, n.evento, "->", p.status);
    if (p.status === "approved") {
      /* TODO (PRÓXIMO PASSO): liberar o acesso.
         1. Gravar o e-mail da compradora numa lista (ex.: Supabase).
         2. Enviar o e-mail de boas-vindas com o link da área de membros (ex.: Resend).
         3. A área de membros consulta essa lista no login.
         4. Liberar os extras comprados. */
    }
    return json(res, 200, { ok: true });
  } catch (e) {
    console.error("Webhook: erro ao consultar", n.externalId, e.message);
    return json(res, 500, { erro: "tente de novo" });
  }
};
