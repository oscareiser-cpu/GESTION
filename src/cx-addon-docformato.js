/* ═══════════════════════════════════════════════════════════════════════
   COMPLEXIL — FORMATO ÚNICO DE PEDIDOS, ALBARANES Y FACTURAS
   Todos los documentos comerciales se imprimen con el diseño de la hoja de
   pedido de ClassicGes (HOJA_DE_PEDIDOS.pdf): logotipo y datos de la empresa
   a la izquierda, cliente/proveedor a la derecha, banda gris Número / Fecha /
   Fecha Entrega / Fecha Tope / Referencia, cuadro de líneas Cantidad / Código
   / Artículo / Precio / Dto. / IVA / Subtotal con marca de agua, bloque
   Descuento / Descuento P.Pago / Base Imponible / Importe IVA / Importe R.E.
   y recuadro TOTAL, forma de pago y transporte, pie legal.
   - Clientes: pedido, albarán, factura, proforma (Ventas → Imprimir y centro
     de Impresión, pestañas Pedido / Albarán / Factura / Proforma).
   - Proveedores: pedido (órdenes de Compras), albarán (Entradas de MP,
     agrupadas por proveedor y nº de albarán), factura (Facturas de gasto).
     Botón de impresora en cada fila / ficha y pestañas en el centro de
     Impresión.
   Datos de empresa: Configuración → Empresa propietaria (logo, CIF, tel.…);
   si están vacíos se usan los de la hoja de pedido.
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LOGO='__LOGO__', MARCA='__MARCA__';
/* datos de la hoja de pedido: se usan cuando Empresa propietaria no los tiene */
const DEF={nombre:'RC COSMOXIL HAIR TECHNOLOGY, S.L.U',dir:'POL. IND. CAN BARRI CALLE A NAVE 31',pob:'08415 BIGUES I RIELLS',tel:'938717289',email:'complexil@complexil.es',cif:'B-65767014',web:'www.complexil.es',
  regmer:'Registro Mercantil Tomo 43096 Folio 1 Sección 8, HB 421638, I/A 1 - Reg.Productor ENV/2023/000026828',
  residuos:'EL POSEEDOR FINAL DE ESTOS RESIDUOS SERÁ EL RESPONSABLE DE SU CORRECTA GESTIÓN, PONIÉNDOLOS EN MANOS DE UN RECUPERADOR AUTORIZADO.'};
const GENERICOS=['bigues i riells, barcelona','rc cosmoxil hair technology, s.l.u.'];
function empresa(){const e=(window.impEmpresa&&impEmpresa())||{};const v=k=>{const x=String(e[k]||'').trim();return x&&!GENERICOS.includes(x.toLowerCase())?x:'';};
  const dir=v('dir');
  return {nombre:v('nombre')||DEF.nombre,dir:dir||DEF.dir,pob:dir?'':DEF.pob,tel:v('tel')||DEF.tel,email:v('email')||DEF.email,cif:v('cif')||DEF.cif,web:v('web')||DEF.web,logo:e.logo||LOGO,regmer:e.regmer||DEF.regmer,residuos:e.residuos||DEF.residuos};}

/* números con formato español: 2.164,50 (Intl no agrupa los miles de 4 cifras en es-ES) */
function nf(n,dec){n=Number(n)||0;const s=Math.abs(n).toFixed(dec).split('.');return (n<0?'-':'')+s[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.')+(s[1]?','+s[1]:'');}
const nfv=(n,dec)=>n===''||n===null||n===undefined||(Number(n)===0&&dec!==3)?'':nf(n,dec);
function fd(s){s=String(s||'');const m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[3]}/${m[2]}/${m[1]}`:s;}
const r2=x=>Math.round((Number(x)||0)*100)/100;

/* cálculo de totales como ClassicGes: bruto → dto. comercial → dto. pronto pago → base; IVA y R.E. por tipo */
const RE={21:5.2,10:1.4,4:0.5,5:0.62,0:0};
function totales(d){const L=d.lineas||[];
  const bruto=L.reduce((s,l)=>s+(Number(l.sub)||0),0);
  const dto=r2(bruto*(Number(d.dto)||0)/100), n1=bruto-dto, dpp=r2(n1*(Number(d.dtopp)||0)/100), base=r2(n1-dpp);
  const f=bruto?base/bruto:0, tipos={};
  L.forEach(l=>{const t=Number(l.iva)||0;tipos[t]=(tipos[t]||0)+(Number(l.sub)||0)*f;});
  const filas=Object.keys(tipos).map(Number).sort((a,b)=>b-a).map(t=>{const b=r2(tipos[t]);return {tipo:t,base:b,iva:r2(b*t/100),re:d.re?r2(b*(RE[t]||0)/100):0};});
  const iva=filas.reduce((s,x)=>s+x.iva,0), re=filas.reduce((s,x)=>s+x.re,0), ret=r2(Number(d.ret)||0);
  return {cant:L.reduce((s,l)=>s+(Number(l.cant)||0),0),bruto,dto,dpp,base,filas,iva:r2(iva),re:r2(re),ret,total:d.totalFijo!==undefined?d.totalFijo:r2(base+iva+re-ret)};}

const CSS=`.cxd{position:relative;font-family:Arial,Helvetica,sans-serif;font-size:10.5px;color:#111;line-height:1.3;background:#fff;padding:0 0 0 22px;max-width:190mm;margin:0 auto}
.cxd *{box-sizing:border-box}
.cxd .x-regmer{position:absolute;left:0;top:60mm;width:9px;writing-mode:vertical-rl;transform:rotate(180deg);font-size:7.5px;white-space:nowrap;color:#111}
.cxd .x-top{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}
.cxd .x-emp{width:52%;font-size:10px;font-weight:600}
.cxd .x-emp img{height:66px;max-width:100%;display:block;margin-bottom:10px}
.cxd .x-ter{width:44%;padding-top:4px;font-size:10.5px;font-weight:600}
.cxd .x-tit{font-size:15px;font-weight:600;margin:0 0 20px}
.cxd .x-rol{font-size:8.5px;font-weight:400;color:#555;text-transform:uppercase;margin-bottom:2px}
.cxd .x-ter div{margin-bottom:9px}.cxd .x-ter div.x-rol{margin-bottom:2px}
.cxd table{border-collapse:collapse;width:100%;margin:0}
.cxd th,.cxd td{background:none;border:none;padding:1px 6px;font-size:10.5px;text-transform:none;color:#111;vertical-align:top;font-weight:400;text-align:left}
.cxd .x-cab{background:#cdd3df;margin-top:18px}
.cxd .x-cab td{padding:6px 12px 3px;border-right:1px solid #fff}.cxd .x-cab tr+tr td{padding:0 12px 5px}
.cxd .x-rule{border-top:1px solid #1e2a78;margin:16px 0 22px}
.cxd .x-lin{position:relative;border:1px solid #1e2a78}
.cxd .x-lin table{position:relative;z-index:1}
.cxd .x-lin thead th{border-bottom:1px solid #1e2a78;padding:4px 6px 2px}
.cxd .x-lin td,.cxd .x-lin th{border-left:1px solid #1e2a78}.cxd .x-lin td:first-child,.cxd .x-lin th:first-child{border-left:none}
.cxd .x-lin tbody td{padding:1px 6px}
.cxd .x-lin tr.x-fill td{height:var(--fill,110mm)}
.cxd .x-lin tfoot td{border-left:none;border-top:1px solid #1e2a78;padding:6px}
.cxd .x-marca{position:absolute;left:50%;top:45%;width:78%;transform:translate(-50%,-50%);opacity:.9;z-index:0}
.cxd .n{text-align:right!important;white-space:nowrap}
.cxd .x-pie{display:flex;gap:28px;margin-top:14px;align-items:stretch}
.cxd .x-tot{border:1px solid #1e2a78;flex:1}
.cxd .x-tot td{border-left:1px solid #1e2a78;padding:6px 8px 2px}.cxd .x-tot td:first-child{border-left:none}
.cxd .x-tot tr+tr td{padding:2px 8px 6px}
.cxd .x-tot td.x-pct{border-left:1px solid #1e2a78}
.cxd .x-total{background:#cdd3df;width:25%;text-align:center;padding:12px 6px;font-size:12px}
.cxd .x-total b{display:block;font-size:12px;font-weight:600;margin-top:8px}
.cxd .x-fp{margin-top:12px;border-bottom:1px solid #1e2a78}
.cxd .x-fp td{padding:2px 12px;width:auto}
.cxd .x-fp tr+tr td{font-weight:600;padding-bottom:6px}
.cxd .x-extra{margin-top:8px;font-size:9.5px}
.cxd .x-vf{margin-top:6px;font-size:8.5px;color:#166534}
.cxd .x-legal{margin-top:22px;font-size:8px;display:flex;justify-content:space-between}
.cxd .x-res{font-family:'Courier New',monospace;font-size:7.5px;margin-top:2px}
@media print{.cxd{max-width:none}}`;

/* d = {titulo, rol, num, fecha, fent, ftope, ref, ter:{nombre, lineas[], cif}, lineas:[{cant, cod, art, precio, dto, iva, sub}],
        dto, dtopp, re, ret, totalFijo, fpago, transporte, transpTel, obs, lotes, vf, sinPrecios, totalLabel} */
function fragmento(d){const E=empresa(),T=totales(d),sp=d.sinPrecios,L=d.lineas||[];
  const fill=Math.max(15,110-L.length*4.2);
  const ivaCol=T.filas.map(f=>nf(f.iva,2)).join('<br>'),baseCol=T.filas.length>1?T.filas.map(f=>`<span style="font-size:8.5px;color:#555">${nf(f.tipo,0)}%</span> ${nf(f.base,2)}`).join('<br>'):nf(T.base,2);
  const reLbl=T.ret?'Retención IRPF':'Importe R.E.', reVal=T.ret?'-'+nf(T.ret,2):nf(T.re,2);
  return `<style>${CSS}</style><div class="cxd">
<div class="x-regmer">${esc(E.regmer)}</div>
<div class="x-top"><div class="x-emp"><img src="${E.logo}" alt="">
 <div>${esc(E.web)}</div><div>${esc(E.nombre)}</div><div>${esc(E.dir)}</div>${E.pob?`<div>${esc(E.pob)}</div>`:''}<div>Tel. ${esc(E.tel)}</div><br>
 <div>e-Mail ${esc(E.email)}</div><div>C.I.F. ${esc(E.cif)}</div></div>
 <div class="x-ter"><div class="x-tit">${esc(d.titulo)}</div>${d.rol?`<div class="x-rol">${esc(d.rol)}</div>`:''}
 <div>${esc(d.ter.nombre||'—')}</div>${(d.ter.lineas||[]).filter(x=>x).map(x=>`<div>${esc(x)}</div>`).join('')}${d.ter.cif?`<div>C.I.F. ${esc(d.ter.cif)}</div>`:''}</div></div>
<table class="x-cab"><tr><td>Número</td><td>Fecha</td><td>Fecha Entrega</td><td>Fecha Tope</td><td style="width:40%">Referencia</td></tr>
 <tr><td class="n">${esc(d.num)}</td><td>${esc(fd(d.fecha))}</td><td>${esc(fd(d.fent))}</td><td>${d.ftope?esc(fd(d.ftope)):'&nbsp;/ /'}</td><td>${esc(d.ref||'')}</td></tr></table>
<div class="x-rule"></div>
<div class="x-lin"><img class="x-marca" src="${MARCA}" alt="">
<table style="--fill:${fill}mm"><thead><tr><th style="width:12%">Cantidad</th><th style="width:17%">Código</th><th>Artículo</th><th class="n" style="width:10%">Precio</th><th class="n" style="width:7%">Dto.</th><th class="n" style="width:7%">IVA</th><th class="n" style="width:13%">Subtotal</th></tr></thead>
<tbody>${L.map(l=>`<tr><td class="n">${nf(l.cant,3)}</td><td>${esc(l.cod||'')}</td><td>${esc(l.art||'')}${l.det?`<div style="font-size:8.5px;color:#444">${esc(l.det)}</div>`:''}</td><td class="n">${sp?'':nf(l.precio,3)}</td><td class="n">${nfv(l.dto,2)}</td><td class="n">${sp?'':nf(l.iva,2)}</td><td class="n">${sp?'':nf(l.sub,2)}</td></tr>`).join('')}
<tr class="x-fill"><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr></tbody>
<tfoot><tr><td class="n">${nf(T.cant,3)}</td><td colspan="4"></td><td colspan="2" class="n" style="padding-right:6px"><span style="margin-right:28px">Subtotal</span>${sp?'':nf(T.base,2)}</td></tr></tfoot></table></div>
${sp?'':`<div class="x-pie"><table class="x-tot"><tr><td colspan="2">Descuento</td><td colspan="2">Descuento P.Pago</td><td>Base Imponible</td><td>Importe IVA</td><td>${reLbl}</td></tr>
 <tr><td class="n" style="border-left:none">${nfv(T.dto,2)}</td><td class="n x-pct" style="border-left:none">${nfv(d.dto,2)}${Number(d.dto)?' %':''}</td><td class="n">${nfv(T.dpp,2)}</td><td class="n" style="border-left:none">${nfv(d.dtopp,2)}${Number(d.dtopp)?'%':''}</td><td class="n">${baseCol}</td><td class="n">${ivaCol||'0,00'}</td><td class="n">${reVal}</td></tr></table>
 <div class="x-total">${esc(d.totalLabel||'TOTAL '+d.titulo.split(' ')[0])}<b>${nf(T.total,2)}</b></div></div>`}
<table class="x-fp"><tr><td style="width:36%">Forma de Pago</td><td>Transporte</td></tr><tr><td>${esc(d.fpago||'')}</td><td>${esc(d.transporte||'')}${d.transpTel?'<br>'+esc(d.transpTel):''}</td></tr></table>
${d.lotes&&d.lotes.length?`<div class="x-extra"><b>Trazabilidad GMP (ISO 22716):</b> lotes ${d.lotes.map(esc).join(', ')}</div>`:''}
${d.obs?`<div class="x-extra"><b>Observaciones:</b> ${esc(d.obs)}</div>`:''}
${d.vf?`<div class="x-vf"><b>VERI*FACTU</b> · Huella: ${esc(d.vf.huella||'—')} · ${esc(d.vf.qr)}</div>`:''}
<div class="x-legal"><span>Documento generado con Complexil.</span><span>Página 1 / 1</span></div>
<div class="x-res">${esc(E.residuos)}</div></div>`;}

function pagina(d){return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(d.titulo+' '+d.num)}</title><style>@page{size:A4 portrait;margin:10mm 12mm}body{margin:0;background:#fff}</style></head><body>${fragmento(d)}</body></html>`;}
function imprimir(d){if(!d)return;const html=pagina(d);
  if(window.impEnviar){impEnviar(html,{titulo:d.titulo+' '+d.num});return;}
  const w=window.open('','_blank','width=900,height=1000');if(!w){alert('Permite ventanas emergentes para imprimir.');return;}
  w.document.write(html.replace('</body>','<script>window.onload=()=>setTimeout(()=>print(),200)<\/script></body>'));w.document.close();}

/* ── de los datos del programa al documento ─────────────────────────── */
const norm=s=>String(s||'').trim().toLowerCase();
const TIT={PED:'PEDIDO',ALB:'ALBARÁN',FAC:'FACTURA',PRO:'FACTURA PROFORMA',PRE:'PRESUPUESTO',NOT:'NOTA DE ENTREGA'};
function tituloVenta(td){td=String(td||'').toUpperCase();if(TIT[td])return TIT[td];
  const t=(typeof tds!=='undefined'?tds:[]).find(x=>String(x.cod).toUpperCase()===td);const s=norm(t?t.desc:td);
  return /ped/.test(s)?'PEDIDO':/alb/.test(s)?'ALBARÁN':/profor/.test(s)?'FACTURA PROFORMA':/pres|ofer/.test(s)?'PRESUPUESTO':/fac/.test(s)?'FACTURA':(t?t.desc.toUpperCase():td||'DOCUMENTO');}
function agencia(nom){const a=(typeof ags!=='undefined'?ags:[]).find(x=>norm(x.nombre)===norm(nom));return {nombre:nom&&nom!=='—'?nom:'',tel:a?(a.tel||a.telefono||''):''};}
function ventaDoc(v){if(!v)return null;
  const c=(window.cls||[]).find(x=>norm(x.nombre)===norm(v.cliente)||(v.cif&&norm(x.cif)===norm(v.cif)));
  const ter={nombre:v.cliente,cif:v.cif||(c&&c.cif)||'',lineas:c&&(c.dir||c.pob)?[c.dir,[c.cp,c.pob].filter(x=>x).join(' '),c.prov||c.provincia||'']:[v.dir]};
  const ag=agencia(v.agencia);
  return {titulo:tituloVenta(v.tipodoc),rol:'Cliente'+(c&&c.cod?' '+c.cod:''),num:v.num,fecha:v.fecha,fent:v.fent||v.fecha,ftope:v.ftope,ref:v.ref||'',ter,
    lineas:(v.lineas||[]).map(l=>({cant:l.qty,cod:l.ptRef||'',art:l.ptNom||'',det:l.lote?'Lote '+l.lote:'',precio:l.prc,dto:l.dto||'',iva:l.iva,sub:l.base!==undefined?l.base:(l.qty*l.prc*(1-(l.dto||0)/100))})),
    dto:v.dto||0,dtopp:v.dtopp||0,re:!!v.re,fpago:v.fpago,transporte:ag.nombre,transpTel:ag.tel,obs:v.obs,lotes:v.lotes,vf:v.vfQR?{qr:v.vfQR,huella:v.vfHuella}:null};}
function prvDe(id,nom){return (typeof prvs!=='undefined'?prvs:[]).find(p=>(id!==undefined&&id!==''&&p.id==id)||(nom&&norm(p.nom)===norm(nom)));}
function terPrv(p,nom){return {nombre:p?p.nom:nom,cif:p?p.cif:'',lineas:p?[p.dir,[p.cp,p.pob].filter(x=>x).join(' '),p.pais,p.tel?'Tel. '+p.tel:'',p.email]:[]};}
function compraDoc(c){if(!c)return null;const p=prvDe(c.prvId,c.prvNom);
  return {titulo:'PEDIDO',rol:'Proveedor'+(p&&p.cod?' '+p.cod:''),num:c.num,fecha:c.fecha,fent:c.fent,ref:c.ref,ter:terPrv(p,c.prvNom),
    lineas:(c.lineas||[]).map(l=>{const mp=(typeof mps!=='undefined'?mps:[]).find(m=>m.id===l.mpId);return {cant:l.cant,cod:mp?mp.cod:'',art:l.mpNom,det:l.um?'Unidad: '+l.um:'',precio:l.precio,dto:l.dto||'',iva:l.iva??21,sub:l.total};}),
    fpago:p?(p.fpago||''):'',obs:c.obs};}
/* albarán de proveedor = entradas de MP con el mismo proveedor y nº de albarán (o misma fecha si no hay nº) */
const claveEnt=e=>norm(e.prv)+'|'+(e.alb?norm(e.alb):'f'+e.fecha);
function grupoEnt(i){const e=entmps[i];if(!e)return [];const k=claveEnt(e);return entmps.filter(x=>claveEnt(x)===k);}
function albPrvDoc(i){const G0=grupoEnt(i);if(!G0.length)return null;const e=G0[0],p=prvDe(undefined,e.prv);
  return {titulo:'ALBARÁN',rol:'Proveedor'+(p&&p.cod?' '+p.cod:''),num:e.alb||'—',fecha:e.fecha,fent:e.fecha,ref:'Recepción de materia prima',ter:terPrv(p,e.prv),sinPrecios:true,
    lineas:G0.map(x=>({cant:x.qty,cod:x.mpCod||'',art:x.mpNom,det:[x.lote?'Lote '+x.lote:'',x.cad?'Cad. '+fd(x.cad):'',x.coa?'COA recibido':'Sin COA'].filter(y=>y).join(' · ')})),
    lotes:G0.map(x=>x.lote).filter(x=>x)};}
function gastoDoc(g){if(!g)return null;const p=prvDe(undefined,g.prov);const cat=window.catGastos?(catGastos.find(c=>c.id===g.cat)||{}).nombre:'';
  return {titulo:'FACTURA',rol:'Proveedor'+(p&&p.cod?' '+p.cod:''),num:g.num||'—',fecha:g.fecha,fent:'',ftope:g.vto,ref:cat||'',ter:terPrv(p,g.prov),
    lineas:[{cant:1,cod:g.cta||'',art:g.concepto||cat||'Factura recibida',precio:g.base,iva:g.iva,sub:g.base}],ret:g.reten||0,totalFijo:g.total,
    fpago:[g.fpago,g.pagado?'pagada'+(g.fpagada?' el '+fd(g.fpagada):''):'pendiente de pago'].filter(x=>x).join(' · '),obs:g.notas};}

window.cxDocHTML=fragmento;window.cxDocImprimir=imprimir;window.cxDocTotales=totales;
window.cxDocVenta=ventaDoc;window.cxDocCompra=compraDoc;window.cxDocAlbPrv=albPrvDoc;window.cxDocGasto=gastoDoc;

/* ── clientes: Ventas → Imprimir y centro de Impresión ──────────────── */
window.tplVenta=function(v){return fragmento(ventaDoc(v));};
window.vdetPrint=function(){imprimir(ventaDoc(ventas[vDetIdx]));};

/* ── proveedores: botón en cada fila / ficha ────────────────────────── */
window.cxImpCompra=i=>imprimir(compraDoc(compras[i]));
window.cxImpAlbPrv=i=>imprimir(albPrvDoc(i));
window.cxImpGasto=id=>imprimir(gastoDoc((window.gastos||[]).find(g=>g.id===id)));
const BTN=(fn,t)=>`<button class="btn sm" onclick="${fn}" title="${t}"><i class="ti ti-printer"></i></button>`;
if(typeof rCompras==='function'){const _r=rCompras;window.rCompras=function(){_r.apply(this,arguments);if(!compras.length)return;
  document.querySelectorAll('#cp-rows tr').forEach((tr,ri)=>{const td=tr.lastElementChild;if(td)td.insertAdjacentHTML('afterbegin',BTN(`cxImpCompra(${compras.length-1-ri})`,'Imprimir pedido al proveedor'));});};}
if(typeof rEntMP==='function'){const _r=rEntMP;window.rEntMP=function(){_r.apply(this,arguments);
  const th=document.querySelector('#ent-rows')?.closest('table')?.querySelector('thead tr');if(th&&!th.querySelector('.cxd-th'))th.insertAdjacentHTML('beforeend','<th class="cxd-th"></th>');
  if(!entmps.length)return;document.querySelectorAll('#ent-rows tr').forEach((tr,i)=>tr.insertAdjacentHTML('beforeend',`<td>${BTN(`cxImpAlbPrv(${i})`,'Imprimir albarán del proveedor')}</td>`));};}
if(typeof window.gastoEditar==='function'){const _e=window.gastoEditar;window.gastoEditar=function(id){_e.apply(this,arguments);
  const dup=document.getElementById('gs-f-dup');if(!dup)return;let b=document.getElementById('gs-f-imp');
  if(!b){dup.insertAdjacentHTML('beforebegin','<button class="btn" id="gs-f-imp"><i class="ti ti-printer"></i>Imprimir factura</button>');b=document.getElementById('gs-f-imp');}
  const g=id!==null&&id!==undefined?window.gastos.find(x=>x.id===id):null;b.style.display=g?'':'none';b.onclick=()=>g&&cxImpGasto(g.id);};}

/* ── centro de Impresión: pestañas de pedido cliente y documentos de proveedor ── */
const tabs=document.getElementById('imp-tabs');
if(tabs&&!tabs.querySelector('[data-cxd]')){const alb=tabs.querySelector('[onclick*="\'alb\'"]'),pro=tabs.querySelector('[onclick*="\'pro\'"]');
  const b=(t,ic,txt)=>`<button class="ftab-i" data-cxd="${t}" onclick="impTab('${t}',this)"><i class="ti ${ic}"></i> ${txt}</button>`;
  if(alb){alb.insertAdjacentHTML('beforebegin',b('ped','ti-shopping-cart','Pedido'));alb.innerHTML='<i class="ti ti-receipt"></i> Albarán';}
  if(pro)pro.insertAdjacentHTML('afterend',b('pprv','ti-truck-delivery','Pedido proveedor')+b('aprv','ti-package-import','Albarán proveedor')+b('fprv','ti-file-invoice','Factura proveedor'));}
const MIOS={ped:'Pedido',pprv:'Pedido proveedor',aprv:'Albarán proveedor',fprv:'Factura proveedor'};
function opciones(t){
  if(t==='ped')return ventas.map((v,i)=>[i,v]).filter(([,v])=>tituloVenta(v.tipodoc)==='PEDIDO').map(([i,v])=>[i,`${v.num} · ${v.cliente} · ${fd(v.fecha)}`]);
  if(t==='pprv')return compras.map((c,i)=>[i,`${c.num} · ${c.prvNom||'—'} · ${fd(c.fecha)}`]);
  if(t==='aprv'){const vistos=new Set();return entmps.map((e,i)=>[i,e]).filter(([,e])=>{const k=claveEnt(e);if(vistos.has(k))return false;vistos.add(k);return true;}).map(([i,e])=>[i,`${e.alb||'s/n'} · ${e.prv||'—'} · ${fd(e.fecha)} · ${grupoEnt(i).length} líneas`]);}
  if(t==='fprv')return (window.gastos||[]).map(g=>[g.id,`${g.num||'s/n'} · ${g.prov} · ${fd(g.fecha)} · ${nf(g.total,2)} €`]);
  return [];}
if(typeof cImp==='function'){const _c=cImp;window.cImp=function(){_c.apply(this,arguments);if(!MIOS[impTipoActual])return;
  document.getElementById('imp-sel-lbl').textContent=MIOS[impTipoActual];
  document.getElementById('imp-doc').innerHTML='<option value="">— Selecciona —</option>'+opciones(impTipoActual).map(([k,t])=>`<option value="${impTipoActual}:${k}">${esc(t)}</option>`).join('');};}
if(typeof prvImp==='function'){const _p=prvImp;window.prvImp=function(){const val=document.getElementById('imp-doc').value;const [t,k]=val.split(':');
  if(!MIOS[t])return _p.apply(this,arguments);
  const d=t==='ped'?ventaDoc(ventas[+k]):t==='pprv'?compraDoc(compras[+k]):t==='aprv'?albPrvDoc(+k):gastoDoc((window.gastos||[]).find(g=>g.id==k));
  document.getElementById('imp-preview').innerHTML=d?fragmento(d):'';};}
/* el centro de Impresión imprime los documentos comerciales con su propia hoja A4 (sin la cabecera genérica) */
if(typeof impPrint==='function'){const _i=impPrint;window.impPrint=function(){const el=document.getElementById('imp-preview');
  if(!el||!el.querySelector('.cxd'))return _i.apply(this,arguments);
  const n=parseInt(document.getElementById('imp-copias').value)||1;const one=el.innerHTML;
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Complexil</title><style>@page{size:A4 portrait;margin:10mm 12mm}body{margin:0}</style></head><body>${Array(n).fill(one).join('<div style="page-break-after:always"></div>')}</body></html>`;
  if(window.impEnviar)impEnviar(html,{titulo:'Documento'});else{const w=window.open('','_blank');w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);}
  try{impHist.unshift({tipo:impTipoActual.toUpperCase(),num:document.getElementById('imp-doc').selectedOptions[0]?.text||'—',fecha:tod(),copias:n});rImpHist();}catch(e){}};}
try{rCompras();}catch(e){}try{rEntMP();}catch(e){}try{cImp();}catch(e){}
})();
