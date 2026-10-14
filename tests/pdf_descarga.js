// Prueba de descarga en PDF: genera un pedido y el panel activo y comprueba que se descargan PDFs válidos.
// Uso: node tests/pdf_descarga.js
const path = require('path');
const fs = require('fs');
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ acceptDownloads: true })).newPage();
  page.on('dialog', d => d.dismiss());
  await page.goto('file://' + path.resolve(__dirname, '..', 'Complexil_4_6.html'));
  await page.waitForTimeout(2000);
  const bajar = async (accion) => {
    const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.evaluate(accion)]);
    const datos = fs.readFileSync(await d.path());
    if (datos.slice(0, 5).toString() !== '%PDF-') throw new Error(d.suggestedFilename() + ' no es un PDF');
    console.log('OK:', d.suggestedFilename(), datos.length, 'bytes');
  };
  await bajar(() => cxDocImprimir(cxDocVenta({ num: 'P-1', fecha: '2026-01-01', cliente: 'Prueba', tipodoc: 'PED',
    lineas: [{ qty: 1, ptRef: 'A', ptNom: 'Artículo', prc: 10, iva: 21 }] }), true));
  await page.evaluate(() => impDialogo());
  await bajar(() => document.getElementById('imp-d-pdf').click());
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
