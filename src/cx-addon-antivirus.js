/* ═══════════════════════════════════════════════════════════════════════
   COMPLEXIL 4.22 — ANTIVIRUS DE ARCHIVOS                      addon_antivirus.js
   Analiza TODO archivo que entra en el programa (botones «Importar», «Abrir
   copia», logotipos, imágenes de artículos, migración, carpetas ISO…, y lo que
   se arrastra sobre la pantalla) ANTES de que el módulo lo lea:
   · PELIGRO (se bloquea siempre): ejecutables y scripts (.exe, .bat, .js, .vbs,
     .ps1, .hta, .lnk…, también disfrazados con doble extensión o con el
     carácter de inversión de texto), contenido ejecutable aunque el nombre
     diga otra cosa (MZ/PE, ELF, Mach-O, #!), documentos Office con macros
     (vbaProject.bin / _VBA_PROJECT), ZIP con ejecutables dentro, PDF con
     JavaScript o acción «Launch», imágenes que no son imágenes, SVG/HTML con
     scripts, fórmulas peligrosas en CSV (DDE, cmd, powershell…), la firma de
     prueba EICAR y archivos de más de 100 MB.
   · AVISO (se puede continuar, solo administrador): JSON/CSV/texto con código
     HTML/JavaScript incrustado, PDF con archivos adjuntos.
   Cada análisis queda en el registro del antivirus (cx_antivirus, cifrado) y
   cada bloqueo en el Registro de auditoría.
   Configuración → Antivirus: historial, analizar un archivo a mano y
   analizar los datos guardados en busca de código incrustado.
   No sustituye al antivirus del ordenador (Windows Defender): es una segunda
   barrera para lo que entra en Complexil.
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const G=id=>document.getElementById(id);
const LS='cx_antivirus',MAX=100*1024*1024,LEER=8*1024*1024;

const EXT_PELIGRO=new Set(['exe','dll','scr','com','pif','cpl','msi','msp','mst','bat','cmd','ps1','psm1','psd1','vbs','vbe','js','jse','mjs','wsf','wsh','wsc','hta','jar','lnk','reg','inf','scf','chm','iso','img','vhd','vhdx','apk','app','dmg','pkg','sh','bash','command','py','pyw','pl','rb','ws','gadget','msc','application','appref-ms','xll','xlam','ppam','docm','dotm','xlsm','xltm','xlsb','pptm','potm','ppsm','sldm']);
const EXT_IMAGEN=new Set(['png','jpg','jpeg','gif','webp','bmp','ico','svg','avif']);
const ext=n=>{const m=String(n||'').toLowerCase().match(/\.([a-z0-9-]+)$/);return m?m[1]:'';};

const ascii=b=>{let s='';for(let i=0;i<b.length;i++)s+=String.fromCharCode(b[i]);return s;};
const empieza=(b,...x)=>x.every((v,i)=>b[i]===v);
const EICAR='X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
const RE_HTML=/<\s*script\b|javascript\s*:|<\s*(iframe|object|embed)\b|<[a-z][^>]{0,200}\son[a-z]{3,20}\s*=/i;
const RE_CSV=/(^|[\t,;"])\s*[=+\-@]\s*(cmd|powershell|mshta|rundll32|regsvr32|certutil|bitsadmin|wscript|cscript|msexec|dde|hyperlink|webservice|importxml|importdata|importrange)\b|(^|[\t,;"])\s*[=+\-@][^\t,;"\n]*\|/im;

/* lee hasta LEER bytes del principio y del final (donde están el índice de un ZIP y el final de un PDF) */
async function bytes(f){if(f.size<=LEER)return new Uint8Array(await f.arrayBuffer());
  const a=new Uint8Array(await f.slice(0,LEER/2).arrayBuffer()),z=new Uint8Array(await f.slice(f.size-LEER/2).arrayBuffer());
  const r=new Uint8Array(a.length+z.length);r.set(a);r.set(z,a.length);return r;}

/* nombres de los archivos de un ZIP, sacados de su índice central (registros PK\x01\x02) */
function zipNombres(b){const r=[];for(let i=0;i+46<b.length;i++){if(b[i]===0x50&&b[i+1]===0x4b&&b[i+2]===1&&b[i+3]===2){
  const n=b[i+28]|b[i+29]<<8;if(n>0&&i+46+n<=b.length){r.push(ascii(b.subarray(i+46,i+46+n)));i+=45+n;}}}return r;}

async function analizar(f){
  const nom=String(f&&f.name||''),e=ext(nom),P=[],A=[];
  const peligro=t=>P.push(t),aviso=t=>A.push(t);
  if(/[‪-‮⁦-⁩]/.test(nom))peligro('El nombre oculta su extensión real con caracteres de inversión de texto.');
  if(EXT_PELIGRO.has(e))peligro(/m$|xlsb|xll|am$/.test(e)?`Documento de Office con macros (.${e}).`:`Tipo de archivo ejecutable o script (.${e}).`);
  const partes=nom.toLowerCase().split('.');if(partes.length>2&&EXT_PELIGRO.has(partes[partes.length-1]))peligro('Doble extensión: el archivo se hace pasar por otro tipo.');
  if(f.size>MAX)peligro(`Archivo demasiado grande (${(f.size/1048576).toFixed(0)} MB; máximo ${MAX/1048576} MB).`);
  if(P.length)return {nombre:nom,tam:f.size,nivel:'peligro',motivos:P};
  const b=await bytes(f),s=ascii(b),cab=s.slice(0,4096);
  /* contenido ejecutable, se llame como se llame */
  if(empieza(b,0x4d,0x5a))peligro('Contiene un programa de Windows (cabecera MZ).');
  if(empieza(b,0x7f,0x45,0x4c,0x46))peligro('Contiene un programa de Linux (ELF).');
  if(empieza(b,0xcf,0xfa,0xed,0xfe)||empieza(b,0xfe,0xed,0xfa,0xce)||empieza(b,0xfe,0xed,0xfa,0xcf)||empieza(b,0xce,0xfa,0xed,0xfe))peligro('Contiene un programa de macOS (Mach-O).');
  if(empieza(b,0x23,0x21))peligro('Es un script ejecutable (#!).');
  if(s.includes(EICAR))peligro('Firma de prueba de antivirus EICAR.');
  /* imágenes: el contenido tiene que ser de verdad una imagen */
  const esImg=empieza(b,0x89,0x50,0x4e,0x47)||empieza(b,0xff,0xd8,0xff)||cab.startsWith('GIF8')||(cab.startsWith('RIFF')&&cab.slice(8,12)==='WEBP')||cab.startsWith('BM')||empieza(b,0,0,1,0)||cab.slice(4,12)==='ftypavif';
  const esSvg=/^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!doctype svg[^>]*>\s*)?<svg\b/i.test(cab);
  if((EXT_IMAGEN.has(e)||/^image\//.test(f.type))&&!esImg&&!esSvg)peligro('Dice ser una imagen pero su contenido no lo es.');
  /* ZIP (xlsx, docx, zip…): macros y ejecutables dentro */
  if(empieza(b,0x50,0x4b,0x03,0x04)||empieza(b,0x50,0x4b,0x05,0x06)){
    if(/vbaProject\.bin/i.test(s))peligro('Documento de Office con macros (vbaProject.bin).');
    const malo=zipNombres(b).find(n=>EXT_PELIGRO.has(ext(n))&&!/^(xlam|ppam|docm|dotm|xlsm|xltm|xlsb|pptm|potm|ppsm|sldm)$/.test(ext(n)));
    if(malo)peligro(`El comprimido contiene un ejecutable o script (${malo.slice(-60)}).`);
    if(/activeX\/activeX\d*\.bin|oleObject\d*\.bin/i.test(s))aviso('El documento lleva objetos incrustados (ActiveX/OLE).');}
  /* Office antiguo (.xls, .doc): macros VBA */
  if(empieza(b,0xd0,0xcf,0x11,0xe0)&&/_VBA_PROJECT|V\x00B\x00A\x00/.test(s))peligro('Documento de Office con macros (VBA).');
  /* PDF */
  if(cab.startsWith('%PDF')||e==='pdf'){
    if(/\/(JavaScript|JS)\b/.test(s))peligro('PDF con JavaScript.');
    if(/\/Launch\b/.test(s))peligro('PDF que intenta abrir programas (/Launch).');
    if(/\/EmbeddedFile\b/.test(s))aviso('PDF con archivos adjuntos dentro.');}
  /* texto: SVG/HTML con scripts, código incrustado en datos, fórmulas peligrosas */
  const texto=!/[\x00-\x08\x0e-\x1a]/.test(s.slice(0,8192));
  if(texto){
    if(esSvg||e==='svg'||/^(html?|xhtml|xml|mht|mhtml)$/.test(e)||/^\s*<(!doctype html|html)\b/i.test(cab)){if(RE_HTML.test(s))peligro('Página o imagen SVG con código ejecutable (script).');}
    else if(RE_HTML.test(s))aviso('Contiene código HTML/JavaScript incrustado en los datos.');
    if(/^(csv|tsv|txt)$/.test(e)&&RE_CSV.test(s))peligro('Fórmulas peligrosas para Excel (DDE / comandos del sistema).');}
  return {nombre:nom,tam:f.size,nivel:P.length?'peligro':A.length?'aviso':'limpio',motivos:P.concat(A)};}

/* ── registro ── */
let REG=[];try{REG=JSON.parse(localStorage.getItem(LS)||'[]')||[];}catch(e){REG=[];}
function anotar(r,origen){REG.unshift({f:new Date().toISOString(),u:(window.accUsuarioActual&&(accUsuarioActual()||{}).login)||'',origen,nombre:r.nombre,tam:r.tam,nivel:r.nivel,motivos:r.motivos,decision:r.decision||''});
  if(REG.length>1000)REG.length=1000;try{localStorage.setItem(LS,JSON.stringify(REG));}catch(e){}
  if(r.nivel!=='limpio')try{window.cxAudit&&cxAudit('ANTIVIRUS',r.nombre,r.nivel+' · '+(r.decision||'')+' · '+r.motivos.join(' '));}catch(e){}
  if(G('p-antivirus')?.classList.contains('active'))render();}

/* decide qué archivos pasan: peligro nunca; aviso solo si un administrador lo confirma */
async function filtrar(files,origen){const ok=[],fuera=[];
  for(const f of files){let r;try{r=await analizar(f);}catch(e){r={nombre:f.name,tam:f.size,nivel:'peligro',motivos:['No se ha podido analizar: '+e.message]};}
    if(r.nivel==='aviso'){const adm=window.accEsAdmin?accEsAdmin():true;
      r.decision=adm&&confirm(`ANTIVIRUS · ${r.nombre}\n\n${r.motivos.join('\n')}\n\nNo es un virus conocido, pero puede ser peligroso. ¿Abrirlo de todos modos?`)?'permitido por administrador':'bloqueado';}
    else r.decision=r.nivel==='peligro'?'bloqueado':'permitido';
    anotar(r,origen);(r.decision==='bloqueado'?fuera:ok).push(r.decision==='bloqueado'?r:f);}
  if(fuera.length)alert('ANTIVIRUS DE COMPLEXIL — archivo bloqueado\n\n'+fuera.map(r=>'• '+r.nombre+'\n   '+r.motivos.join('\n   ')).join('\n\n')+'\n\nNo se ha abierto. Si esperabas este archivo, pide al remitente una versión sin macros ni programas y analízalo también con el antivirus del ordenador.');
  return ok;}
const lista=fs=>{const dt=new DataTransfer();fs.forEach(f=>dt.items.add(f));return dt;};
const origenDe=el=>{const p=el.closest&&el.closest('.panel');return (p?p.id.replace(/^p-/,''):'pantalla')+(el.id?' · '+el.id:'');};

/* ── interceptar la selección de archivos (antes que el módulo que la pidió) ── */
const aprobados=new WeakSet();
document.addEventListener('change',ev=>{const el=ev.target;
  if(!(el instanceof HTMLInputElement)||el.type!=='file'||el.dataset.cxav==='manual')return;
  if(aprobados.has(el)){aprobados.delete(el);return;}
  if(!el.files||!el.files.length)return;
  ev.stopImmediatePropagation();
  const fs=[...el.files];
  filtrar(fs,origenDe(el)).then(ok=>{
    if(!ok.length){el.value='';return;}
    if(ok.length<fs.length)el.files=lista(ok).files;
    aprobados.add(el);el.dispatchEvent(new Event('change',{bubbles:true}));});},true);

/* ── interceptar archivos arrastrados ── */
const soltados=new WeakSet();
document.addEventListener('drop',ev=>{const dt=ev.dataTransfer;
  if(soltados.has(ev)||!dt||!dt.files||!dt.files.length)return;
  ev.stopImmediatePropagation();ev.preventDefault();
  const fs=[...dt.files],destino=ev.target;
  filtrar(fs,origenDe(destino)+' · arrastrado').then(ok=>{if(!ok.length)return;
    const n=new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:lista(ok),clientX:ev.clientX,clientY:ev.clientY});
    soltados.add(n);destino.dispatchEvent(n);});},true);

/* ── datos guardados: código incrustado (p. ej. de una importación antigua) ── */
function analizarDatos(){const res=[];const ls=window.localStorage;
  for(let i=0;i<ls.length;i++){const k=ls.key(i);if(!/^(cx_|vf_)/.test(k)||k===LS||k==='cx_auditoria')continue;
    let v='';try{v=ls.getItem(k)||'';}catch(e){continue;}
    /* las imágenes guardadas (data:image/…) no cuentan */
    const t=v.replace(/data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+/g,'');
    const m=t.match(RE_HTML);if(m)res.push({clave:k,muestra:t.slice(Math.max(0,m.index-40),m.index+80)});}
  return res;}

/* ── pantalla Configuración → Antivirus ── */
function construir(){if(G('p-antivirus'))return;
  const ref=[...document.querySelectorAll('.ni')].find(n=>(n.getAttribute('onclick')||'').includes("'copias'"));
  const ni=document.createElement('div');ni.className='ni';ni.setAttribute('onclick',"P('antivirus',this)");ni.innerHTML='<i class="ti ti-shield-check"></i>Antivirus';
  if(ref)ref.after(ni);else document.querySelector('.sidebar')?.appendChild(ni);
  try{if(typeof PGS!=='undefined')PGS.antivirus='Antivirus de archivos';}catch(e){}
  const p=document.createElement('div');p.id='p-antivirus';p.className='panel';
  p.innerHTML=`<div class="krow" style="grid-template-columns:repeat(4,1fr)" id="av-kpis"></div>
  <div class="card"><div class="stl"><i class="ti ti-shield-check"></i> Antivirus de Complexil</div>
    <div style="font-size:12px;color:var(--text2);margin-bottom:10px">Todo archivo que se abre o se arrastra en el programa se analiza antes de usarlo. Se bloquean programas y scripts (también disfrazados), documentos de Office con macros, PDF con JavaScript, imágenes falsas, SVG/HTML con código y fórmulas peligrosas en CSV. Es una segunda barrera: mantén activo el antivirus del ordenador.</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <label class="btn pr" style="cursor:pointer"><i class="ti ti-file-search"></i>Analizar archivos…<input type="file" multiple data-cxav="manual" style="display:none" onchange="avManual(this)"></label>
      <button class="btn" onclick="avDatos()"><i class="ti ti-database-search"></i>Analizar datos guardados</button>
      <button class="btn" onclick="avVaciar()"><i class="ti ti-eraser"></i>Vaciar historial</button></div>
    <div id="av-res" style="margin-top:10px"></div></div>
  <div class="card"><div class="stl"><i class="ti ti-history"></i> Historial de análisis</div><div id="av-hist"></div></div>`;
  (G('p-inicio')?G('p-inicio').parentNode:document.body).appendChild(p);}
const NIV={limpio:['#15803d','Limpio'],aviso:['#b45309','Aviso'],peligro:['#b91c1c','Peligro']};
const tamTxt=n=>n>=1048576?(n/1048576).toFixed(1)+' MB':n>=1024?(n/1024).toFixed(0)+' KB':(n||0)+' B';
const fila=r=>`<tr><td>${esc(new Date(r.f).toLocaleString('es-ES'))}</td><td>${esc(r.u)}</td><td>${esc(r.origen)}</td><td>${esc(r.nombre)}</td><td style="text-align:right">${tamTxt(r.tam)}</td><td><b style="color:${NIV[r.nivel][0]}">${NIV[r.nivel][1]}</b></td><td>${esc(r.decision)}</td><td style="font-size:11px">${esc(r.motivos.join(' · '))}</td></tr>`;
function render(){if(!G('av-kpis'))return;
  const c=n=>REG.filter(r=>r.nivel===n).length;
  G('av-kpis').innerHTML=[['Archivos analizados',REG.length,'c1'],['Limpios',c('limpio'),'c2'],['Avisos',c('aviso'),'c3'],['Bloqueados',REG.filter(r=>r.decision==='bloqueado').length,'c4']].map(([t,v,k])=>`<div class="kpi ${k}"><div class="kl">${t}</div><div class="kv">${v}</div></div>`).join('');
  G('av-hist').innerHTML=REG.length?`<table><thead><tr><th>Fecha</th><th>Usuario</th><th>Origen</th><th>Archivo</th><th>Tamaño</th><th>Resultado</th><th>Decisión</th><th>Motivo</th></tr></thead><tbody>${REG.slice(0,300).map(fila).join('')}</tbody></table>`:'<div style="font-size:12px;color:var(--text2)">Todavía no se ha analizado ningún archivo.</div>';}
window.avManual=async function(inp){const fs=[...inp.files];inp.value='';const out=[];
  for(const f of fs){const r=await analizar(f);r.decision='análisis manual';anotar(r,'análisis manual');out.push(r);}
  G('av-res').innerHTML=out.map(r=>`<div style="padding:6px 0;border-bottom:1px solid var(--border,#e2e8f0)"><b style="color:${NIV[r.nivel][0]}">${NIV[r.nivel][1]}</b> · ${esc(r.nombre)} (${tamTxt(r.tam)})${r.motivos.length?'<br><span style="font-size:11.5px">'+esc(r.motivos.join(' · '))+'</span>':''}</div>`).join('');};
window.avDatos=function(){const r=analizarDatos();
  try{window.cxAudit&&cxAudit('ANTIVIRUS','Datos guardados',r.length?r.length+' tablas con código incrustado: '+r.map(x=>x.clave).join(', '):'sin código incrustado');}catch(e){}
  G('av-res').innerHTML=r.length?`<div style="color:#b45309;font-size:12.5px;margin-bottom:6px"><b>${r.length} tabla(s) con código HTML/JavaScript incrustado.</b> Revisa esos registros: el programa los muestra como texto, pero no deberían estar ahí.</div><table><thead><tr><th>Tabla</th><th>Fragmento</th></tr></thead><tbody>${r.map(x=>`<tr><td>${esc(x.clave)}</td><td style="font-family:monospace;font-size:11px">${esc(x.muestra)}</td></tr>`).join('')}</tbody></table>`:'<div style="color:#15803d;font-size:12.5px"><b>Datos guardados limpios:</b> no hay código incrustado.</div>';
  return r;};
window.avVaciar=function(){if(window.accEsAdmin&&!accEsAdmin()){alert('Solo un administrador puede vaciar el historial del antivirus.');return;}
  if(!confirm('¿Vaciar el historial del antivirus? Los bloqueos siguen en el Registro de auditoría.'))return;
  REG=[];try{localStorage.setItem(LS,'[]');}catch(e){}try{window.cxAudit&&cxAudit('ANTIVIRUS','Historial','vaciado');}catch(e){}render();};
window.cxAntivirus={analizar,filtrar,analizarDatos,registro:()=>REG.slice()};
construir();
const _P=window.P;window.P=function(id,el){_P(id,el);if(id==='antivirus')render();};
})();
