# Jornada do Pequeno Discípulo

Um único projeto, publicado na Vercel:

| Endereço | O que é |
|---|---|
| `/` | Página de vendas |
| `/checkout.html` | Checkout próprio (Pix), com as funções de servidor em `/api` |
| `/obrigado.html` | Confirmação da compra |
| `/area-de-membros/login.html` | Área de membros |

## Publicar na Vercel
1. Em vercel.com: **Add New > Project**, importe este repositório do GitHub.
2. Framework Preset: **Other**. Não precisa de comando de build nem de pasta de saída.
3. Em **Settings > Environment Variables**, cadastre as variáveis do checkout (abaixo). Sem elas o checkout roda em **modo demonstração**.
4. A cada `git push` na branch principal, a Vercel publica sozinha.

Site estático (HTML + CSS + JS puro, sem build). Abre direto no navegador e aguenta tráfego alto
em qualquer hospedagem estática com CDN (Netlify, Vercel, Cloudflare Pages, Hostinger...).

## Antes de publicar (edite só `js/config.js`)
- `checkoutUrl`: link do seu checkout. Enquanto for o de exemplo, aparece uma faixa vermelha de aviso.
- `precoDe`, `precoPor`, `parcelamento`, `garantiaDias`, `totalPaginas`.
- `PRODUTO.nome`: troque também no `<title>` e nas tags `og:` do `index.html` (o WhatsApp não roda JavaScript).
- `og:image`: quando tiver o domínio, use o endereço completo da imagem (`https://.../img/compartilhar.jpg`).
- Rodapé e `privacidade.html` / `termos.html`: preencha e-mail de suporte e CPF/CNPJ (exigido nos anúncios).
- `DEPOIMENTOS`: só depoimentos reais. A seção aparece sozinha quando houver pelo menos um.

## Pixel do Facebook e Utmify (quando for usar)
Preencha `RASTREIO.facebookPixelId` e/ou `RASTREIO.utmifyPixelId` em `js/config.js`. Nada mais.
Eventos já disparados: `PageView`, `ViewContent` (ao ver a oferta) e `InitiateCheckout` (ao clicar em comprar).
As UTMs da URL (utm_*, src, sck, fbclid...) já são repassadas hoje para o link do checkout.

## Estrutura recomendada no servidor
```
/                      -> esta página (index.html)
/area-de-membros/      -> a área de membros
```
Os links "Já comprei" e "Área de membros" apontam para `../area-de-membros/login.html` (mude em `OFERTA.areaMembrosUrl`).
`js/demo-imagem-local.js` só é usado quando a página é aberta direto do computador (para a pintura funcionar no teste local).

## Checkout próprio (pagamento por API)
- Páginas: `checkout.html` (só Pix) e `obrigado.html`. Funções de servidor em `api/` (rodam na Vercel).
- **Preço cobrado:** `api/_oferta.js` (o navegador nunca define o valor). Mantenha igual ao `precoPor` de `js/config.js`.
- **Empresa de pagamento (BuckPay):** preencha os pontos `TODO BUCKPAY` em `api/_gateway.js` (endereços e campos da API).
- **Ofertas extras (order bump):** em `api/_oferta.js` > `extras`. Só deixe `ativo: true` nos materiais que já existem.
- **Depoimentos:** só reais, na lista `DEPOIMENTOS` de `js/config.js`. Aparecem na página de vendas e no checkout.
- **Variáveis na Vercel** (Settings > Environment Variables): `GATEWAY_API_URL`, `GATEWAY_SECRET_KEY`,
  `GATEWAY_WEBHOOK_SECRET` (se houver). Sem a chave secreta, roda em modo demonstração.
- **Webhook:** cadastre `https://SEU-DOMINIO/api/webhook` no painel da BuckPay.
- **Próximo passo:** liberar o acesso automaticamente quando o pagamento for aprovado (ver TODO em `api/webhook.js`).

## Antes de cada envio
Rode `python3 versionar.py`. Ele atualiza a versão dos arquivos CSS/JS nas páginas, para quem já visitou o site
receber a versão nova na hora, sem ficar preso no cache do celular.
