/*
  ============================================================
  CONFIGURAÇÃO DA PÁGINA DE VENDAS — edite SÓ este arquivo.
  ============================================================
  Obs.: o nome do produto também aparece nas tags <title> e og: do index.html
  (o WhatsApp e o Facebook leem só o HTML, sem rodar JavaScript). Ao definir o nome,
  troque lá também.
*/
const PRODUTO = {
  nome: "Jornada do Pequeno Discípulo",              // mesmo nome usado na área de membros
  nomeArquivo: "jornada-do-pequeno-discipulo",
  slogan: ""                          // sem subtítulo (deixe "" para não mostrar)
};

const OFERTA = {
  // Página de checkout própria (pagamento via API, ver api/_gateway.js).
  checkoutUrl: "checkout.html",

  // Valores EXIBIDOS na página. O valor COBRADO fica em api/_oferta.js: mantenha os dois iguais.
  precoDe: "R$ 47,00",                  // deixe "" para não mostrar o preço riscado
  precoPor: "R$ 19,90",
  parcelamento: "",                     // deixe "" para esconder (o checkout aceita só Pix)
  garantiaDias: 7,
  totalPaginas: 37,

  areaMembrosUrl: "/area-de-membros/login.html"
};

/* Depoimentos REAIS de clientes. A seção só aparece quando houver pelo menos um.
   Exemplo: { nome: "Ana, mãe do Pedro (6 anos)", texto: "...", cidade: "Recife/PE" } */
const DEPOIMENTOS = [];

/* Rastreamento (deixe vazio até configurar). Veja js/rastreio.js. */
const RASTREIO = {
  facebookPixelId: "",   // ex.: "123456789012345"
  utmifyPixelId: ""      // ex.: "abc123..." (painel da Utmify)
};
