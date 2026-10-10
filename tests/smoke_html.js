// Prueba de humo: abre Complexil en Chromium, hace la primera puesta en marcha,
// recorre todas las pantallas del menu e imprime un pedido. Falla si hay errores
// de JavaScript o avisos inesperados.
// Uso: node tests/smoke_html.js
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }

const ARCHIVO = path.resolve(__dirname, '..', 'Complexil_4_22.html');
const CLAVE = 'Tres-Tortugas-Bigues-26';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errores = [];
  let donde = 'carga';
  page.on('pageerror', e => errores.push(`[${donde}] ${e.message}`));
  page.on('dialog', d => {
    // El unico aviso esperado es el de la contrasena de admin recien creada
    if (!/Contraseña de admin guardada/.test(d.message())) errores.push(`[${donde}] aviso inesperado: ${d.message().slice(0, 120)}`);
    d.dismiss().catch(() => {});
  });

  await page.goto('file://' + ARCHIVO);
  await page.waitForTimeout(1500);
  await page.fill('#acc-p1', CLAVE);
  await page.fill('#acc-p2', CLAVE);
  await page.click('text=Guardar y entrar');
  await page.waitForTimeout(2500);
  await page.click('button:has-text("Confirmar")', { timeout: 3000 }).catch(() => {});
  // deja correr los arranques diferidos (incorporaciones y reparacion de datos)
  await page.waitForTimeout(9000);

  const menu = page.locator('.ni');
  const n = await menu.count();
  for (let i = 0; i < n; i++) {
    // cierra cualquier dialogo que haya abierto el programa (p. ej. contrasena de copias)
    await page.evaluate(() => [...document.querySelectorAll('button')]
      .filter(b => b.offsetParent && /^(Cancelar|Más tarde)$/.test(b.textContent.trim())).forEach(b => b.click()));
    donde = (await menu.nth(i).innerText()).trim();
    await menu.nth(i).click({ timeout: 3000 }).catch(e => errores.push(`[${donde}] no se puede abrir: ${e.message.split('\n')[0]}`));
    await page.waitForTimeout(150);
  }

  donde = 'impresion de pedido';
  const pedido = await page.evaluate(() => {
    ventas.push({ num: 'PED-PRUEBA', tipodoc: 'PED', cliente: 'Cliente de prueba', fecha: '2026-10-10',
      lineas: [{ qty: 2, ptRef: 'CX-1', ptNom: 'Champu', prc: 10, iva: 21 }] });
    P('impresion', document.querySelector('.ni[onclick*="impresion"]'));
    const tab = document.querySelector('#imp-tabs [data-cxd="ped"]');
    if (!tab) return 'falta la pestana Pedido';
    impTab('ped', tab);
    const sel = document.getElementById('imp-doc');
    sel.value = sel.options[1] && sel.options[1].value;
    prvImp();
    const doc = document.querySelector('#imp-preview .cxd');
    return doc && /TOTAL PEDIDO/.test(doc.innerText) ? 'ok' : 'el pedido no sale con el formato de la hoja de pedido';
  });
  if (pedido !== 'ok') errores.push(`[${donde}] ${pedido}`);

  await browser.close();
  if (errores.length) { console.error('Errores:\n' + errores.join('\n')); process.exit(1); }
  console.log(`OK: Complexil abre ${n} pantallas sin errores e imprime pedidos con su formato`);
})();
