"""Abre Complexil en el navegador sirviéndolo desde un servidor local.

Uso: doble clic en este archivo (o `python abrir_complexil.py`).
El HTML debe estar en la misma carpeta que este script.
Cierra esta ventana para detener el programa.
"""
import http.server
import os
import socketserver
import sys
import threading
import webbrowser

ARCHIVO = "Complexil_3_29.html"
PUERTO = 8765  # fijo: los datos (localStorage) se guardan por puerto

carpeta = os.path.dirname(os.path.abspath(__file__))
if not os.path.exists(os.path.join(carpeta, ARCHIVO)):
    input(f"No encuentro {ARCHIVO} junto a este script. Pulsa Intro para salir.")
    sys.exit(1)
os.chdir(carpeta)

url = f"http://localhost:{PUERTO}/{ARCHIVO}"
try:
    servidor = socketserver.TCPServer(("127.0.0.1", PUERTO), http.server.SimpleHTTPRequestHandler)
except OSError:
    # Ya hay uno abierto: solo abrimos el navegador
    webbrowser.open(url)
    sys.exit(0)

threading.Timer(0.5, webbrowser.open, [url]).start()
print(f"Complexil abierto en {url}\nCierra esta ventana para detenerlo.")
try:
    servidor.serve_forever()
except KeyboardInterrupt:
    pass
