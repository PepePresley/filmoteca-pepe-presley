(() => {
 const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const syncMode=()=>document.documentElement.classList.toggle('appStandalone',standalone());
 syncMode();
 const tabs=document.querySelector('.tabsBar');
 const syncTabs=()=>{if(tabs)document.documentElement.style.setProperty('--app-tabs-height',Math.ceil(tabs.getBoundingClientRect().height)+'px')};
 syncTabs();
 if(tabs&&typeof ResizeObserver==='function')new ResizeObserver(syncTabs).observe(tabs);
 window.matchMedia('(display-mode: standalone)').addEventListener?.('change',syncMode);
 const button=document.getElementById('installApp');
 if(!button)return;
 let promptEvent=null;
 button.hidden=standalone();
 window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();promptEvent=event;button.hidden=standalone();
 });
 window.addEventListener('appinstalled',()=>{promptEvent=null;button.hidden=true;});
 button.addEventListener('click',async()=>{
  if(promptEvent){
   const event=promptEvent;promptEvent=null;
   try{await event.prompt();const choice=await event.userChoice;if(choice.outcome==='accepted')button.hidden=true;return;}catch(_){}
  }
  let dialog=document.getElementById('installAppDialog');
  if(!dialog){
   dialog=document.createElement('dialog');dialog.id='installAppDialog';dialog.className='appDialog';
   dialog.setAttribute('aria-labelledby','installAppTitle');
   dialog.innerHTML='<h2 id="installAppTitle">Filmoteca en tu móvil</h2><p>Accede a tu colección desde un icono en la pantalla de inicio.</p><div id="installAppSteps"></div><p>Necesitas conexión. Las películas se abren en Telegram.</p><form method="dialog"><button class="appClose">Entendido</button></form>';
   document.body.appendChild(dialog);
  }
  const apple=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  document.getElementById('installAppSteps').innerHTML=apple
   ? '<ol><li>Abre esta página en <strong>Safari</strong>. Si estás en otra aplicación, usa su opción «Abrir en Safari».</li><li>Pulsa <strong>Compartir</strong> y después <strong>Añadir a pantalla de inicio</strong>.</li><li>Activa <strong>Abrir como app web</strong> si aparece y pulsa <strong>Añadir</strong>.</li></ol>'
   : '<ol><li>Abre esta página en <strong>Chrome o Edge</strong>.</li><li>En el menú del navegador, elige <strong>Instalar aplicación</strong> o <strong>Añadir a pantalla de inicio</strong>.</li><li>Confirma la instalación y abre Filmoteca desde su nuevo icono.</li></ol>';
  if(!dialog.open)dialog.showModal();
 });
})();
