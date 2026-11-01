#!/usr/bin/env python3
"""Coloca ?v=<hash> nos links de CSS/JS das páginas, para o navegador baixar a versão nova
sempre que um arquivo mudar (evita o celular mostrar a versão antiga guardada em cache).
Rode antes de cada envio:  python3 versionar.py"""
import hashlib, re, pathlib
raiz = pathlib.Path(__file__).parent
for html in list(raiz.glob("*.html")) + list((raiz / "area-de-membros").glob("*.html")):
    s = html.read_text(encoding="utf-8"); novo = s
    def troca(m):
        attr, caminho = m.group(1), m.group(2)
        if caminho.startswith(("http", "//", "data:")): return m.group(0)
        arq = (html.parent / caminho.lstrip("/")) if not caminho.startswith("/") else raiz / caminho.lstrip("/")
        if not arq.exists(): return m.group(0)
        h = hashlib.md5(arq.read_bytes()).hexdigest()[:8]
        return f'{attr}="{caminho}?v={h}"'
    novo = re.sub(r'(href|src)="([^"?#]+\.(?:css|js))(?:\?v=[0-9a-f]+)?"', troca, novo)
    if novo != s: html.write_text(novo, encoding="utf-8"); print("versionado:", html.relative_to(raiz))
