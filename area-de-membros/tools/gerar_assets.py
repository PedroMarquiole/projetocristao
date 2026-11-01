#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gera os arquivos estáticos do site:
  - img/logo.svg
  - pdfs/pagina-XX-*.pdf  (uma página de colorir por item de js/paginas.js, A4 retrato)
  - pdfs/diploma.pdf      (A4 paisagem)

Não faz parte do site em execução (o site é HTML/CSS/JS puro).
Requisitos: pip install reportlab svglib
Uso:  python3 tools/gerar_assets.py   (nunca altera as ilustrações em /img)
As ilustrações vêm de js/paginas.js: "imagem" (site) e, se houver, "imagem_impressao" (PDF).
Para separar desenhos novos de uma grade, veja tools/separar_paineis.py.
Lê o nome/slogan de js/config.js e os dados de js/paginas.js,
então para trocar o nome basta editar config.js e rodar de novo.
"""
import json, re, sys
from pathlib import Path

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import simpleSplit
from reportlab.pdfgen import canvas
from reportlab.graphics import renderPDF
from svglib.svglib import svg2rlg
from reportlab.lib.utils import ImageReader

RAIZ = Path(__file__).resolve().parent.parent
IMG, PDFS = RAIZ / "img", RAIZ / "pdfs"
IMG.mkdir(exist_ok=True); PDFS.mkdir(exist_ok=True)

# ---- config e dados (fonte única: os mesmos arquivos que o site usa) ----
cfg = (RAIZ / "js/config.js").read_text(encoding="utf-8")
NOME = re.search(r'nome:\s*"([^"]*)"', cfg).group(1)
SLOGAN = re.search(r'slogan:\s*"([^"]*)"', cfg).group(1)
txt = (RAIZ / "js/paginas.js").read_text(encoding="utf-8")
PAGINAS = json.loads(txt[txt.index("["): txt.rindex("]") + 1])
CATS = {"at": "Antigo Testamento", "nt": "Novo Testamento", "mil": "Milagres de Jesus", "her": "Heróis da Fé"}

MARROM, AZUL, VERDE, ROXO, SOL, VERM = (HexColor(c) for c in ("#3A2A1E", "#1565C0", "#2E7D32", "#6A3FA0", "#FFC933", "#C62828"))

# ---- logo (sol sorridente de linha sobre círculo amarelo-sol) ----
rays = "".join(
    f'<line x1="{32+__import__("math").cos(a)*15:.1f}" y1="{32+__import__("math").sin(a)*15:.1f}" '
    f'x2="{32+__import__("math").cos(a)*21:.1f}" y2="{32+__import__("math").sin(a)*21:.1f}"/>'
    for a in [i * 3.14159265 / 4 for i in range(8)])
LOGO = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="Logo">
  <!-- Para trocar o símbolo: substitua este arquivo. Mantenha viewBox 0 0 64 64. -->
  <circle cx="32" cy="32" r="32" fill="#FFC933"/>
  <g fill="none" stroke="#3A2A1E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="32" cy="32" r="10"/>
    {rays}
    <path d="M28 34.5 Q32 38.5 36 34.5"/>
  </g>
  <circle cx="28.3" cy="30" r="1.5" fill="#3A2A1E"/><circle cx="35.7" cy="30" r="1.5" fill="#3A2A1E"/>
</svg>
'''
(IMG / "logo.svg").write_text(LOGO, encoding="utf-8")


def desenhar_svg(c, svg_path, x, y, tam):
    d = svg2rlg(str(svg_path))
    s = tam / d.width
    d.width *= s; d.height *= s; d.scale(s, s)
    renderPDF.draw(d, c, x, y)


def tamanho_imagem(img_path):
    if img_path.suffix.lower() == ".svg":
        d = svg2rlg(str(img_path))
        return d, d.width, d.height
    ir = ImageReader(str(img_path))
    return ir, *ir.getSize()


def caminho_imagem(p):
    """Para o PDF usa a versão de impressão (vetorial, nítida em qualquer tamanho) se existir;
    senão, a mesma imagem do site."""
    return RAIZ / p.get("imagem_impressao", p.get("imagem", f"img/{p['arquivo']}.svg"))


def pagina_pdf(i, p):
    img_path = caminho_imagem(p)
    c = canvas.Canvas(str(PDFS / f"{p['arquivo']}.pdf"), pagesize=A4)
    c.setTitle(f"{p['titulo']} — {NOME}"); c.setAuthor(NOME)
    W, H = A4
    c.setFillColor(MARROM)
    c.setFont("Helvetica-Bold", 11); c.drawCentredString(W / 2, H - 38, f"{NOME}  ·  {CATS[p['categoria']]}")
    tam = 30
    while c.stringWidth(p["titulo"], "Helvetica-Bold", tam) > W - 80:
        tam -= 1
    c.setFont("Helvetica-Bold", tam); c.drawCentredString(W / 2, H - 80, p["titulo"])
    c.setFont("Helvetica-Bold", 14)
    w = c.stringWidth(p["ref"], "Helvetica-Bold", 14) + 30
    c.setLineWidth(2); c.setStrokeColor(MARROM)
    c.roundRect((W - w) / 2, H - 120, w, 26, 13, stroke=1, fill=0)
    c.drawCentredString(W / 2, H - 112, p["ref"])
    # moldura + ilustração (cabe em 515x515, respeitando a proporção da imagem)
    obj, iw, ih = tamanho_imagem(img_path)
    k = min(499 / iw, 499 / ih)
    fw, fh = iw * k + 16, ih * k + 16
    fx, fy = (W - fw) / 2, H - 150 - fh
    if img_path.suffix.lower() == ".svg":
        obj.width, obj.height = iw * k, ih * k
        obj.scale(k, k)
        renderPDF.draw(obj, c, fx + 8, fy + 8)
    else:
        c.drawImage(obj, fx + 8, fy + 8, iw * k, ih * k, mask="auto")
    c.setLineWidth(3); c.roundRect(fx, fy, fw, fh, 22, stroke=1, fill=0)
    # texto
    y = fy - 30
    c.setFont("Helvetica", 12.5)
    for ln in simpleSplit(p["texto"], "Helvetica", 12.5, 480):
        c.drawCentredString(W / 2, y, ln); y -= 17
    c.setFont("Helvetica-Bold", 12.5)
    for k, ln in enumerate(simpleSplit("Converse: " + p["conversa"], "Helvetica-Bold", 12.5, 480)):
        c.drawCentredString(W / 2, y - 4, ln); y -= 17
    c.setFont("Helvetica", 10); c.setLineWidth(1)
    c.drawString(40, 34, "Nome: ____________________________")
    c.drawRightString(W - 40, 34, SLOGAN)
    c.showPage(); c.save()


def diploma():
    W, H = landscape(A4)
    c = canvas.Canvas(str(PDFS / "diploma.pdf"), pagesize=(W, H))
    c.setTitle(f"Diploma de Pequeno Discípulo — {NOME}"); c.setAuthor(NOME)
    c.setFillColor(HexColor("#FFF9EC")); c.rect(0, 0, W, H, stroke=0, fill=1)
    c.setStrokeColor(SOL); c.setLineWidth(14); c.roundRect(22, 22, W - 44, H - 44, 28)
    c.setStrokeColor(AZUL); c.setLineWidth(3); c.roundRect(40, 40, W - 80, H - 80, 20)
    # estrelinhas nos cantos
    import math
    def estrela(cx, cy, R, cor):
        pts = [(cx + math.cos(-math.pi / 2 + k * math.pi / 5) * (R if k % 2 == 0 else R * .45),
                cy + math.sin(-math.pi / 2 + k * math.pi / 5) * (R if k % 2 == 0 else R * .45)) for k in range(10)]
        p = c.beginPath(); p.moveTo(*pts[0])
        for q in pts[1:]: p.lineTo(*q)
        p.close(); c.setFillColor(cor); c.setStrokeColor(MARROM); c.setLineWidth(2); c.drawPath(p, fill=1, stroke=1)
    for (x, y) in ((70, 70), (W - 70, 70), (70, H - 70), (W - 70, H - 70)):
        estrela(x, y, 14, SOL)
    desenhar_svg(c, IMG / "logo.svg", W / 2 - 34, H - 150, 68)
    c.setFillColor(MARROM)
    c.setFont("Helvetica-Bold", 14); c.drawCentredString(W / 2, H - 172, NOME)
    c.setFillColor(ROXO); c.setFont("Helvetica-Bold", 44); c.drawCentredString(W / 2, H - 228, "Diploma de Pequeno Discípulo")
    c.setFillColor(MARROM); c.setFont("Helvetica", 16)
    c.drawCentredString(W / 2, H - 275, "Certificamos com muita alegria que")
    c.setLineWidth(2); c.setStrokeColor(MARROM); c.line(W / 2 - 220, H - 320, W / 2 + 220, H - 320)
    c.setFont("Helvetica", 10); c.drawCentredString(W / 2, H - 335, "(nome da criança)")
    c.setFont("Helvetica", 16)
    linhas = simpleSplit(f"coloriu as {len(PAGINAS)} páginas bíblicas do {NOME} e aprendeu que Deus cuida de cada um de nós, "
                         "hoje e sempre.", "Helvetica", 16, W - 240)
    y = H - 375
    for ln in linhas:
        c.drawCentredString(W / 2, y, ln); y -= 22
    c.setFont("Helvetica", 11)
    c.line(110, 105, 290, 105); c.drawCentredString(200, 90, "Data")
    c.line(W - 290, 105, W - 110, 105); c.drawCentredString(W - 200, 90, "Catequista ou família")
    c.setFont("Helvetica-Oblique", 11); c.drawCentredString(W / 2, 62, SLOGAN)
    c.showPage(); c.save()


for i, p in enumerate(PAGINAS):
    img = caminho_imagem(p)
    if not img.exists():
        sys.exit(f"ERRO: imagem não encontrada para a página {p['n']}: {img}")
    pagina_pdf(i, p)
    print("ok", p["arquivo"], "<-", img.relative_to(RAIZ))
diploma()
print("ok diploma.pdf — produto:", NOME)
