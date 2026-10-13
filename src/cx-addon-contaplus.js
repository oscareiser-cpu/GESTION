/* ═══════════════════════════════════════════════════════════════════════
   COMPLEXIL 4.22 — FICHAS AL ESTILO CONTAPLUS                 addon_contaplus.js
   · TECLADO en todas las fichas del programa:
       Intro            pasa al campo siguiente (en un texto largo, Intro es
                        salto de línea)
       F5 o Ctrl+S      guarda la ficha (pulsa su botón Guardar)
       Esc              cierra la ventana de la ficha sin guardar
       Ctrl+Av Pág/Re Pág  pestaña siguiente / anterior
   · CLIENTES y PROVEEDORES: la ficha se abre en una ventana encima de la
     lista, con pestañas (General · Domicilio · Contabilidad y cobro/pago ·
     Envío / Calidad · Observaciones). Los proveedores ya se pueden EDITAR
     (antes solo se podían dar de alta): lápiz en cada fila.
   · ARTÍCULOS: los apartados de la ficha pasan a pestañas.
   · ASIENTOS del Diario, como en ContaPlus: la subcuenta admite el punto
     (430.1 → 43000001); Intro recorre Subcuenta → Concepto → Debe → Haber
     (el título se pone solo); el concepto vacío copia el de la línea de
     arriba; al acabar una línea descuadrada se abre otra con la diferencia
     propuesta; cuadrado, Intro va a «Guardar asiento».
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const G=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const visible=el=>!!(el&&el.offsetParent!==null&&getComputedStyle(el).visibility!=='hidden');
const CAMPO='input:not([type=hidden]):not([type=file]):not([type=button]):not([type=submit]):not([type=checkbox]):not([type=radio]),select,textarea';
const GUARDAR=/^\s*(guardar|grabar|aceptar|registrar|añadir|crear)/i;

/* ── estilos ── */
document.head.insertAdjacentHTML('beforeend',`<style id="cxp-css">
.cxp-fondo{position:fixed;inset:0;z-index:900;background:rgba(15,23,42,.45);display:flex;align-items:flex-start;justify-content:center;padding:4vh 12px;overflow:auto}
.cxp-ventana{background:var(--bg,#f8fafc);border-radius:10px;width:min(920px,96vw);box-shadow:0 20px 60px rgba(0,0,0,.35);display:flex;flex-direction:column;max-height:92vh}
.cxp-cab{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--border,#e2e8f0);background:#fff;border-radius:10px 10px 0 0}
.cxp-cab b{flex:1;font-size:14px}.cxp-cuerpo{overflow:auto;padding:10px}.cxp-cuerpo>.card{margin:0}
.cxp-pie{font-size:11px;color:var(--text3,#94a3b8);padding:6px 14px;border-top:1px solid var(--border,#e2e8f0);background:#fff;border-radius:0 0 10px 10px}
.cxp-tabs{display:flex;gap:2px;flex-wrap:wrap;border-bottom:1px solid var(--border,#e2e8f0);margin:0 0 10px}
.cxp-tab{padding:6px 12px;font-size:12.5px;cursor:pointer;border:1px solid transparent;border-bottom:none;border-radius:6px 6px 0 0;color:var(--text2,#475569)}
.cxp-tab.on{background:#fff;border-color:var(--border,#e2e8f0);color:#1a6bc4;font-weight:600;margin-bottom:-1px}
.cxp-oculto{display:none!important}</style>`);

/* ── ventana de ficha ── */
let abierta=null;
function abrir(card,titulo,alCerrar){if(abierta&&abierta.card===card){abierta.tit.textContent=titulo;return;}cerrar(true);
  const marca=document.createComment('cxp');card.before(marca);
  const fondo=document.createElement('div');fondo.className='cxp-fondo';
  fondo.innerHTML=`<div class="cxp-ventana" role="dialog" aria-modal="true"><div class="cxp-cab"><b></b><button type="button" class="btn sm" title="Cerrar (Esc)"><i class="ti ti-x"></i></button></div><div class="cxp-cuerpo"></div>
    <div class="cxp-pie">Intro: campo siguiente · F5 o Ctrl+S: guardar · Esc: cerrar · Ctrl+Av Pág / Re Pág: cambiar de pestaña</div></div>`;
  const tit=fondo.querySelector('b');tit.textContent=titulo;fondo.querySelector('.cxp-cuerpo').appendChild(card);document.body.appendChild(fondo);
  fondo.querySelector('.cxp-cab button').onclick=()=>alCerrar();
  abierta={card,marca,fondo,tit,alCerrar};
  setTimeout(()=>{const f=[...card.querySelectorAll(CAMPO)].find(x=>visible(x)&&!x.disabled&&!x.readOnly);if(f)f.focus();},30);}
function cerrar(){if(!abierta)return;const a=abierta;abierta=null;a.marca.replaceWith(a.card);a.fondo.remove();}

/* ── pestañas por grupos de campos (ids) ── */
function pestanas(card,grupos){card.querySelector('.cxp-tabs')?.remove();
  card.querySelectorAll('.cxp-oculto').forEach(e=>e.classList.remove('cxp-oculto'));
  const fgrDe=id=>{const el=G(id);return el&&card.contains(el)?(el.closest('.fgr')||el):null;};
  const usados=new Set(),T=grupos.map(([t,ids])=>{const els=ids.map(fgrDe).filter(Boolean).filter(e=>!usados.has(e));els.forEach(e=>usados.add(e));return [t,els];}).filter(([,e])=>e.length);
  const resto=[...card.querySelectorAll('.fgr')].filter(f=>!usados.has(f)&&!f.closest('.cxp-tabs')&&f.querySelector(CAMPO+',input[type=checkbox]'));
  if(resto.length)T.push(['Otros datos',resto]);
  /* los títulos de apartado sobran con pestañas */
  const cab=card.querySelector('.stl');const titulos=[...card.querySelectorAll('.stl,.cxst')];/* el título va en la cabecera de la ventana */
  const barra=document.createElement('div');barra.className='cxp-tabs';
  barra.innerHTML=T.map(([t],i)=>`<div class="cxp-tab${i?'':' on'}" data-i="${i}">${esc(t)}</div>`).join('');
  (cab||card.firstElementChild).after(barra);
  const ver=i=>{T.forEach(([,els],j)=>els.forEach(e=>e.classList.toggle('cxp-oculto',j!==i)));titulos.forEach(h=>h.classList.add('cxp-oculto'));
    barra.querySelectorAll('.cxp-tab').forEach((b,j)=>b.classList.toggle('on',j===i));barra.dataset.i=i;
    const f=T[i][1].map(e=>e.matches(CAMPO)?e:e.querySelector(CAMPO)).find(x=>x&&visible(x));if(f&&card.contains(document.activeElement))f.focus();};
  barra.onclick=e=>{const t=e.target.closest('.cxp-tab');if(t)ver(+t.dataset.i);};barra.ver=ver;barra.n=T.length;ver(0);return barra;}
function cambiarPestana(d){const b=(abierta&&abierta.card.querySelector('.cxp-tabs'))||G('art-body')?.parentNode.querySelector('.cxp-tabs');if(!b||!b.ver)return false;b.ver(((+b.dataset.i||0)+d+b.n)%b.n);return true;}

/* ── CLIENTES ── */
const GCLI=[['General',['cf-cod','cf-nom','cf-cif','cf-tipocli','cf-tel','cf-movil','cf-email']],['Domicilio',['cf-dir','cf-cp','cf-pob','cf-prov','cf-pais']],
  ['Contabilidad y cobro',['cf-cta','cf-fpago','cf-dto','cf-banco','cf-iban']],['Envío',['cf-ag','cf-serv','cf-portes']],['Observaciones',['cf-obs']]];
function cliVentana(){const f=G('cli-form');if(!f)return;
  if(f.style.display==='none'){if(abierta&&abierta.card===f)cerrar();return;}
  const t=(G('cli-form-tit')?.textContent||'Cliente').trim();abrir(f,t,()=>showCliForm(false));pestanas(f,GCLI);}
['showCliForm','editCli'].forEach(fn=>{const o=window[fn];if(typeof o!=='function')return;
  window[fn]=function(){const r=o.apply(this,arguments);cliVentana();return r;};});

/* ── PROVEEDORES: ventana, pestañas y edición ── */
const GPRV=[['General',['prv-cod','prv-nom','prv-cif','prv-ctc','prv-tel','prv-email']],['Domicilio',['prv-pais']],
  ['Contabilidad y pago',['prv-cta','prv-banco','prv-iban']],['Calidad (ISO 22716)',['prv-tipo','prv-est','prv-fh','prv-fr','prv-aud','doc-fds','doc-ft','doc-coa','doc-cert','doc-reach','doc-cosmos']],['Observaciones',['prv-obs']]];
const PRVS=()=>{try{return prvs;}catch(e){return window.prvs||[];}};
const prvCard=()=>G('prv-cod')?.closest('.card');
let prvEdit=null;
const CAMPOS_PRV={'prv-cod':'cod','prv-nom':'nom','prv-cif':'cif','prv-pais':'pais','prv-ctc':'ctc','prv-email':'email','prv-tel':'tel','prv-tipo':'tipo','prv-est':'est','prv-fh':'fh','prv-fr':'fr','prv-obs':'obs','prv-cta':'ctaContable','prv-banco':'bancoId','prv-iban':'iban'};
const DOCS=['fds','ft','coa','cert','reach','cosmos'];
function prvRellenar(p){Object.entries(CAMPOS_PRV).forEach(([id,k])=>{const el=G(id);if(!el)return;const v=p?p[k]??'':'';
    if(el.tagName==='SELECT'){el.value=String(v);if(el.value!==String(v)&&el.options.length)el.selectedIndex=p&&v!==''?el.selectedIndex:0;}else el.value=v;});
  if(G('prv-aud'))G('prv-aud').value=p&&p.aud?'1':'0';
  DOCS.forEach(d=>{const el=G('doc-'+d);if(el)el.checked=!!(p&&p.docs&&p.docs[d]);});
  try{window.paisAvisoPrv&&paisAvisoPrv();}catch(e){}G('prv-cif')?.dispatchEvent(new Event('change'));}
function prvAbrir(id){const card=prvCard();if(!card)return;const p=id!=null?PRVS().find(x=>x.id===id):null;prvEdit=p?p.id:null;
  prvRellenar(p);const st=card.querySelector('.stl');if(st&&!st.dataset.cxp)st.dataset.cxp=st.textContent;
  const t=p?'Editar proveedor · '+p.cod+' '+p.nom:'Nuevo proveedor';if(st)st.textContent=t;
  card.classList.remove('cxp-oculto');abrir(card,t,prvCerrar);pestanas(card,GPRV);}
function prvCerrar(){prvEdit=null;cerrar();const c=prvCard();if(c)c.classList.add('cxp-oculto');}
window.cxpProveedor=prvAbrir;
if(typeof window.aPRV==='function'){const _a=window.aPRV;window.aPRV=function(){const L=PRVS(),n0=L.length;
  const faltan=!(G('prv-cod')?.value.trim()&&G('prv-nom')?.value.trim());if(faltan){alert('Código y razón social son obligatorios.');return;}
  if(prvEdit!=null){const orig=L.find(x=>x.id===prvEdit);
    /* se valida y se completa igual que un alta (IBAN, subcuenta, país…) y el resultado se funde en la ficha original */
    /* mientras se valida, la ficha original no cuenta como «código/NIF repetido» */
    const prev=orig?{cod:orig.cod,cif:orig.cif,nom:orig.nom}:null;if(orig){orig.cod='\u0000';orig.cif='\u0000';orig.nom='\u0000';}
    try{_a.apply(this,arguments);}finally{if(orig&&!(L.length>n0))Object.assign(orig,prev);}
    if(L.length>n0&&orig){const nuevo=L.pop();Object.assign(orig,nuevo,{id:orig.id});
      try{window.cxAudit&&cxAudit('editar','Proveedor '+orig.cod,orig.nom);}catch(e){}try{window.cxGuardarTodo&&cxGuardarTodo();}catch(e){}try{rPRV();}catch(e){}prvCerrar();}
    return;}
  _a.apply(this,arguments);if(L.length>n0){try{window.cxGuardarTodo&&cxGuardarTodo();}catch(e){}prvCerrar();}};}
/* lápiz de edición en cada fila y botón «Nuevo proveedor» */
function prvLista(){const card=prvCard();if(!card)return;if(!(abierta&&abierta.card===card))card.classList.add('cxp-oculto');
  if(!G('cxp-prv-nuevo')){card.insertAdjacentHTML('beforebegin',`<div style="margin-bottom:10px"><button class="btn pr" id="cxp-prv-nuevo" onclick="cxpProveedor(null)"><i class="ti ti-plus"></i> Nuevo proveedor</button></div>`);}
  document.querySelectorAll('#p-proveedores button[onclick^="elimGMP(\'proveedor\'"]').forEach(b=>{if(b.previousElementSibling?.classList.contains('cxp-ed'))return;
    const id=+(b.getAttribute('onclick').match(/,\s*(\d+)\)/)||[])[1];if(!id)return;
    b.insertAdjacentHTML('beforebegin',`<button class="btn sm cxp-ed" title="Editar proveedor" onclick="cxpProveedor(${id})" style="margin-right:4px"><i class="ti ti-pencil"></i></button>`);});}
if(typeof window.rPRV==='function'){const _r=window.rPRV;window.rPRV=function(){const r=_r.apply(this,arguments);try{prvLista();}catch(e){}return r;};}

/* ── ARTÍCULOS: apartados de la ficha en pestañas ── */
let artPest='Identificación';
window.artFichaHooks=window.artFichaHooks||[];
window.artFichaHooks.push(function(){const B=G('art-body');if(!B)return;const hijos=[...B.children];const cabs=hijos.filter(h=>h.classList.contains('cxst'));if(cabs.length<2)return;
  /* cada apartado (.cxst) es una pestaña; los bloques añadidos por otros módulos (imagen, datos ampliados…) llevan la suya */
  const nombre=t=>t.split('—')[0].split('·')[0].replace(/\(.*?\)/g,'').trim().slice(0,28);
  const T=[];let act=null;hijos.forEach(h=>{if(h.classList.contains('cxp-tabs'))return;
    if(h.classList.contains('cxst')){act=[nombre(h.textContent),[h],true];T.push(act);return;}
    const tit=h.id==='art-img-box'?'Imagen':h.classList.contains('card')?((h.querySelector('.stl,.cxst')||h.firstElementChild)?.textContent||''):'';
    if(tit.trim()){act=[nombre(tit),[h],false];T.push(act);return;}
    if(act)act[1].push(h);});
  B.querySelector('.cxp-tabs')?.remove();const barra=document.createElement('div');barra.className='cxp-tabs';
  barra.innerHTML=T.map(([t],i)=>`<div class="cxp-tab" data-i="${i}">${esc(t)}</div>`).join('');B.prepend(barra);
  const ver=i=>{artPest=T[i][0];T.forEach(([,els,cab],j)=>els.forEach((e,k)=>e.classList.toggle('cxp-oculto',j!==i||(k===0&&cab))));barra.querySelectorAll('.cxp-tab').forEach((b,j)=>b.classList.toggle('on',j===i));barra.dataset.i=i;};
  barra.onclick=e=>{const t=e.target.closest('.cxp-tab');if(t)ver(+t.dataset.i);};barra.ver=ver;barra.n=T.length;
  /* se abre en la última pestaña usada (la primera vez, «Identificación», como en ContaPlus) */
  ver(Math.max(0,T.findIndex(x=>x[0]===artPest)));});

/* ── ASIENTOS: teclado y atajos de ContaPlus ── */
const r2=n=>Math.round((+n||0)*100)/100;
function asExpandir(inp){const v=inp.value.trim();if(!v||!window.contaCta)return;const c=contaCta(v);if(c&&c!==v){inp.value=c;try{ctFilaCta(inp);}catch(e){}}}
document.addEventListener('focusout',e=>{if(e.target.classList?.contains('as-cta'))asExpandir(e.target);});
function descuadre(sin){const F=[...G('as-lineas').querySelectorAll('tr')].filter(r=>r!==sin);return r2(F.reduce((s,r)=>s+(+r.querySelector('.as-deb').value||0)-(+r.querySelector('.as-hab').value||0),0));}
function asIntro(t){const tr=t.closest('tr'),filas=[...G('as-lineas').querySelectorAll('tr')],i=filas.indexOf(tr);
  const q=c=>tr.querySelector(c);
  if(t.classList.contains('as-cta')){asExpandir(t);q('.as-con').focus();return;}
  if(t.classList.contains('as-tit')){q('.as-con').focus();return;}
  if(t.classList.contains('as-con')){if(!t.value.trim()){const prev=filas[i-1]?.querySelector('.as-con');t.value=(prev&&prev.value)||G('as-concepto')?.value||'';}
    /* línea sin importes y asiento descuadrado: propone la diferencia en su lado */
    const de=q('.as-deb'),ha=q('.as-hab');if(!de.value&&!ha.value){const dif=descuadre(tr);if(dif){(dif>0?ha:de).value=Math.abs(dif);try{ctTotales();}catch(e){}const f=dif>0?ha:de;f.focus();f.select();return;}}
    de.focus();return;}
  if(t.classList.contains('as-deb')&&!(+t.value)){q('.as-hab').focus();return;}
  /* fin de línea */
  try{ctTotales();}catch(e){}
  if(filas[i+1]){filas[i+1].querySelector('.as-cta').focus();return;}
  const d=r2(filas.reduce((s,r)=>s+(+r.querySelector('.as-deb').value||0),0)),h=r2(filas.reduce((s,r)=>s+(+r.querySelector('.as-hab').value||0),0)),dif=r2(d-h);
  if(dif){ctFilaAdd({concepto:q('.as-con').value,debe:dif<0?-dif:'',haber:dif>0?dif:''});ctTotales();G('as-lineas').lastElementChild.querySelector('.as-cta').focus();return;}
  const b=[...G('m-asiento').querySelectorAll('button')].find(x=>/guardar asiento/i.test(x.textContent));if(b)b.focus();}

/* ── teclado general ── */
function ambito(t){return t.closest('.cxp-ventana')||t.closest('.mb')||t.closest('.card')||t.closest('.panel')||document.body;}
function botonGuardar(sc){const bs=[...sc.querySelectorAll('button')].filter(b=>visible(b)&&!b.disabled&&GUARDAR.test(b.textContent));return bs.find(b=>b.classList.contains('pr'))||bs[0];}
document.addEventListener('keydown',e=>{if(e.defaultPrevented)return;const t=e.target;
  const enCampo=t instanceof Element&&t.matches(CAMPO);
  if(t instanceof Element&&(t.closest('#cx-acceso,.cx-acceso')||t.id==='menu-q'||/^acc-/.test(t.id||'')))return;
  /* guardar */
  if((e.key==='s'||e.key==='S')&&(e.ctrlKey||e.metaKey)||(e.key==='F5'&&enCampo)){const sc=abierta?abierta.card:enCampo?ambito(t):document.querySelector('.panel.active');const b=sc&&botonGuardar(sc);
    e.preventDefault();if(b)b.click();return;}
  /* Esc cierra la ficha solo si el foco está en ella (otro diálogo encima gestiona su propio Esc) */
  if(e.key==='Escape'&&abierta&&(t===document.body||abierta.fondo.contains(t))){e.preventDefault();abierta.alCerrar();return;}
  if(e.ctrlKey&&(e.key==='PageDown'||e.key==='PageUp')){if(cambiarPestana(e.key==='PageDown'?1:-1))e.preventDefault();return;}
  if(e.key!=='Enter'||e.shiftKey||e.ctrlKey||e.altKey||e.metaKey||!enCampo||t.tagName==='TEXTAREA'||t.hasAttribute('onkeydown'))return;
  if(t.closest('#as-lineas')){e.preventDefault();asIntro(t);return;}
  const sc=ambito(t);const L=[...sc.querySelectorAll(CAMPO)].filter(x=>visible(x)&&!x.disabled&&!x.readOnly);const i=L.indexOf(t);
  e.preventDefault();if(i>=0&&L[i+1]){L[i+1].focus();if(L[i+1].select&&L[i+1].tagName==='INPUT')try{L[i+1].select();}catch(_){}return;}
  /* último campo: siguiente pestaña o el botón Guardar */
  if(abierta&&cambiarPestana(1)){const b=abierta.card.querySelector('.cxp-tabs');if(+b.dataset.i!==0)return;}
  const b=botonGuardar(sc);if(b)b.focus();});

/* al entrar en Proveedores, lista con lápices y ficha en ventana */
const _P=window.P;window.P=function(id,el){if(abierta)abierta.alCerrar();_P(id,el);if(id==='proveedores')try{prvLista();}catch(e){}};
try{prvLista();}catch(e){}
})();
