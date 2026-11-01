/* Utilidades das funções: validação de dados e respostas JSON. */
function json(res, status, dados) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(dados));
}

async function lerCorpo(req) {
  if (req.body && typeof req.body === "object") return req.body;       // Vercel já entrega o JSON pronto
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return {}; } }
  const pedacos = []; for await (const p of req) pedacos.push(p);
  try { return JSON.parse(Buffer.concat(pedacos).toString("utf8") || "{}"); } catch { return {}; }
}

const soDigitos = (s) => String(s || "").replace(/\D/g, "");

function cpfValido(cpf) {
  cpf = soDigitos(cpf);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  for (let t = 9; t < 11; t++) {
    let s = 0;
    for (let i = 0; i < t; i++) s += Number(cpf[i]) * (t + 1 - i);
    if (((s * 10) % 11) % 10 !== Number(cpf[t])) return false;
  }
  return true;
}

const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || "").trim());

/* Valida os dados da compradora. Devolve {erro} ou {cliente}. */
function validarCliente(c = {}) {
  const nome = String(c.nome || "").trim().replace(/\s+/g, " ");
  const email = String(c.email || "").trim().toLowerCase();
  const cpf = soDigitos(c.cpf);
  const telefone = soDigitos(c.telefone);
  if (nome.split(" ").length < 2) return { erro: "Digite seu nome completo." };
  if (!emailValido(email)) return { erro: "Digite um e-mail válido. É nele que você recebe o acesso." };
  if (!cpfValido(cpf)) return { erro: "Confira o CPF: o número digitado não é válido." };
  const [primeiro, ...resto] = nome.split(" ");
  return { cliente: { nome, primeiro, sobrenome: resto.join(" "), email, cpf, telefone } };
}

/* Só guarda parâmetros de rastreio conhecidos (UTMs etc.). */
function limparUtms(u = {}) {
  const ok = {};
  for (const [k, v] of Object.entries(u || {})) {
    if (/^(utm_[a-z]+|src|sck|xcod|fbclid|gclid|ttclid)$/.test(k) && typeof v === "string") ok[k] = v.slice(0, 200);
  }
  return ok;
}

function urlBase(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${req.headers["x-forwarded-host"] || req.headers.host}`;
}

module.exports = { json, lerCorpo, soDigitos, cpfValido, validarCliente, limparUtms, urlBase };
