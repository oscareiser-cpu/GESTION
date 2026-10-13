/* ═══════════════════════════════════════════════════════════════════════
   COMPLEXIL 4.22 — ESTADÍSTICAS REALES                      addon_estadisticas.js
   La pantalla Estadísticas solo enseñaba la lista de los 42 informes de
   ClassicGes con cifras fijas: no calculaba nada. Ahora se calcula todo, en el
   momento, con las ventas, cobros y facturas de gasto del programa:
   · Resumen del periodo: facturado (base), IVA, nº de facturas, ticket medio,
     pendiente de cobro, gastos y resultado (ventas − gastos, sin IVA).
   · Ventas por mes (y el mismo mes del año anterior), por cliente, por
     artículo y por familia; gastos por proveedor y por categoría.
   · Filtros en una línea: año y desde/hasta. Cada tabla se exporta con el
     botón Exportar general (son tablas normales).
   Ventas = facturas (FAC) y tickets de TPV no anulados; los presupuestos,
   pedidos, albaranes y proformas no cuentan como venta.
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const G=id=>document.getElementById(id);
const r2=n=>Math.round((+n||0)*100)/100;
const eur=n=>(+n||0).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
const num=n=>(+n||0).toLocaleString('es-ES',{maximumFractionDigits:2});
const iso=f=>{const s=String(f||'');const m=s.match(/^(\d{4})-(\d{2})-(\d{2})/)||s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);return !m?'':m[1].length===4?`${m[1]}-${m[2]}-${m[3]}`:`${m[3]}-${m[2]}-${m[1]}`;};
const MES=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const COLOR='#1a6bc4'; /* una sola serie por gráfico: un solo tono (validado contra el fondo claro) */
const VENTAS=()=>{try{return ventas;}catch(e){return [];}};
const GASTOS=()=>Array.isArray(window.gastos)?window.gastos:[];
const esVenta=v=>!v.anulada&&(v.tipodoc==='FAC'||!!v.tpv);
const baseV=v=>v.base!==undefined?+v.base||0:(v.lineas||[]).reduce((s,l)=>s+(+l.base||0),0);
const ivaV=v=>v.ivaImp!==undefined?+v.ivaImp||0:(+v.total||0)-baseV(v);

function familiaDe(l){const a=window.artFind&&(artFind(l.ptRef)||null);const k=a&&a.familia;if(!k)return 'Sin familia';
  const f=(window.fams||[]).find(x=>(window.famClave?famClave(x):String(x.ref||x.id))===String(k));return f?f.nombre:String(k);}
function agrupar(lista,clave,valor){const m=new Map();lista.forEach(x=>{const k=clave(x)||'—';const o=m.get(k)||{k,v:0,n:0,q:0};o.v+=valor(x);o.n++;o.q+=(+x.qty||0);m.set(k,o);});
  return [...m.values()].sort((a,b)=>b.v-a.v);}

/* tabla con barra horizontal: la barra es la misma cifra que la columna, con su valor como texto y en el tooltip */
function tablaBarras(titulo,filas,cols,max){const top=Math.max(...filas.map(f=>Math.abs(f.v)),0)||1;const vis=filas.slice(0,max||15),resto=filas.slice(max||15);
  if(resto.length)vis.push({k:`Otros (${resto.length})`,v:resto.reduce((s,f)=>s+f.v,0),n:resto.reduce((s,f)=>s+f.n,0),q:resto.reduce((s,f)=>s+f.q,0),otros:true});
  return `<div class="card"><div class="stl">${titulo}</div>${filas.length?`<table><thead><tr><th>${cols[0]}</th><th style="width:38%"></th>${cols.slice(1).map(c=>`<th style="text-align:right">${c}</th>`).join('')}</tr></thead><tbody>${
    vis.map(f=>{const w=f.otros?0:Math.max(0,f.v)/top*100;return `<tr><td>${esc(f.k)}</td><td><div title="${esc(f.k)}: ${eur(f.v)}" style="height:10px;width:${w.toFixed(1)}%;min-width:${w?2:0}px;background:${COLOR};border-radius:0 4px 4px 0"></div></td>`+
      `<td style="text-align:right;white-space:nowrap">${eur(f.v)}</td>`+(cols.length>2?`<td style="text-align:right">${cols[2]==='Unidades'?num(f.q):f.n}</td>`:'')+'</tr>';}).join('')}</tbody></table>`:'<div style="font-size:12px;color:var(--text2)">Sin datos en este periodo.</div>'}</div>`;}

function pintar(){const p=G('p-estadisticas');if(!p)return;
  const anios=[...new Set(VENTAS().concat(GASTOS()).map(x=>iso(x.fecha).slice(0,4)).filter(Boolean))].sort().reverse();
  const hoyA=String(new Date().getFullYear());if(!anios.includes(hoyA))anios.unshift(hoyA);
  const anio=G('est-anio')?.value||hoyA,desde=G('est-desde')?.value||'',hasta=G('est-hasta')?.value||'';
  const enRango=f=>{const d=iso(f);if(!d)return false;if(desde||hasta)return (!desde||d>=desde)&&(!hasta||d<=hasta);return d.slice(0,4)===anio;};
  const V=VENTAS().filter(v=>esVenta(v)&&enRango(v.fecha)),Gs=GASTOS().filter(g=>enRango(g.fecha));
  const fact=r2(V.reduce((s,v)=>s+baseV(v),0)),iva=r2(V.reduce((s,v)=>s+ivaV(v),0)),gas=r2(Gs.reduce((s,g)=>s+(+g.base||0),0));
  const pend=r2(VENTAS().filter(v=>!v.anulada&&v.tipodoc==='FAC'&&!v.cobrado&&enRango(v.fecha)).reduce((s,v)=>s+(+v.total||0),0));
  const nFac=V.filter(v=>!v.tpv).length,nTpv=V.filter(v=>v.tpv).length;
  const kpi=(t,v,c)=>`<div class="kpi ${c}"><div class="kl">${t}</div><div class="kv">${v}</div></div>`;
  /* ventas por mes del año elegido + mismo mes del año anterior (texto) */
  const porMes=a=>{const m=Array(12).fill(0);VENTAS().filter(v=>esVenta(v)&&iso(v.fecha).slice(0,4)===a).forEach(v=>{m[+iso(v.fecha).slice(5,7)-1]+=baseV(v);});return m;};
  const mA=porMes(anio),mP=porMes(String(+anio-1)),topM=Math.max(...mA,1);
  const meses=`<div class="card"><div class="stl"><i class="ti ti-chart-bar"></i> Ventas por mes ${esc(anio)} (base imponible)</div>
    <div style="display:flex;align-items:flex-end;gap:2px;height:150px;border-bottom:1px solid var(--border);padding:0 4px">${mA.map((v,i)=>`<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%" title="${MES[i]} ${esc(anio)}: ${eur(v)} · ${MES[i]} ${+anio-1}: ${eur(mP[i])}">`+
      `<div style="font-size:9.5px;color:var(--text2);margin-bottom:2px">${v?num(Math.round(v)):''}</div><div style="width:70%;max-width:38px;height:${(v/topM*120).toFixed(1)}px;background:${COLOR};border-radius:4px 4px 0 0"></div></div>`).join('')}</div>
    <div style="display:flex;gap:2px;padding:0 4px">${MES.map(m=>`<div style="flex:1;text-align:center;font-size:10.5px;color:var(--text2)">${m}</div>`).join('')}</div>
    <details style="margin-top:8px"><summary style="cursor:pointer;font-size:12px;color:var(--text2)">Ver tabla</summary><table><thead><tr><th>Mes</th><th style="text-align:right">${esc(anio)}</th><th style="text-align:right">${+anio-1}</th><th style="text-align:right">Diferencia</th></tr></thead><tbody>${
      MES.map((m,i)=>`<tr><td>${m}</td><td style="text-align:right">${eur(mA[i])}</td><td style="text-align:right">${eur(mP[i])}</td><td style="text-align:right">${eur(mA[i]-mP[i])}</td></tr>`).join('')}</tbody></table></details></div>`;
  const L=[];V.forEach(v=>(v.lineas||[]).forEach(l=>L.push(Object.assign({},l,{_v:v}))));
  const porCli=agrupar(V,v=>v.tpv?'Ventas de mostrador (TPV)':v.cliente,baseV);
  const porArt=agrupar(L,l=>(l.ptRef?l.ptRef+' · ':'')+(l.ptNom||l.desc||'Artículo'),l=>+l.base||0);
  const porFam=agrupar(L,familiaDe,l=>+l.base||0);
  const porPrv=agrupar(Gs,g=>g.prov,g=>+g.base||0);
  const porCat=agrupar(Gs,g=>{const c=window.catGasto&&catGasto(g.cat);return c?c.nombre:'Sin categoría';},g=>+g.base||0);
  const opc=anios.map(a=>`<option${a===anio?' selected':''}>${a}</option>`).join('');
  p.innerHTML=`<div class="card" style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap">
      <div class="fgr"><span class="lbl">Año</span><select id="est-anio" onchange="G('est-desde').value='';G('est-hasta').value='';estPintar()" style="max-width:110px">${opc}</select></div>
      <div class="fgr"><span class="lbl">Desde</span><input type="date" id="est-desde" value="${esc(desde)}" onchange="estPintar()"></div>
      <div class="fgr"><span class="lbl">Hasta</span><input type="date" id="est-hasta" value="${esc(hasta)}" onchange="estPintar()"></div>
      <span style="font-size:11.5px;color:var(--text2);padding-bottom:8px">Ventas = facturas y tickets de TPV (sin presupuestos, pedidos, albaranes ni proformas). Importes sin IVA.</span></div>
    <div class="krow" style="grid-template-columns:repeat(4,1fr)">${kpi('Facturado (base)',eur(fact),'c1')+kpi('Facturas / tickets',nFac+' / '+nTpv,'c1')+kpi('Ticket medio',eur(V.length?fact/V.length:0),'c1')+kpi('IVA repercutido',eur(iva),'c1')}</div>
    <div class="krow" style="grid-template-columns:repeat(3,1fr)">${kpi('Pendiente de cobro',eur(pend),'c3')+kpi('Gastos (base)',eur(gas),'c4')+kpi('Resultado (ventas − gastos)',eur(fact-gas),fact-gas>=0?'c2':'c4')}</div>
    ${meses}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:12px">
      ${tablaBarras('<i class="ti ti-users"></i> Ventas por cliente',porCli,['Cliente','Importe','Documentos'])}
      ${tablaBarras('<i class="ti ti-package"></i> Ventas por artículo',porArt,['Artículo','Importe','Unidades'])}
      ${tablaBarras('<i class="ti ti-category"></i> Ventas por familia',porFam,['Familia','Importe','Unidades'])}
      ${tablaBarras('<i class="ti ti-truck"></i> Gastos por proveedor',porPrv,['Proveedor','Importe','Facturas'])}
      ${tablaBarras('<i class="ti ti-tags"></i> Gastos por categoría',porCat,['Categoría','Importe','Facturas'])}
    </div>`;}
window.estPintar=pintar;
/* la lista fija de informes ya no existe: quien llame a rEst/sF pinta las estadísticas reales */
window.rEst=()=>{if(G('p-estadisticas')?.classList.contains('active'))pintar();};window.sF=()=>pintar();
const _P=window.P;window.P=function(id,el){_P(id,el);if(id==='estadisticas')pintar();};
})();
