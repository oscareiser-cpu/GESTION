"""Inserta (o reemplaza) los modulos propios de src/ en Complexil.

- cx-addon-docformato.js: formato de pedidos/albaranes/facturas.
- cx-addon-antivirus.js: antivirus de los archivos que entran en el programa.

Uso: python src/inyectar_addons.py [ruta_html]   (por defecto Complexil_4_22.html)
"""
import base64, pathlib, re, sys

aqui = pathlib.Path(__file__).parent
html_path = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else aqui.parent / "Complexil_4_22.html")
uri = lambda f: "data:image/jpeg;base64," + base64.b64encode((aqui / f).read_bytes()).decode()
html = html_path.read_text(encoding="utf-8")
# Desde la 4.20 los modulos esperan a que se descifren los datos (type="text/cx-diferido")
tipo = ' type="text/cx-diferido"' if "text/cx-diferido" in html else ""

for nombre in ("docformato", "antivirus"):
    js = (aqui / f"cx-addon-{nombre}.js").read_text(encoding="utf-8")
    js = js.replace("__LOGO__", uri("logo_complexil.jpg")).replace("__MARCA__", uri("marca_agua.jpg"))
    bloque = f'<script id="cx-addon-{nombre}"{tipo}>\n' + js + "</script>\n"
    patron = re.compile(rf'<script id="cx-addon-{nombre}"[^>]*>.*?</script>\n', re.S)
    if patron.search(html):
        html = patron.sub(lambda m: bloque, html)
    else:
        i = html.rindex("</body>")
        html = html[:i] + bloque + html[i:]

html_path.write_text(html, encoding="utf-8")
print("OK", html_path)
