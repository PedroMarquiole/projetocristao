#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Prepara desenhos para colorir a partir de uma grade (vários desenhos numa imagem)
ou de uma imagem só.

- Imagem GRANDE (lado maior >= 900 px): só limpa o fundo para branco puro, sem mexer no traço.
- Recorte PEQUENO (ex.: painel de uma grade): amplia 8x com IA (Real-ESRGAN anime, via ncnn,
  roda no processador), transforma "anéis" de olho em bolinhas, remove a moldura do painel e
  vetoriza (curvas lisas). Gera um SVG para impressão e um PNG leve para o site.

Requisitos:  pip install pillow numpy scipy ncnn potracer   (modelo em tools/modelos/)
Uso:
  python3 tools/separar_paineis.py grade.jpg pasta_saida/        -> painel-01.png (+ .svg) ...
  python3 tools/separar_paineis.py desenho.png pasta_saida/      -> painel-01.png (+ .svg)

Os painéis saem na ordem de leitura (linha por linha, da esquerda para a direita).
Depois copie para img/ (PNG) e img/vetor/ (SVG) e aponte "imagem" / "imagem_impressao"
em js/paginas.js. Rode tools/gerar_assets.py para refazer os PDFs.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ESCURO = 140                 # tom considerado "linha" ao detectar painéis e moldura
GRANDE = 900                 # a partir deste tamanho a imagem já tem boa resolução
LADO_SITE = 1200             # lado maior do PNG do site
MODELO = Path(__file__).resolve().parent / "modelos" / "realesrgan-x4plus-anime"


# ---------------------------------------------------------------- separar
def _faixas(mask, minimo):
    out, ini = [], None
    for i, v in enumerate(mask):
        if v and ini is None:
            ini = i
        if not v and ini is not None:
            out.append((ini, i)); ini = None
    if ini is not None:
        out.append((ini, len(mask)))
    return [f for f in out if f[1] - f[0] >= minimo]


def separar(img):
    """Divide pela faixa branca entre os painéis. Devolve recortes em tons de cinza."""
    g = img.convert("L")
    a = np.array(g) < ESCURO
    minimo = min(g.size) // 8
    paineis = []
    for y0, y1 in _faixas(a.sum(1) > 2, minimo):
        for x0, x1 in _faixas(a[y0:y1].sum(0) > 2, minimo):
            paineis.append(g.crop((x0, y0, x1, y1)))
    return paineis or [g]


# ---------------------------------------------------------------- utilidades
def _niveis(g, preto, branco):
    x = np.clip((np.array(g).astype(np.float32) - preto) / (branco - preto), 0, 1)
    return Image.fromarray((x * 255).round().astype("uint8"))


def _16_tons(g):
    return g.convert("L").point(lambda v: (v // 17) * 17)


def _rede():
    """Carrega o Real-ESRGAN (ncnn, CPU). Uma rede nova a cada imagem: o ncnn guarda memória
    para cada tamanho de imagem e não devolve, então reaproveitar a rede num lote estoura a RAM."""
    try:
        import ncnn
        n = ncnn.Net()
        n.opt.use_vulkan_compute = False
        n.opt.num_threads = 4
        n.load_param(str(MODELO) + ".param")
        n.load_model(str(MODELO) + ".bin")
        return n
    except Exception as e:  # noqa: BLE001
        sys.exit(f"IA indisponível ({e}). Instale: pip install ncnn")


def _ampliar_ia_bloco(rgb):
    """Roda a IA (4x) em um pedaço RGB float32 (H, W, 3) com valores 0..1."""
    import ncnn
    a = np.ascontiguousarray(rgb.transpose(2, 0, 1))
    # IMPORTANTE: o ncnn.Mat usa a MESMA memória do array "a"; os dois precisam continuar vivos
    # até o fim da extração, senão o canto superior esquerdo sai corrompido (mancha preta).
    entrada = ncnn.Mat(a)
    net = _rede()
    ex = net.create_extractor()
    ex.input("data", entrada)
    _, out = ex.extract("output")
    o = np.array(out, copy=True)
    del out, ex, entrada, a
    net.clear()
    del net
    if not np.isfinite(o).all():
        raise RuntimeError("a IA devolveu valores inválidos")
    return np.clip(o.transpose(1, 2, 0), 0, 1)


def _ampliar_ia(img, bloco=192, borda=12):
    """Amplia 4x com IA, em pedaços sobrepostos (imagens grandes estouram a memória numa vez só)."""
    rgb = np.array(img.convert("RGB")).astype(np.float32) / 255.0
    H, W = rgb.shape[:2]
    saida = np.zeros((H * 4, W * 4, 3), np.float32)
    for y in range(0, H, bloco):
        for x in range(0, W, bloco):
            y0, x0 = max(y - borda, 0), max(x - borda, 0)
            y1, x1 = min(y + bloco + borda, H), min(x + bloco + borda, W)
            r = _ampliar_ia_bloco(rgb[y0:y1, x0:x1])
            yy, xx = (y - y0) * 4, (x - x0) * 4                     # descarta a sobreposição
            hh, ww = (min(y + bloco, H) - y) * 4, (min(x + bloco, W) - x) * 4
            saida[y * 4:y * 4 + hh, x * 4:x * 4 + ww] = r[yy:yy + hh, xx:xx + ww]
    return Image.fromarray((saida * 255).round().astype("uint8")).convert("L")


def _preencher_olhos(preto, area_max, anel_max, aspecto_max=2.2):
    """Preenche só buracos pequenos e redondos cercados por UM traço solto e pequeno
    (anel de olho vira bolinha). Buracos cercados pelo contorno do corpo ficam brancos."""
    from scipy import ndimage as ndi
    lw, nw = ndi.label(~preto)
    lb, _ = ndi.label(preto, structure=np.ones((3, 3), bool))
    aw, ab = np.bincount(lw.ravel()), np.bincount(lb.ravel())
    borda = set(np.unique(np.concatenate([lw[0], lw[-1], lw[:, 0], lw[:, -1]])).tolist())
    objs = ndi.find_objects(lw)
    out, H, W = preto.copy(), *preto.shape
    for i in range(1, nw + 1):
        if aw[i] > area_max or i in borda:
            continue
        sl = objs[i - 1]
        y0, y1 = max(sl[0].start - 2, 0), min(sl[0].stop + 2, H)
        x0, x1 = max(sl[1].start - 2, 0), min(sl[1].stop + 2, W)
        sub = lw[y0:y1, x0:x1] == i
        viz = np.unique(lb[y0:y1, x0:x1][ndi.binary_dilation(sub) & ~sub])
        viz = viz[viz > 0]
        if len(viz) != 1 or ab[viz[0]] > anel_max:
            continue
        ys, xs = np.nonzero(sub)
        if len(ys) >= 3:
            ev = np.linalg.eigvalsh(np.cov(np.vstack([xs, ys])))
            if ev[0] > 1e-6 and np.sqrt(ev[1] / ev[0]) > aspecto_max:
                continue
        out[y0:y1, x0:x1][sub] = True
    return out


def _sem_moldura(preto, orig, esc):
    o = np.array(orig) < ESCURO
    h, w = o.shape
    d = 0
    while d < min(w, h) // 4 and not o[d, d]:
        d += 1
    if not (d < min(w, h) // 4 and o[h // 2, :6].any()):
        return preto
    raio, ins = d / 0.293, int(round(5 * esc))
    H, W = preto.shape
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).rounded_rectangle((ins, ins, W - ins, H - ins), radius=max(1, (raio - 4) * esc), fill=255)
    return (preto & (np.array(m) > 0))[ins:H - ins, ins:W - ins]


def _vetor_svg(bw, turd):
    import potrace
    curvas = potrace.Bitmap(np.array(bw) >= 128).trace(turdsize=turd, alphamax=1.0, opticurve=True, opttolerance=0.2)
    partes = []
    for c in curvas:
        s = c.start_point
        d = [f"M{s.x:.2f},{s.y:.2f}"]
        for seg in c.segments:
            if seg.is_corner:
                d.append(f"L{seg.c.x:.2f},{seg.c.y:.2f}L{seg.end_point.x:.2f},{seg.end_point.y:.2f}")
            else:
                d.append(f"C{seg.c1.x:.2f},{seg.c1.y:.2f} {seg.c2.x:.2f},{seg.c2.y:.2f} "
                         f"{seg.end_point.x:.2f},{seg.end_point.y:.2f}")
        partes.append("".join(d) + "Z")
    W, H = bw.size
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'
            f'<rect width="{W}" height="{H}" fill="#fff"/>'
            f'<path fill="#000" fill-rule="evenodd" d="{"".join(partes)}"/></svg>\n')


# ---------------------------------------------------------------- principal
def ampliar_8x(painel):
    """2x comum (suavizado) + 4x com IA = 8x, já com o fundo limpo."""
    g = painel.resize((painel.width * 2, painel.height * 2), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.0))
    return _niveis(_ampliar_ia(g), 20, 235)


def acabar(g, painel):
    """g: painel ampliado (ampliar_8x); painel: recorte original. Devolve (png_site, svg_impressao)."""
    esc = g.width / painel.width
    k = (esc / 8) ** 2
    preto = _sem_moldura(np.array(g) < 128, painel.convert("L"), esc)
    preto = _preencher_olhos(preto, area_max=int(300 * k), anel_max=int(2500 * k))
    bw = Image.fromarray(np.where(preto, 0, 255).astype("uint8"))
    svg = _vetor_svg(bw, turd=int(60 * k))
    lado = max(bw.size)
    site = bw.resize((round(bw.width * LADO_SITE / lado), round(bw.height * LADO_SITE / lado)), Image.LANCZOS)
    return _16_tons(site), svg


def preparar(painel):
    """Devolve (png_site, svg_impressao_ou_None)."""
    if max(painel.size) >= GRANDE:                        # já é boa: só limpa o fundo
        return _16_tons(_niveis(painel, 20, 235)), None
    return acabar(ampliar_8x(painel), painel)


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    origem, destino = Path(sys.argv[1]), Path(sys.argv[2])
    destino.mkdir(parents=True, exist_ok=True)
    paineis = separar(Image.open(origem))
    for i, p in enumerate(paineis, 1):
        png, svg = preparar(p)
        png.save(destino / f"painel-{i:02d}.png", optimize=True)
        if svg:
            (destino / f"painel-{i:02d}.svg").write_text(svg, encoding="utf-8")
        print("ok", f"painel-{i:02d}", p.size, "-> vetor" if svg else "-> só limpeza")
    print(f"{len(paineis)} painéis")


if __name__ == "__main__":
    main()
