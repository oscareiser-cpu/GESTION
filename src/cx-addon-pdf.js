/* ═══════════════════════════════════════════════════════════════════════
   COMPLEXIL — DESCARGAR EN PDF
   Convierte cualquier documento imprimible (pedidos, albaranes, facturas,
   listados, fichas, etiquetas…) en un archivo .pdf que se descarga
   directamente, sin pasar por el cuadro de impresión del navegador.
   - Diálogo Imprimir: botón "Descargar PDF".
   - Ventanas de impresión que abre el programa: botón flotante "Descargar PDF".
   - impEnviar(html,{pdf:true}) o cxPdfDeHtml(html,nombre) desde otros módulos.
   Funciona sin Internet: html2canvas y jsPDF van incluidos en este bloque.
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
const MM=96/25.4;
const PAP={A4:[210,297],A5:[148,210],A3:[297,420],Carta:[216,279]};

function aviso(t,ms){let d=document.getElementById('cx-pdf-aviso');
  if(!d){d=document.createElement('div');d.id='cx-pdf-aviso';d.style.cssText='position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#1e2a78;color:#fff;padding:9px 16px;border-radius:6px;font:13px Arial,sans-serif;z-index:99999;box-shadow:0 2px 10px rgba(0,0,0,.3)';document.body.appendChild(d);}
  d.textContent=t;d.style.display='';clearTimeout(d._t);if(ms)d._t=setTimeout(()=>{d.style.display='none';},ms);}

/* papel y márgenes: perfil de impresión si lo hay; si no, la regla @page del propio documento */
function papel(html,perfil){let w=210,h=297,m=10,apaisado=false;
  if(perfil&&(PAP[perfil.papel]||(typeof PAPELES!=='undefined'&&PAPELES[perfil.papel]))){[w,h]=PAP[perfil.papel]||PAPELES[perfil.papel];apaisado=perfil.orient==='horizontal';m=Number(perfil.margen)||m;}
  else if(perfil&&perfil.papel==='Libre'){w=Number(perfil.ancho)||100;h=Number(perfil.alto)||50;m=Number(perfil.margen)||0;}
  else{const r=/@page\s*\{([^}]*)\}/i.exec(html);if(r){const s=/size\s*:\s*([^;]+)/i.exec(r[1]);
      if(s){const v=s[1].trim();const k=Object.keys(PAP).find(x=>new RegExp('\\b'+x+'\\b','i').test(v));if(k)[w,h]=PAP[k];
        const mm=v.match(/([\d.]+)\s*mm\s+([\d.]+)\s*mm/);if(mm){w=+mm[1];h=+mm[2];}apaisado=/landscape/i.test(v);}
      const mg=/margin\s*:\s*([\d.]+)\s*mm/i.exec(r[1]);if(mg)m=+mg[1];}}
  if(apaisado&&w<h)[w,h]=[h,w];return {w,h,m};}

/* puntos de corte: final de filas y bloques, para no partir una línea entre dos páginas */
function cortes(doc,altoPag,total){const top=e=>e.getBoundingClientRect().top+doc.defaultView.scrollY,bot=e=>e.getBoundingClientRect().bottom+doc.defaultView.scrollY;
  const forz=[...doc.body.querySelectorAll('*')].filter(e=>{const s=doc.defaultView.getComputedStyle(e);return s.pageBreakAfter==='always'||s.breakAfter==='page'||s.pageBreakBefore==='always'||s.breakBefore==='page';})
    .map(e=>{const s=doc.defaultView.getComputedStyle(e);return (s.pageBreakBefore==='always'||s.breakBefore==='page')?top(e):bot(e);});
  const cand=[...doc.body.querySelectorAll('tr,p,li,h1,h2,h3,h4,div,table,img,section')].map(bot).filter(y=>y>0).sort((a,b)=>a-b);
  const pags=[];let y=0;
  while(total-y>2){const lim=y+altoPag;const f=forz.filter(z=>z>y+1&&z<=lim).sort((a,b)=>a-b)[0];
    let fin=f!==undefined?f:lim>=total?total:Math.max(0,...cand.filter(z=>z>y+altoPag*.5&&z<=lim));
    if(!fin||fin<=y)fin=Math.min(lim,total);pags.push([y,fin]);y=fin;}
  return pags.length?pags:[[0,total]];}

window.cxPdfDeHtml=async function(html,nombre,opts){opts=opts||{};
  if(!window.html2canvas||!window.jspdf){alert('No se ha podido cargar el generador de PDF.');return;}
  const P=papel(html,opts.perfil);const anchoPx=Math.round((P.w-2*P.m)*MM),altoPx=(P.h-2*P.m)*MM;
  aviso('Generando PDF…');
  const f=document.createElement('iframe');f.style.cssText=`position:fixed;left:-20000px;top:0;width:${anchoPx}px;height:${Math.round(altoPx)}px;border:0;visibility:hidden`;document.body.appendChild(f);
  try{const d=f.contentDocument;d.open();
    d.write(String(html).replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<\/head>/i,'<style>html,body{margin:0!important;padding:0!important;background:#fff!important;zoom:1!important}.no-print,#cx-pdf-btn{display:none!important}</style></head>'));d.close();
    await new Promise(r=>{if(d.readyState==='complete')r();else f.onload=r;setTimeout(r,3000);});
    await Promise.all([...d.images].map(i=>i.complete?0:new Promise(r=>{i.onload=i.onerror=r;})));
    if(d.fonts&&d.fonts.ready)await d.fonts.ready;
    // html2canvas no entiende writing-mode vertical: se sustituye por un giro equivalente
    const vw=d.defaultView;[...d.body.querySelectorAll('*')].forEach(e=>{const s=vw.getComputedStyle(e);if(!/^vertical/.test(s.writingMode))return;
      const r=e.getBoundingClientRect(),inv=/^matrix\(-1/.test(s.transform);
      Object.assign(e.style,{writingMode:'horizontal-tb',whiteSpace:'nowrap',width:r.height+'px',height:r.width+'px',transformOrigin:'0 0',
        transform:inv?`translateY(${r.height}px) rotate(-90deg)`:`translateX(${r.width}px) rotate(90deg)`});});
    // pies/cabeceras fijos (position:fixed) se repiten en cada página, como al imprimir
    const fijos=[],ocultos=[];for(const e of [...d.body.querySelectorAll('*')].filter(e=>vw.getComputedStyle(e).position==='fixed')){const r=e.getBoundingClientRect();if(!r.width||!r.height)continue;
      const c=await html2canvas(e,{scale:2,backgroundColor:'#ffffff',logging:false});fijos.push({img:c.toDataURL('image/png'),x:r.left/MM,y:r.top/MM,w:r.width/MM,h:r.height/MM,abajo:r.top>altoPx/2});e.style.visibility='hidden';ocultos.push(e);}
    // alto real del contenido (sin el blanco del final, que daría una página vacía)
    const total=Math.max(1,...[...d.body.querySelectorAll('*')].map(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&!ocultos.some(f=>f.contains(e))?r.bottom+vw.scrollY:0;}));
    const reserva=Math.max(0,...fijos.filter(f=>f.abajo).map(f=>altoPx-f.y*MM));
    const pags=cortes(d,altoPx-reserva,total);
    const pdf=new window.jspdf.jsPDF({unit:'mm',format:[P.w,P.h],orientation:P.w>P.h?'landscape':'portrait',compress:true});
    for(let i=0;i<pags.length;i++){const [y0,y1]=pags[i];
      if(pags.length>3)aviso(`Generando PDF… página ${i+1} de ${pags.length}`);
      const c=await html2canvas(d.body,{scale:2,backgroundColor:'#ffffff',useCORS:true,logging:false,x:0,y:y0,width:anchoPx,height:Math.ceil(y1-y0),windowWidth:anchoPx,windowHeight:Math.round(altoPx),scrollX:0,scrollY:0});
      if(i)pdf.addPage([P.w,P.h],P.w>P.h?'landscape':'portrait');
      pdf.addImage(c.toDataURL('image/jpeg',0.92),'JPEG',P.m,P.m,P.w-2*P.m,(y1-y0)/MM,undefined,'FAST');
      fijos.forEach(f=>pdf.addImage(f.img,'PNG',P.m+f.x,P.m+f.y,f.w,f.h,undefined,'FAST'));}
    const tit=nombre||(/<title>([^<]*)<\/title>/i.exec(html)||[])[1]||'Complexil';
    pdf.save(tit.replace(/&amp;/g,'&').replace(/[\\/:*?"<>|]+/g,'-').trim().slice(0,120)+'.pdf');
    aviso('PDF descargado',2500);}
  catch(e){console.error(e);aviso('');document.getElementById('cx-pdf-aviso').style.display='none';alert('No se ha podido generar el PDF: '+e.message);}
  finally{f.remove();}};

/* impEnviar: {pdf:true} o "previa" = 'pdf' descarga en lugar de imprimir */
if(typeof window.impEnviar==='function'){const _e=window.impEnviar;window.impEnviar=function(html,opts){opts=opts||{};
  if(opts.pdf||opts.previa==='pdf')return cxPdfDeHtml(html,opts.titulo,opts);return _e.apply(this,arguments);};}

/* diálogo Imprimir: botón Descargar PDF */
if(typeof window.impDialogo==='function'){const _d=window.impDialogo;window.impDialogo=function(){_d.apply(this,arguments);
  const prev=document.querySelector('#m-imp button[onclick="impDlgOk(true)"]');
  if(prev&&!document.getElementById('imp-d-pdf'))prev.insertAdjacentHTML('afterend','<button class="btn" id="imp-d-pdf" onclick="impDlgOk(\'pdf\')"><i class="ti ti-file-type-pdf"></i>Descargar PDF</button>');};}

/* ventanas de impresión abiertas con window.open('') + document.write: botón flotante */
function botonVentana(w){const d=w.document;if(!d.body||d.getElementById('cx-pdf-btn'))return;
  const b=d.createElement('button');b.id='cx-pdf-btn';b.textContent='⬇ Descargar PDF';
  b.style.cssText='position:fixed;top:10px;right:10px;z-index:99999;background:#1e2a78;color:#fff;border:0;border-radius:6px;padding:8px 14px;font:600 13px Arial,sans-serif;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3)';
  const st=d.createElement('style');st.textContent='@media print{#cx-pdf-btn{display:none!important}}';(d.head||d.body).appendChild(st);
  b.onclick=()=>{const html='<!DOCTYPE html>'+d.documentElement.outerHTML;window.cxPdfDeHtml(html,d.title);};d.body.appendChild(b);}
const _open=window.open;
window.open=function(url){const w=_open.apply(window,arguments);
  if(w&&(!url||url==='about:blank'))try{const d=w.document,_c=d.close;d.close=function(){const r=_c.apply(d,arguments);try{botonVentana(w);}catch(e){}return r;};}catch(e){}
  return w;};
})();

/* barra superior: botón PDF del panel que se está viendo */
(function(){const tb=document.querySelector('.topbar > div:last-child');if(!tb||document.getElementById('cx-pdf-top'))return;
  tb.insertAdjacentHTML('afterbegin','<button class="btn" id="cx-pdf-top" title="Descargar en PDF lo que estás viendo"><i class="ti ti-file-type-pdf"></i>PDF</button>');
  document.getElementById('cx-pdf-top').onclick=()=>{if(!window.impHtmlPanel)return;const p=typeof panelActivo==='function'?panelActivo():null;
    cxPdfDeHtml(impHtmlPanel(p,{}),typeof tituloDe==='function'?tituloDe(p):document.getElementById('pt')?.textContent);};})();
