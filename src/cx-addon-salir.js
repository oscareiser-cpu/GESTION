/* ═══════════════════════════════════════════════════════════════════════
   COMPLEXIL — BOTÓN SALIR
   Guarda los datos, detiene el lanzador (abrir_complexil.py) si lo hay y
   cierra la pestaña. Si el navegador no deja cerrarla, deja un aviso.
   ═══════════════════════════════════════════════════════════════════════ */
(function(){const tb=document.querySelector('.topbar > div:last-child');if(!tb||document.getElementById('cx-salir'))return;
tb.insertAdjacentHTML('beforeend','<button class="btn" id="cx-salir" title="Guardar y salir del programa"><i class="ti ti-logout"></i>Salir</button>');
document.getElementById('cx-salir').onclick=async()=>{if(!confirm('¿Salir de Complexil? Los datos se guardan antes de cerrar.'))return;
  try{if(window.cxGuardarTodo)await cxGuardarTodo();}catch(e){}
  try{if(location.protocol.startsWith('http'))await fetch('/salir',{method:'POST'});}catch(e){}
  window.close();
  setTimeout(()=>{document.body.innerHTML='<div style="font:16px Arial,sans-serif;text-align:center;margin-top:20vh;color:#333"><b>Complexil se ha cerrado.</b><br><br>Los datos están guardados. Ya puedes cerrar esta pestaña del navegador.</div>';},400);};
})();
