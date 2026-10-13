"""Pruebas del puente VIES de abrir_complexil.py (sin red: VIES simulado).

Uso: python3 tests/test_vies.py
"""
import io
import json
import pathlib
import sys
import urllib.error
import urllib.request

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
import abrir_complexil as a  # noqa: E402

RESP = {"DE123456789": {"isValid": True, "userError": "VALID", "name": "MUSTER GMBH", "address": "BERLIN",
                        "requestDate": "2026-10-13", "requestIdentifier": "WAPI1"},
        "FR99999999999": {"isValid": False, "userError": "MS_UNAVAILABLE", "name": "---", "address": "---"},
        "ESB65767014": {"isValid": False, "userError": "INVALID", "name": "---", "address": "---"}}
pedidas = []


def falso(url, timeout=0):
    pedidas.append(url)
    clave = url.split("/ms/")[1].replace("/vat/", "")
    if clave == "IT00000000000":
        raise urllib.error.URLError("sin red")
    return io.BytesIO(json.dumps(RESP.get(clave, {"isValid": False, "userError": "INVALID"})).encode())


urllib.request.urlopen = falso
r = a.consultar_vies("DE", "DE 123.456.789")
assert r["estado"] == "valido" and r["nombre"] == "MUSTER GMBH" and r["consulta"] == "WAPI1", r
r = a.consultar_vies("es", "B-65767014")
assert r["estado"] == "invalido" and r["nombre"] == "", r
assert a.consultar_vies("FR", "99999999999")["estado"] == "sin-servicio"   # caido no es invalido
assert a.consultar_vies("IT", "00000000000")["estado"] == "sin-servicio"
assert a.consultar_vies("US", "123456")["estado"] == "formato"
assert a.consultar_vies("DE", "1")["estado"] == "formato"
n = len(pedidas)
a.consultar_vies("DE", "12/../../x?y=1")
assert all("/.." not in u and "?" not in u for u in pedidas[n:]), pedidas[n:]
print("OK: puente VIES")
