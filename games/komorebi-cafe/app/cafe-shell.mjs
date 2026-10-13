// A non-modal notebook leaves the visible cafe interactive, including on touch.
export function createCafeShell(doc,{onOpen=()=>{},onClose=()=>{}}={}){
 const byId=id=>doc.getElementById(id),panel=byId('cafeNotebook'),toggle=byId('menuToggle'),closeButton=byId('menuClose');
 let returnFocus=toggle;
 function open(){if(!panel.hidden)return;returnFocus=doc.activeElement;panel.hidden=false;toggle.setAttribute('aria-expanded','true');doc.body.classList.add('notebook-open');const guide=byId('tutorialPanel');if(guide)panel.querySelector('.drawer-heading').after(guide);onOpen()}
 function close({focus=false}={}){panel.hidden=true;toggle.setAttribute('aria-expanded','false');doc.body.classList.remove('notebook-open');const guide=byId('tutorialPanel');if(guide)doc.querySelector('main').append(guide);onClose();if(focus)(returnFocus?.isConnected&&returnFocus!==doc.body?returnFocus:toggle).focus()}
 toggle.onclick=()=>{if(panel.hidden){open();closeButton.focus()}else close({focus:true})};closeButton.onclick=()=>close({focus:true});
 doc.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden&&!doc.querySelector('dialog[open]')){event.preventDefault();close({focus:true})}});
 // Observe only; do not cancel or intercept camera gestures/selection outside the drawer.
 doc.addEventListener('pointerdown',event=>{if(!panel.hidden&&!panel.contains(event.target)&&!toggle.contains(event.target)&&!event.target.closest('dialog,#tutorialPanel'))close()});
 const quick=byId('quickDay');
 function sync(){const source=['openDay','nextDay','closeDay'].map(byId).find(button=>!button.hidden);if(!source)return;quick.textContent=source.textContent;quick.disabled=source.disabled;quick.dataset.action=source.id;quick.title=source.title||''}
 quick.onclick=()=>{const source=byId(quick.dataset.action);source?.click();if(source&&!source.disabled)close();sync()};
 const observer=new MutationObserver(sync);for(const id of['openDay','nextDay','closeDay'])observer.observe(byId(id),{attributes:true,childList:true,subtree:true,characterData:true});sync();
 return{open,close,sync};
}
