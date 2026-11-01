/*
  ============================================================
  ADAPTADOR BUCKPAY — o ÚNICO arquivo que conhece a empresa de pagamento.
  Documentação: https://docs.buckpay.com.br/docs
  API: https://api.realtechdev.com.br  (POST /v1/transactions, GET /v1/transactions/external_id/:id)

  Variáveis de ambiente (Vercel > Settings > Environment Variables):
    GATEWAY_SECRET_KEY     token de 40 caracteres da BuckPay (Bearer). Nunca no código nem no navegador.
    GATEWAY_USER_AGENT     valor do cabeçalho User-Agent informado pelo seu gerente de contas.
                           Sem o valor correto, a BuckPay pode recusar as chamadas.
    GATEWAY_WEBHOOK_TOKEN  (recomendado) senha que vai na URL do webhook, para recusar avisos falsos.
    GATEWAY_API_URL        (opcional) só se a BuckPay mudar o endereço da API.

  Sem GATEWAY_SECRET_KEY o checkout roda em MODO DEMONSTRAÇÃO (nada é cobrado).

  Padrão interno de status, independente da empresa:
    "pending" | "approved" | "rejected" | "expired" | "refunded"
  ============================================================
*/
const crypto = require("crypto");

const BASE = () => (process.env.GATEWAY_API_URL || "https://api.realtechdev.com.br").replace(/\/+$/, "");
const SECRET = () => process.env.GATEWAY_SECRET_KEY || "";
const modoDemo = () => !SECRET();

async function chamar(caminho, { method = "GET", corpo } = {}) {
  const ua = process.env.GATEWAY_USER_AGENT;
  if (!ua) console.warn("GATEWAY_USER_AGENT não definido: a BuckPay pode recusar a chamada.");
  const r = await fetch(BASE() + caminho, {
    method,
    headers: {
      Authorization: "Bearer " + SECRET(),
      "User-Agent": ua || "JornadaDoPequenoDiscipulo/1.0",
      "Content-Type": "application/json"
    },
    body: corpo ? JSON.stringify(corpo) : undefined
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error((dados.error && (dados.error.message + (dados.error.detail ? ": " + JSON.stringify(dados.error.detail) : ""))) || "HTTP " + r.status);
    e.status = r.status; e.detalhe = dados; throw e;
  }
  return dados.data || dados;
}

/* Status da BuckPay -> padrão interno. Status desconhecidos ficam "pending" (o tempo do Pix encerra a espera). */
function traduzirStatus(s) {
  const v = String(s || "").toLowerCase();
  if (["paid", "approved", "completed", "succeeded"].includes(v)) return "approved";
  if (["refused", "rejected", "failed", "denied", "canceled", "cancelled"].includes(v)) return "rejected";
  if (["expired"].includes(v)) return "expired";
  if (["refunded", "chargeback"].includes(v)) return "refunded";
  return "pending";
}

/* Mapeia as UTMs do anúncio para o campo "tracking" da BuckPay (alimenta a Utmify). */
function montarTracking(u = {}) {
  const t = {};
  for (const k of ["ref", "src", "sck", "utm_source", "utm_medium", "utm_campaign", "utm_id", "utm_term", "utm_content"]) {
    t[k] = u[k] != null ? String(u[k]).slice(0, 200) : null;
  }
  return t;
}

/* Identificador nosso, único por tentativa (a BuckPay recusa external_id repetido). Só letras, números, - e _. */
const novoExternalId = () => "jpd-" + Date.now().toString(36) + "-" + crypto.randomBytes(5).toString("hex");

/* Cria cobrança Pix. Devolve { id (nosso external_id), idGateway, status, copiaECola, qrBase64 } */
async function criarPix({ valor, nomeProduto, cliente, urlNotificacao, utms, slugOferta }) {
  const externalId = novoExternalId();
  const telefone = cliente.telefone && cliente.telefone.length >= 10 ? (cliente.telefone.startsWith("55") && cliente.telefone.length > 11 ? cliente.telefone : "55" + cliente.telefone) : undefined;
  const corpo = {
    external_id: externalId,
    payment_method: "pix",
    amount: Math.round(valor * 100),                      // centavos (mínimo 600, máximo 300000)
    buyer: { name: cliente.nome, email: cliente.email, document: cliente.cpf, ...(telefone ? { phone: telefone } : {}) },
    product: { name: String(nomeProduto).slice(0, 120) },
    tracking: montarTracking(utms)
  };
  if (slugOferta) corpo.offer = { slug: slugOferta };     // liga a venda à oferta do painel (automações)
  if (urlNotificacao) corpo.postbackUrl = urlNotificacao;
  const d = await chamar("/v1/transactions", { method: "POST", corpo });
  const pix = d.pix || {};
  return {
    id: externalId,
    idGateway: String(d.id || ""),
    status: traduzirStatus(d.status),
    copiaECola: pix.code,
    qrBase64: String(pix.qrcode_base64 || "").replace(/^data:image\/\w+;base64,/, "")
  };
}

/* Consulta pelo nosso external_id. Devolve { status } */
async function consultar(externalId) {
  const d = await chamar("/v1/transactions/external_id/" + encodeURIComponent(externalId));
  return { id: String(d.id || ""), status: traduzirStatus(d.status) };
}

/* Webhook: a BuckPay não assina as notificações. Proteção: senha na URL (GATEWAY_WEBHOOK_TOKEN)
   e confirmação da situação SEMPRE pela API (consultar). Devolve o external_id ou "". */
function urlWebhook(base) {
  const t = process.env.GATEWAY_WEBHOOK_TOKEN;
  return base + "/api/webhook" + (t ? "?t=" + encodeURIComponent(t) : "");
}
function lerNotificacao(req, corpo) {
  const t = process.env.GATEWAY_WEBHOOK_TOKEN;
  if (t) {
    const recebido = String(new URL(req.url || "/", "http://x").searchParams.get("t") || "");
    try { if (!crypto.timingSafeEqual(Buffer.from(recebido), Buffer.from(t))) return { erro: "token" }; } catch { return { erro: "token" }; }
  }
  const d = (corpo && (corpo.data || corpo.transaction)) || corpo || {};
  const externalId = String(d.external_id || d.externalId || (d.transaction && d.transaction.external_id) || "");
  return { evento: corpo && corpo.event, externalId };
}

module.exports = { modoDemo, criarPix, consultar, urlWebhook, lerNotificacao, traduzirStatus, montarTracking };
