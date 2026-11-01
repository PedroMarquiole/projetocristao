# Área de Membros

Abra `login.html` (ou `index.html`) direto no navegador — não precisa de servidor nem de build.

- **Trocar o nome/slogan:** edite `js/config.js` e rode `python3 tools/gerar_assets.py` (atualiza os PDFs).
- **Trocar o símbolo da logo:** substitua `img/logo.svg`.
- **Textos e lista de páginas:** `js/paginas.js` (JSON válido). Cada página aponta para sua imagem no campo `"imagem"`.
- **Adicionar desenhos novos:**
  1. `pip install pillow numpy scipy ncnn potracer reportlab svglib`
  2. `python3 tools/separar_paineis.py imagem.jpg pasta/`. Funciona com uma grade ou com um desenho só.
     Imagem grande (1024 px ou mais) só tem o fundo limpo. Recorte pequeno é ampliado com IA e vetorizado.
  3. Copie o PNG para `img/` (site) e o SVG, se houver, para `img/vetor/` (impressão), acrescente a página em
     `js/paginas.js` (`"imagem"` e `"imagem_impressao"`) e rode `python3 tools/gerar_assets.py`.
- **Prompts das ilustrações:** `PROMPTS-ILUSTRACOES.md`. As grades originais estão em `originais/`.
- Procure por `TODO (BACKEND REAL)` no código para ver onde entram login, sessão e checkout.
