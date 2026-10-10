// Prueba de humo: abre Complexil en Chromium, hace la primera puesta en marcha,
// recorre todas las pantallas del menu, imprime un pedido y comprueba el antivirus. Falla si hay errores
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
    if (!/Contraseña de admin guardada|ANTIVIRUS DE COMPLEXIL/.test(d.message())) errores.push(`[${donde}] aviso inesperado: ${d.message().slice(0, 120)}`);
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
  // cierra cualquier dialogo que haya abierto el programa (p. ej. contrasena de copias, que sale sola)
  const cerrarDialogos = () => page.evaluate(() => [...document.querySelectorAll('button')]
    .filter(b => b.offsetParent && /^(Cancelar|Más tarde)$/.test(b.textContent.trim())).forEach(b => b.click()));
  for (let i = 0; i < n; i++) {
    await cerrarDialogos();
    donde = (await menu.nth(i).innerText()).trim();
    await menu.nth(i).click({ timeout: 3000 })
      .catch(async () => { await cerrarDialogos(); await menu.nth(i).click({ timeout: 3000 }); })
      .catch(e => errores.push(`[${donde}] no se puede abrir: ${e.message.split('\n')[0]}`));
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

  donde = 'antivirus';
  const av = await page.evaluate(async () => {
    const eicar = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
    const casos = [
      [new File([eicar], 'eicar.txt'), 'peligro'],
      [new File([new Uint8Array([0x4d, 0x5a, 0x90, 0])], 'presupuesto.pdf'), 'peligro'],
      [new File(['<svg onload="alert(1)"></svg>'], 'logo.svg'), 'peligro'],
      [new File(['a;b\n1;=cmd|\' /C calc\'!A0\n'], 'tarifa.csv'), 'peligro'],
      [new File(['codigo;precio\nCX1;-5,20\n'], 'tarifa.csv'), 'limpio'],
    ];
    const mal = [];
    for (const [f, esperado] of casos) { const r = await cxAntivirus.analizar(f); if (r.nivel !== esperado) mal.push(`${f.name}: ${r.nivel} (esperado ${esperado})`); }
    // el importador no debe recibir un archivo bloqueado
    window.__recibidos = []; window.mgArchivo = f => window.__recibidos.push(f && f.name);
    return mal;
  });
  av.forEach(m => errores.push(`[${donde}] ${m}`));
  await page.evaluate(() => P('migracion', document.querySelector('.ni[onclick*="migracion"]')));
  for (const [nombre, contenido] of [['eicar.txt', 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'], ['limpio.csv', 'a;b\n1;2\n']]) {
    await page.setInputFiles('#mg-file', { name: nombre, mimeType: 'text/plain', buffer: Buffer.from(contenido) });
    await page.waitForTimeout(600);
  }
  const recibidos = await page.evaluate(() => window.__recibidos);
  if (JSON.stringify(recibidos) !== '["limpio.csv"]') errores.push(`[${donde}] el importador recibio ${JSON.stringify(recibidos)}`);

  await browser.close();
  if (errores.length) { console.error('Errores:\n' + errores.join('\n')); process.exit(1); }
  console.log(`OK: Complexil abre ${n} pantallas sin errores, imprime pedidos con su formato y el antivirus bloquea lo peligroso`);
})();
