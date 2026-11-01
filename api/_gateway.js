/*
  ============================================================
  ADAPTADOR DE PAGAMENTO — o ÚNICO arquivo que conhece a empresa de pagamento.
  Empresa escolhida: BuckPay. Preencha os pontos "TODO BUCKPAY" com a documentação
  da API deles. O resto do checkout (telas, validações, status, webhook) não muda.

  Variáveis de ambiente (Vercel > Settings > Environment Variables):
    GATEWAY_API_URL      endereço base da API (ex.: o que a BuckPay informar)
    GATEWAY_SECRET_KEY   chave SECRETA da conta. Nunca no código nem no navegador.
    GATEWAY_WEBHOOK_SECRET  segredo para validar as notificações, se houver

  Sem GATEWAY_SECRET_KEY o checkout roda em MODO DEMONSTRAÇÃO (nada é cobrado).

  Formato padrão que o resto do sistema espera (independe da empresa):
    status: "pending" | "approved" | "rejected" | "expired" | "refunded"
  ============================================================
*/
const crypto = require("crypto");

const BASE = () => (process.env.GATEWAY_API_URL || "").replace(/\/+$/, "");
const SECRET = () => process.env.GATEWAY_SECRET_KEY || "";
const modoDemo = () => !SECRET() || !BASE();

async function chamar(caminho, { method = "GET", corpo, idempotencia } = {}) {
  const r = await fetch(BASE() + caminho, {
    method,
    headers: {
      // TODO BUCKPAY: confirme o formato da autenticação (ex.: "Bearer <chave>" ou outro cabeçalho).
      Authorization: "Bearer " + SECRET(),
      "Content-Type": "application/json",
      ...(idempotencia ? { "Idempotency-Key": idempotencia } : {})
    },
    body: corpo ? JSON.stringify(corpo) : undefined
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error((dados && (dados.message || dados.error)) || "HTTP " + r.status); e.status = r.status; e.detalhe = dados; throw e; }
  return dados;
}

/* TODO BUCKPAY: traduza o status da BuckPay para o padrão acima. */
function traduzirStatus(s) {
  const v = String(s || "").toLowerCase();
  if (["paid", "approved", "aprovado", "pago", "completed", "succeeded"].includes(v)) return "approved";
  if (["refused", "rejected", "recusado", "failed", "denied"].includes(v)) return "rejected";
  if (["expired", "expirado", "canceled", "cancelled"].includes(v)) return "expired";
  if (["refunded", "estornado", "chargeback"].includes(v)) return "refunded";
  return "pending";
}

/* Cria cobrança Pix. Devolve { id, status, copiaECola, qrBase64 } */
async function criarPix({ valor, descricao, cliente, expiraEm, urlNotificacao, metadados, idempotencia }) {
  // TODO BUCKPAY: endpoint e nomes dos campos conforme a documentação.
  const r = await chamar("/pix", {
    method: "POST", idempotencia,
    corpo: {
      amount: Math.round(valor * 100),            // centavos (confirme se a BuckPay usa centavos ou reais)
      description: descricao,
      expires_at: expiraEm.toISOString(),
      postback_url: urlNotificacao,
      customer: { name: cliente.nome, email: cliente.email, document: cliente.cpf, phone: cliente.telefone },
      metadata: metadados
    }
  });
  return {
    id: String(r.id),
    status: traduzirStatus(r.status),
    copiaECola: r.pix_code || r.qr_code || r.copy_paste,          // TODO BUCKPAY: campo do "copia e cola"
    qrBase64: (r.qr_code_base64 || r.qrcode_image || "").replace(/^data:image\/\w+;base64,/, "") // TODO BUCKPAY
  };
}

/* Consulta um pagamento. Devolve { id, status, email } */
async function consultar(id) {
  // TODO BUCKPAY: endpoint de consulta.
  const r = await chamar("/transactions/" + encodeURIComponent(id));
  return { id: String(r.id), status: traduzirStatus(r.status), email: (r.customer && r.customer.email) || "" };
}

/* Lê a notificação (webhook). Devolve o id do pagamento ou "" se não for válida.
   A situação final SEMPRE é confirmada depois com consultar(id). */
function lerNotificacao(req, corpo) {
  const segredo = process.env.GATEWAY_WEBHOOK_SECRET;
  if (segredo) {
    // TODO BUCKPAY: confirme o nome do cabeçalho e como a assinatura é calculada.
    const recebida = String(req.headers["x-signature"] || req.headers["x-buckpay-signature"] || "");
    const esperada = crypto.createHmac("sha256", segredo).update(JSON.stringify(corpo)).digest("hex");
    try { if (!crypto.timingSafeEqual(Buffer.from(recebida), Buffer.from(esperada))) return ""; } catch { return ""; }
  }
  const d = corpo.data || corpo.transaction || corpo;   // TODO BUCKPAY: onde vem o id na notificação
  return String((d && d.id) || "");
}

module.exports = { modoDemo, criarPix, consultar, lerNotificacao };
