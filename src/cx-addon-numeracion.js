/* ═══════════════════════════════════════════════════════════════════════
   COMPLEXIL — NUMERACIÓN POR AÑO
   Pedidos, albaranes y facturas (ventas) y pedidos a proveedor se numeran
   PREFIJO-AAAA-NNNN. El año sale de la fecha del documento: a partir del
   1 de enero el contador vuelve a 0001 solo (FAC-2027-0001…), sin tocar
   nada. Los documentos antiguos (FAC-0012) conservan su número y cuentan
   para seguir la serie de su año, así no se repite ningún número.
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
const G=id=>document.getElementById(id);
const hoy=()=>new Date().toISOString().slice(0,10);
const anio=f=>String(f||hoy()).slice(0,4);
const sec=s=>{const m=/(\d+)\s*$/.exec(String(s||''));return m?parseInt(m[1]):0;};
const fmt=(pre,a,n)=>pre+'-'+a+'-'+String(n).padStart(4,'0');
/* número automático (nuestro o el antiguo): se puede recalcular sin pisar uno escrito a mano */
const esAuto=(v,pre)=>!v||new RegExp('^'+pre+'-(\\d{4}-)?\\d+$','i').test(v);
/* mayor usado alguna vez en ese año (también los borrados) */
const leer=k=>{try{return parseInt(localStorage.getItem(k))||0;}catch(e){return 0;}};
const anotar=(k,n)=>{try{if(n>leer(k))localStorage.setItem(k,String(n));}catch(e){}};

/* ── ventas: pedido, albarán, factura, proforma… ─────────────────────── */
const V=()=>typeof ventas!=='undefined'?ventas:[];  // ventas es const: no cuelga de window
const PRE={FAC:'FAC',ALB:'ALB',PRO:'PRO',NOT:'NOT',PED:'PED'};
function sigVenta(ti,f){const a=anio(f),pre=PRE[ti]||ti,k='cx_num_'+pre+'_'+a;
  const m=Math.max(leer(k),0,...V().filter(v=>v.tipodoc===ti&&anio(v.fecha)===a).map(v=>sec(v.num)));
  return fmt(pre,a,m+1);}
window.cVNum=function(){const ti=G('vtd').value||'FAC',vn=G('vn');if(vn&&esAuto(vn.value,PRE[ti]||ti)||vn&&vn.dataset.cxAuto===vn.value)vn.value=sigVenta(ti,G('vf').value);if(vn)vn.dataset.cxAuto=vn.value;};
G('vf')?.addEventListener('change',()=>{const vn=G('vn');if(vn&&vn.dataset.cxAuto===vn.value)cVNum();});
if(typeof window.aV==='function'){const _a=window.aV;window.aV=function(){const n=V().length;const r=_a.apply(this,arguments);
  const v=V()[n];if(v)anotar('cx_num_'+(PRE[v.tipodoc]||v.tipodoc)+'_'+anio(v.fecha),sec(v.num));return r;};}

/* ── compras: pedido a proveedor ──────────────────────────────────────── */
window.cpSiguienteNum=function(){const a=anio(G('cp-fecha')?.value),k='cx_num_OC_'+a;
  const m=Math.max(leer(k),0,...(window.compras||[]).filter(c=>anio(c.fecha)===a).map(c=>sec(c.num)));return fmt('OC',a,m+1);};
if(typeof window.guardarCompra==='function'){const _g=window.guardarCompra;window.guardarCompra=function(){const n=(window.compras||[]).length;
  const nn=G('cp-num');if(nn&&esAuto(nn.value.trim(),'OC'))nn.value=cpSiguienteNum();
  const fin=()=>{const c=(window.compras||[])[n];if(c)anotar('cx_num_OC_'+anio(c.fecha),sec(c.num));if(G('cp-num'))G('cp-num').value=cpSiguienteNum();};
  const r=_g.apply(this,arguments);if(r&&typeof r.then==='function')return r.then(x=>{fin();return x;});fin();return r;};}
G('cp-fecha')?.addEventListener('change',()=>{const nn=G('cp-num');if(nn&&esAuto(nn.value.trim(),'OC'))nn.value=cpSiguienteNum();});

try{cVNum();}catch(e){}try{if(G('cp-num'))G('cp-num').value=cpSiguienteNum();}catch(e){}
})();
