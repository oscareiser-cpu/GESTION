// Prueba de humo: abre Complexil en Chromium y falla si hay errores de JavaScript.
// Uso: node tests/smoke_html.js
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, '..', 'Complexil_3_29.html'));
  await page.waitForTimeout(2000);
  await browser.close();
  if (errores.length) { console.error('Errores JS:', errores); process.exit(1); }
  console.log('OK: Complexil abre sin errores de JavaScript');
})();
