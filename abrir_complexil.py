"""Abre Complexil en el navegador sirviéndolo desde un servidor local.

Uso: doble clic en este archivo (o `python abrir_complexil.py`).
El HTML debe estar en la misma carpeta que este script.
Cierra esta ventana para detener el programa.

Mientras esta ventana está abierta, Complexil puede comprobar NIF-IVA
intracomunitarios en VIES (Comisión Europea) a través de /api/vies: el
navegador no puede llamar a VIES directamente.
"""
import http.server
import json
import os
import re
import socketserver
import sys
import threading
import urllib.error
import urllib.request
import webbrowser
from urllib.parse import parse_qs, urlparse

ARCHIVO = "Complexil_4_22.html"
PUERTO = 8765  # fijo: los datos (localStorage) se guardan por puerto
VIES = "https://ec.europa.eu/taxation_customs/vies/rest-api/ms/{pais}/vat/{nif}"
PAISES_UE = {"AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "EL", "ES", "FI", "FR", "HR", "HU", "IE",
             "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK", "XI"}


def consultar_vies(pais, nif):
    """Pregunta a VIES por un NIF-IVA. Un fallo del servicio NO significa que el NIF sea inválido."""
    pais = pais.upper()
    nif = re.sub(r"[^A-Z0-9]", "", nif.upper())
    if nif.startswith(pais):
        nif = nif[len(pais):]
    if pais not in PAISES_UE or not re.fullmatch(r"[A-Z0-9]{2,14}", nif):
        return {"estado": "formato", "error": "País o número con formato no válido."}
    try:
        with urllib.request.urlopen(VIES.format(pais=pais, nif=nif), timeout=20) as r:
            d = json.load(r)
    except (urllib.error.URLError, TimeoutError, ValueError) as e:
        return {"estado": "sin-servicio", "error": f"VIES no responde: {e}"}
    valido = d.get("isValid", d.get("valid"))
    error = d.get("userError", "")
    if valido is None or (not valido and error not in ("", "VALID", "INVALID")):
        # MS_UNAVAILABLE, TIMEOUT, MS_MAX_CONCURRENT_REQ…: el país no ha contestado
        return {"estado": "sin-servicio", "error": f"VIES: {error or 'respuesta sin resultado'}"}
    limpia = lambda s: "" if s in (None, "---") else str(s).strip()
    return {"estado": "valido" if valido else "invalido", "pais": pais, "nif": nif,
            "nombre": limpia(d.get("name")), "direccion": limpia(d.get("address")),
            "fecha": d.get("requestDate", ""), "consulta": d.get("requestIdentifier", "")}


class Manejador(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        u = urlparse(self.path)
        if u.path != "/api/vies":
            return super().do_GET()
        q = parse_qs(u.query)
        res = consultar_vies(q.get("pais", [""])[0], q.get("nif", [""])[0])
        cuerpo = json.dumps(res, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        # Complexil abierto con doble clic (file://) llega con Origin "null"
        if self.headers.get("Origin") == "null":
            self.send_header("Access-Control-Allow-Origin", "null")
        self.end_headers()
        self.wfile.write(cuerpo)


if __name__ == "__main__":
    carpeta = os.path.dirname(os.path.abspath(__file__))
    if not os.path.exists(os.path.join(carpeta, ARCHIVO)):
        input(f"No encuentro {ARCHIVO} junto a este script. Pulsa Intro para salir.")
        sys.exit(1)
    os.chdir(carpeta)

    url = f"http://localhost:{PUERTO}/{ARCHIVO}"
    try:
        servidor = socketserver.ThreadingTCPServer(("127.0.0.1", PUERTO), Manejador)
    except OSError:
        # Ya hay uno abierto: solo abrimos el navegador
        webbrowser.open(url)
        sys.exit(0)

    threading.Timer(0.5, webbrowser.open, [url]).start()
    print(f"Complexil abierto en {url}\nComprobacion VIES activa.\nCierra esta ventana para detenerlo.")
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        pass
