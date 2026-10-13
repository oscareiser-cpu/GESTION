/* ═══════════════════════════════════════════════════════════════════════
   COMPLEXIL 4.22 — COMPROBACIÓN DE NIF-IVA INTRACOMUNITARIO (VIES)  addon_vies.js
   Botón «VIES» junto al CIF/NIF de la ficha de cliente y de proveedor:
   pregunta a VIES (Comisión Europea) si el NIF-IVA está dado de alta para
   operaciones intracomunitarias y muestra el nombre y la dirección registrados.
   · El navegador no puede llamar a VIES directamente: la consulta pasa por
     abrir_complexil.py (http://127.0.0.1:8765/api/vies), que tiene que estar
     abierto. Si no lo está, se ofrece abrir la web oficial de VIES.
   · País: el prefijo del NIF (DE123…, FR…) o, si no lo lleva, el país de la
     ficha; por defecto España. Grecia es EL en VIES.
   · Cada resultado se guarda (cx_vies, cifrado) con la fecha y el número de
     consulta de VIES, y queda en el Registro de auditoría: es la prueba para
     aplicar la exención de IVA en una entrega intracomunitaria.
   · «Servicio no disponible» NO significa NIF inválido: el país no contestó.
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const G=id=>document.getElementById(id);
const LS='cx_vies',WEB='https://ec.europa.eu/taxation_customs/vies/#/vat-validation';
const UE=new Set(['AT','BE','BG','CY','CZ','DE','DK','EE','EL','ES','FI','FR','HR','HU','IE','IT','LT','LU','LV','MT','NL','PL','PT','RO','SE','SI','SK','XI']);
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z]/g,'');
const NOMBRES={alemania:'DE',austria:'AT',belgica:'BE',bulgaria:'BG',chipre:'CY',republicacheca:'CZ',chequia:'CZ',dinamarca:'DK',estonia:'EE',grecia:'EL',espana:'ES',finlandia:'FI',francia:'FR',croacia:'HR',hungria:'HU',irlanda:'IE',italia:'IT',lituania:'LT',luxemburgo:'LU',letonia:'LV',malta:'MT',paisesbajos:'NL',holanda:'NL',polonia:'PL',portugal:'PT',rumania:'RO',suecia:'SE',eslovenia:'SI',eslovaquia:'SK',irlandadelnorte:'XI'};

/* país + número a partir de lo escrito en la ficha */
function separar(nif,paisNombre){let n=String(nif||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  let p=n.slice(0,2);if(p==='GR')p='EL';
  /* un NIF/CIF/NIE español nunca empieza por dos letras: si las lleva y son de un país UE, es el prefijo */
  if(UE.has(p)&&n.length>4)return {pais:p,nif:n.slice(2)};
  const q=NOMBRES[norm(paisNombre)];return {pais:q||'ES',nif:n};}

let REG={};try{REG=JSON.parse(localStorage.getItem(LS)||'{}')||{};}catch(e){REG={};}
function guardar(r){REG[r.pais+r.nif]=r;try{localStorage.setItem(LS,JSON.stringify(REG));}catch(e){}}
const base=()=>location.protocol.startsWith('http')&&location.port==='8765'?'':'http://127.0.0.1:8765';

window.cxVies=async function(nif,paisNombre){const {pais,nif:num}=separar(nif,paisNombre);
  if(!num)return {estado:'formato',pais,nif:num,error:'Escribe primero el CIF/NIF.'};
  if(!/^[A-Z0-9]{2,14}$/.test(num))return {estado:'formato',pais,nif:num,error:'El número tiene un formato no válido.'};
  let r;try{const resp=await fetch(`${base()}/api/vies?pais=${encodeURIComponent(pais)}&nif=${encodeURIComponent(num)}`,{cache:'no-store'});r=await resp.json();}
  catch(e){return {estado:'sin-lanzador',pais,nif:num,error:'Para consultar VIES abre Complexil con abrir_complexil.py (o déjalo abierto en segundo plano).'};}
  r=Object.assign({pais,nif:num},r,{f:new Date().toISOString(),u:(window.accUsuarioActual&&(accUsuarioActual()||{}).login)||''});
  if(r.estado==='valido'||r.estado==='invalido'){guardar(r);try{window.cxAudit&&cxAudit('VIES',pais+num,r.estado+(r.nombre?' · '+r.nombre:'')+(r.consulta?' · consulta '+r.consulta:''));}catch(e){}}
  return r;};
window.cxViesUltima=(nif,paisNombre)=>{const {pais,nif:num}=separar(nif,paisNombre);return REG[pais+num]||null;};

/* ── botón junto al CIF de cliente y de proveedor ── */
const TXT={valido:['#15803d','ti-circle-check','NIF-IVA VÁLIDO en VIES'],invalido:['#b91c1c','ti-circle-x','NO dado de alta en VIES: no aplicar exención intracomunitaria'],
  'sin-servicio':['#b45309','ti-alert-triangle','VIES no disponible ahora (no significa que sea inválido)'],formato:['#b45309','ti-alert-triangle','Formato no válido'],'sin-lanzador':['#b45309','ti-plug-off','Sin conexión con VIES']};
function pintar(caja,r){const [col,ic,t]=TXT[r.estado]||TXT['sin-servicio'];
  caja.innerHTML=`<span style="color:${col};font-weight:600"><i class="ti ${ic}"></i> ${esc(r.pais+' '+r.nif)} · ${t}</span>`+
    (r.nombre?`<br><span>${esc(r.nombre)}</span>`:'')+(r.direccion?`<br><span style="color:var(--text3)">${esc(r.direccion).replace(/\n/g,', ')}</span>`:'')+
    (r.f&&(r.estado==='valido'||r.estado==='invalido')?`<br><span style="color:var(--text3)">Comprobado ${esc(new Date(r.f).toLocaleString('es-ES'))}${r.consulta?' · consulta '+esc(r.consulta):''}</span>`:'')+
    (r.error&&r.estado!=='valido'?`<br><span style="color:var(--text3)">${esc(r.error)}</span>`:'')+
    (r.estado==='sin-lanzador'||r.estado==='sin-servicio'?` <a href="${WEB}" target="_blank" rel="noopener noreferrer">Abrir la web de VIES</a>`:'');}
function boton(cifId,paisId){const inp=G(cifId);if(!inp||G(cifId+'-vies'))return;
  /* el campo y el botón en la misma línea; el resultado debajo */
  const fila=document.createElement('div');fila.style.cssText='display:flex;gap:6px;align-items:center';
  inp.before(fila);fila.appendChild(inp);
  fila.insertAdjacentHTML('beforeend',`<button type="button" class="btn sm" id="${cifId}-vies" title="Comprobar NIF-IVA intracomunitario en VIES" style="flex:none"><i class="ti ti-world-check"></i>VIES</button>`);
  fila.insertAdjacentHTML('afterend',`<div id="${cifId}-vies-res" style="font-size:11px;margin-top:4px;line-height:1.45"></div>`);
  const caja=G(cifId+'-vies-res'),pais=()=>{const s=G(paisId);return s?s.value:'';};
  const previo=()=>{const r=inp.value.trim()&&cxViesUltima(inp.value,pais());if(r)pintar(caja,r);else caja.innerHTML='';};
  inp.addEventListener('change',previo);
  G(cifId+'-vies').onclick=async function(){this.disabled=true;caja.innerHTML='<span style="color:var(--text3)">Consultando VIES…</span>';
    try{pintar(caja,await cxVies(inp.value,pais()));}finally{this.disabled=false;}};
  return previo;}
const refrescos=[boton('cf-cif','cf-pais'),boton('prv-cif','prv-pais')].filter(Boolean);
/* al abrir una ficha, mostrar la última comprobación guardada */
['editCli','showCliForm','editPrv','prvEditar','showPrvForm'].forEach(fn=>{const f=window[fn];if(typeof f!=='function')return;
  window[fn]=function(){const r=f.apply(this,arguments);setTimeout(()=>refrescos.forEach(x=>x()),0);return r;};});
})();
