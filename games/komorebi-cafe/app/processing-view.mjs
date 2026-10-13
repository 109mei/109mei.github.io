import * as THREE from './vendor/three/build/three.module.js';
import {createProcessingScene} from './processing-scene.mjs';
/** Mount only while a research/processing panel is visible; owns a single second context. */
export function createProcessingPreview(host){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.5));renderer.setClearColor('#e5e8dc');renderer.outputColorSpace=THREE.SRGBColorSpace;const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.01,20);camera.position.set(2,1.65,2.5);camera.lookAt(0,.12,0);scene.add(new THREE.HemisphereLight('#fff5df','#617b68',2.5));const light=new THREE.DirectionalLight('#fff7e3',3);light.position.set(-2,4,3);scene.add(light);const process=createProcessingScene();scene.add(process.root);host.replaceChildren(renderer.domElement);renderer.domElement.setAttribute('aria-label','素材・加工工程の3D表示');let disposed=false,frame=0,paused=false,elapsed=0,lastTime=null;
 function resize(){if(disposed)return;const w=Math.max(1,host.clientWidth),h=Math.max(220,host.clientHeight||280);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
 const observer=globalThis.ResizeObserver?new ResizeObserver(resize):null;observer?.observe(host);resize();
 function draw(t){if(disposed)return;if(lastTime!==null&&!paused)elapsed+=Math.min(.1,(t-lastTime)/1000);lastTime=t;process.animate(elapsed);renderer.render(scene,camera);frame=requestAnimationFrame(draw);}frame=requestAnimationFrame(draw);
 renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();if(disposed)return;disposed=true;cancelAnimationFrame(frame);observer?.disconnect();process.dispose();renderer.dispose();const message=document.createElement('p');message.textContent='3D表示が中断されました。画面を閉じて開き直してください。工程と在庫はそのまま確認できます。';host.replaceChildren(message);});
 return {update(data){paused=Boolean(data.paused);return process.update(data);},resize,dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);observer?.disconnect();process.dispose();renderer.dispose();renderer.forceContextLoss();host.replaceChildren();}};
}
