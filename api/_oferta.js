/*
  Fonte da verdade do PREÇO na hora de cobrar. O navegador nunca define o valor.
  Ao mudar o preço, mude aqui E em js/config.js (que só exibe o valor na página).
*/
module.exports = {
  produto: "Nome do Produto",
  descricao: "Jornada pela Bíblia para colorir (acesso digital)",
  preco: 19.90,            // em reais
  parcelasMax: 3,          // cartão: até quantas vezes
  pixExpiraMin: 30         // validade do QR Code Pix, em minutos
};
