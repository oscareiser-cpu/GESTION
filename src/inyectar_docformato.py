"""Inserta (o reemplaza) en Complexil el módulo de formato de pedidos/albaranes/facturas
y el de descarga en PDF (con html2canvas y jsPDF incluidos, para que funcione sin Internet).

Uso: python src/inyectar_docformato.py [ruta_html]   (por defecto Complexil_4_6.html)
"""
import base64, pathlib, re, sys

aqui = pathlib.Path(__file__).parent
html_path = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else aqui.parent / "Complexil_4_6.html")
uri = lambda f: "data:image/jpeg;base64," + base64.b64encode((aqui / f).read_bytes()).decode()
js = (aqui / "cx-addon-docformato.js").read_text(encoding="utf-8")
js = js.replace("__LOGO__", uri("logo_complexil.jpg")).replace("__MARCA__", uri("marca_agua.jpg"))
vendor = "".join((aqui / "vendor" / f).read_text(encoding="utf-8").split("//# sourceMappingURL")[0] + "\n"
                 for f in ("html2canvas.min.js", "jspdf.umd.min.js"))
pdf = vendor + (aqui / "cx-addon-pdf.js").read_text(encoding="utf-8")

html = html_path.read_text(encoding="utf-8")
# el de PDF va antes: el de formato usa cxPdfDeHtml
for nombre, codigo in (("cx-addon-pdf", pdf), ("cx-addon-docformato", js)):
    bloque = f'<script id="{nombre}">\n' + codigo + "</script>\n"
    patron = re.compile(rf'<script id="{nombre}">.*?</script>\n', re.S)
    if patron.search(html):
        html = patron.sub(lambda m: bloque, html)
    else:
        i = html.rindex("</body>")
        html = html[:i] + bloque + html[i:]
html_path.write_text(html, encoding="utf-8")
print("OK", html_path)
