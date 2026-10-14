// Prueba de numeración por año: el 1 de enero el contador de pedidos, albaranes y facturas vuelve a 0001.
// Uso: node tests/numeracion_anual.js
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.dismiss());
  await page.goto('file://' + path.resolve(__dirname, '..', 'Complexil_4_6.html'));
  await page.waitForTimeout(2000);
  const r = await page.evaluate(() => {
    ventas.push({ num: 'FAC-0007', tipodoc: 'FAC', fecha: '2026-12-30' }, { num: 'ALB-2026-0003', tipodoc: 'ALB', fecha: '2026-11-02' });
    compras.push({ num: 'OC-0012', fecha: '2026-12-01' });
    const venta = (ti, f) => { G('vtd').value = ti; G('vf').value = f; G('vn').value = ''; cVNum(); return G('vn').value; };
    const compra = f => { G('cp-fecha').value = f; return cpSiguienteNum(); };
    return [venta('FAC', '2026-12-31'), venta('FAC', '2027-01-01'), venta('ALB', '2026-12-31'), venta('ALB', '2027-01-01'),
            venta('PED', '2027-01-01'), compra('2026-12-31'), compra('2027-01-01')];
  });
  await browser.close();
  const esperado = ['FAC-2026-0008', 'FAC-2027-0001', 'ALB-2026-0004', 'ALB-2027-0001', 'PED-2027-0001', 'OC-2026-0013', 'OC-2027-0001'];
  if (errores.length || JSON.stringify(r) !== JSON.stringify(esperado)) { console.error('Fallo:', r, errores); process.exit(1); }
  console.log('OK:', r.join(' '));
})();
