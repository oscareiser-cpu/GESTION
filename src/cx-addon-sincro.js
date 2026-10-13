/* ═══════════════════════════════════════════════════════════════════════
   COMPLEXIL 4.22 — VENTAS ↔ CONTABILIDAD SIEMPRE SINCRONIZADAS  addon_sincro.js
   Una factura cuyo cliente se había escrito a mano (sin ficha en Clientes) no
   tenía subcuenta 430 y NO llegaba al Libro Diario: solo salía un aviso en
   Enlace contable, donde nadie lo veía.
   Ahora, como en ContaPlus, todo cliente de una factura tiene su ficha y su
   subcuenta 430:
   · Al guardar una venta y al arrancar el programa se da de alta la ficha
     del cliente que falte (nombre, NIF y dirección de la factura) con la
     siguiente subcuenta 430 libre, y la factura queda enlazada a ella.
   · En el Libro Diario, un aviso amarillo lista cualquier documento que aun
     así no se pueda contabilizar, con su motivo.
   Cada alta automática queda en el Registro de auditoría.
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const G=id=>document.getElementById(id);
const norm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]/g,'');
const VENTAS=()=>{try{return ventas;}catch(e){return [];}};
const sinNombre=n=>!norm(n)||/^(contado|clientecontado|varios|clientesvarios|sincliente)$/.test(norm(n));
const contable=v=>!v.tpv&&!v.anulada&&!(v.contab&&v.contab.externo)&&v.tipodoc==='FAC';

function buscar(v){const C=window.cls||[];
  return C.find(x=>v.idCliente!==undefined&&x.id===v.idCliente)||C.find(x=>norm(x.nombre)===norm(v.cliente))||(norm(v.cif)&&C.find(x=>norm(x.cif)===norm(v.cif)));}

/* da de alta la ficha de los clientes de factura que no la tienen */
window.cxSincroClientes=function(){const C=window.cls=window.cls||[];const nuevos=[];
  VENTAS().filter(contable).forEach(v=>{if(sinNombre(v.cliente))return;let c=buscar(v);
    if(!c){c={id:C.length?Math.max(...C.map(x=>+x.id||0))+1:1,cod:'',nombre:String(v.cliente).trim(),cif:v.cif||'',dir:v.dir||'',cp:'',pob:'',provi:'',tel:'',email:'',
        fpago:v.fpago||'',dto:0,obs:'Ficha creada automáticamente desde la factura '+v.num+' para contabilizarla.',creado:new Date().toISOString(),origen:'auto-venta'};
      if(window.ctbSugerirCli)try{c.ctaContable=ctbSugerirCli(c.id);}catch(e){}
      C.push(c);nuevos.push(c.nombre+(c.ctaContable?' ('+c.ctaContable+')':''));}
    else if(!c.ctaContable&&window.ctbSugerirCli){try{c.ctaContable=ctbSugerirCli(c.cod||c.id);}catch(e){}}
    if(v.idCliente===undefined||v.idCliente===null)v.idCliente=c.id;});
  if(nuevos.length){try{localStorage.setItem('cx_clientes',JSON.stringify(C));}catch(e){}
    try{window.cxGuardarTodo&&cxGuardarTodo();}catch(e){}
    try{window.cxAudit&&cxAudit('SINCRONIZACIÓN','Clientes',nuevos.length+' fichas creadas desde facturas: '+nuevos.join(', '));}catch(e){}
    ['rCli','poblarSelectClientes'].forEach(f=>{try{typeof window[f]==='function'&&window[f]();}catch(e){}});}
  return nuevos;};

/* aviso en el Libro Diario de lo que no se ha podido contabilizar */
function aviso(){const p=G('p-diario');if(!p||!window.contaGenerar)return;let A=[];try{A=contaGenerar({}).avisos||[];}catch(e){A=['No se han podido calcular los asientos: '+e.message];}
  let d=G('cx-sincro-aviso');if(!A.length){if(d)d.remove();return;}
  if(!d){d=document.createElement('div');d.id='cx-sincro-aviso';d.className='card';d.style.cssText='border-left:4px solid #f59e0b;background:#fffbeb';p.prepend(d);}
  d.innerHTML=`<div style="font-weight:600;color:#92400e;margin-bottom:6px"><i class="ti ti-alert-triangle"></i> ${A.length} documento(s) sin contabilizar</div>`+A.map(a=>`<div style="font-size:12px;color:#78350f">• ${esc(a)}</div>`).join('');}

if(typeof window.aV==='function'){const _a=window.aV;window.aV=function(){const r=_a.apply(this,arguments);const fin=()=>{try{cxSincroClientes();}catch(e){}};
  if(r&&typeof r.then==='function')r.then(fin,fin);else fin();return r;};}
const _P=window.P;window.P=function(id,el){_P(id,el);if(id==='diario'){try{cxSincroClientes();}catch(e){}setTimeout(aviso,0);}};
setTimeout(()=>{try{cxSincroClientes();}catch(e){}},9000);
})();
