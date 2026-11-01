/*
  Fonte da verdade dos PREÇOS na hora de cobrar. O navegador nunca define valores:
  ele só diz QUAIS extras a pessoa marcou, e o total é calculado aqui.
  Ao mudar o preço principal, mude também o precoPor de js/config.js (que só exibe).
*/
module.exports = {
  produto: "Jornada do Pequeno Discípulo",
  descricao: "Jornada pela Bíblia para colorir (acesso digital)",
  preco: 19.90,            // produto principal, em reais
  pixExpiraMin: 30,        // tempo mostrado na tela para pagar (confirme com a BuckPay a validade real do Pix)
  slugBuckPay: "",         // slug da oferta no painel da BuckPay (liga a venda à oferta e dispara automações)

  /* Ofertas extras do checkout (marcadas pela pessoa antes de gerar o Pix).
     ATENÇÃO: só deixe "ativo: true" nos extras que JÁ EXISTEM e serão entregues.
     Vender um material que não existe gera reembolso e reclamação. */
  extras: [
    {
      id: "oracoes",
      ativo: true,
      nome: "Orações para a Hora de Dormir",
      descricao: "30 cartões de oração ilustrados para imprimir e rezar com seu filho antes de dormir.",
      precoDe: 19.90,
      preco: 9.90
    },
    {
      id: "versiculos",
      ativo: true,
      nome: "Versículos para Decorar",
      descricao: "Cartões com um versículo para cada página da jornada, para a criança aprender de cor.",
      precoDe: 17.90,
      preco: 7.90
    },
    {
      id: "datas",
      ativo: true,
      nome: "Kit Datas Cristãs",
      descricao: "Desenhos especiais de Natal, Páscoa e Pentecostes para colorir em família.",
      precoDe: 24.90,
      preco: 12.90
    }
  ]
};
