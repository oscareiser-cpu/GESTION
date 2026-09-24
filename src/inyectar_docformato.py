"""Inserta (o reemplaza) el módulo de formato de pedidos/albaranes/facturas en Complexil.

Uso: python src/inyectar_docformato.py [ruta_html]   (por defecto Complexil_3_29.html)
"""
import base64, pathlib, re, sys

aqui = pathlib.Path(__file__).parent
html_path = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else aqui.parent / "Complexil_3_29.html")
uri = lambda f: "data:image/jpeg;base64," + base64.b64encode((aqui / f).read_bytes()).decode()
js = (aqui / "cx-addon-docformato.js").read_text(encoding="utf-8")
js = js.replace("__LOGO__", uri("logo_complexil.jpg")).replace("__MARCA__", uri("marca_agua.jpg"))
bloque = '<script id="cx-addon-docformato">\n' + js + "</script>\n"

html = html_path.read_text(encoding="utf-8")
patron = re.compile(r'<script id="cx-addon-docformato">.*?</script>\n', re.S)
if patron.search(html):
    html = patron.sub(lambda m: bloque, html)
else:
    i = html.rindex("</body>")
    html = html[:i] + bloque + html[i:]
html_path.write_text(html, encoding="utf-8")
print("OK", html_path)
