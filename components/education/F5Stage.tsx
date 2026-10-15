'use client';
import {useEffect,useRef,useState} from 'react';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {f5Parts} from '@/lib/education/f5-course';

type Props={expanded:boolean;selected:number;rotate:boolean;reset:number;onSelect:(part:number)=>void};
export default function F5Stage({expanded,selected,rotate,reset,onSelect}:Props){
 const mount=useRef<HTMLDivElement>(null),live=useRef({expanded,selected,rotate,reset,onSelect});live.current={expanded,selected,rotate,reset,onSelect};
 const [error,setError]=useState(false);
 useEffect(()=>{
  const host=mount.current!;let renderer:T.WebGLRenderer;
  try{renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});}catch{setError(true);return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;host.appendChild(renderer.domElement);
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(37,1,.1,70);camera.position.set(7.8,6.5,10.5);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.7,0);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=8;controls.maxDistance=20;controls.maxPolarAngle=Math.PI*.48;controls.autoRotateSpeed=.5;
  scene.add(new T.HemisphereLight('#b9e5ed','#172d34',3));
  for(const [color,intensity,x,y,z] of [['#ffffff',5,3,7,5],['#42e3d0',4,-5,3,-2],['#a7b8fc',3,2,5,-6]] as const){const light=new T.DirectionalLight(color,intensity);light.position.set(x,y,z);scene.add(light);}
  const resources:(T.BufferGeometry|T.Material|T.Texture)[]=[],targets:T.Mesh[]=[],groups:T.Group[]=[],glows:T.MeshStandardMaterial[][]=[];
  const root=new T.Group();scene.add(root);
  function box(parent:T.Object3D,size:number[],pos:number[],color:string,part?:number,metalness=.6){const geo=new T.BoxGeometry(...size as [number,number,number]),mat=new T.MeshStandardMaterial({color,metalness,roughness:.37});resources.push(geo,mat);const mesh=new T.Mesh(geo,mat);mesh.position.set(...pos as [number,number,number]);parent.add(mesh);if(part!==undefined){mesh.userData.part=part;targets.push(mesh);glows[part].push(mat);}return mesh;}
  function label(parent:T.Object3D,text:string,w:number,h:number,x:number,y:number,z:number,color='#c1e5ec',background='#14242c'){
   const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;const ctx=canvas.getContext('2d')!;ctx.fillStyle=background;ctx.fillRect(0,0,1024,128);ctx.fillStyle=color;ctx.font='600 58px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,66);
   const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;const geo=new T.PlaneGeometry(w,h),mat=new T.MeshBasicMaterial({map:tex,side:T.DoubleSide});resources.push(tex,geo,mat);const mesh=new T.Mesh(geo,mat);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }
  for(let i=0;i<6;i++){const g=new T.Group();groups.push(g);glows.push([]);root.add(g);}
  // Schematic rack appliance: enclosure, interfaces, compute, cooling, power, management.
  box(groups[0],[5.8,.16,3.5],[0,1.05,0],'#7c8b94',0);box(root,[5.8,.13,3.5],[0,-.15,0],'#33434d',0);
  for(const side of [-1,1]){box(root,[.13,.85,3.5],[side*2.85,.3,0],'#50616b',0);box(root,[.25,.7,.18],[side*3,.38,1.8],'#8f9aa0',0);}
  for(let i=0;i<19;i++)box(groups[0],[.045,.012,1.5],[-1.7+i*.17,1.14,-.4],'#354953');
  const front=groups[1];box(front,[5.55,.92,.16],[0,.4,1.76],'#263940',1);
  label(front,'F5',.65,.42,-2.25,.46,1.86,'#fff','#b82735');label(front,'BIG-IP  /  SOOVERS LAB',1.35,.19,1.72,.76,1.86);
  for(let i=0;i<8;i++){const x=-1.55+(i%4)*.6,y=i<4?.2:.63;box(front,[.46,.27,.16],[x,y,1.91],'#080f16',1);box(front,[.35,.025,.1],[x,y-.1,2.01],'#aebdbe');box(front,[.06,.035,.03],[x+.16,y+.07,2.02],i%3?'#45d7ba':'#d5b66a');}
  for(let i=0;i<2;i++){box(front,[.62,.36,.18],[1.2+i*.8,.29,1.92],'#080f16',1);box(front,[.48,.025,.1],[1.2+i*.8,.17,2.02],'#b5c4c6');}
  const compute=groups[2];box(compute,[4.9,.1,2.8],[0,.04,0],'#1f665c',2);
  for(let c=0;c<2;c++){box(compute,[.85,.25,.85],[-.75+c*1.5,.24,-.1],'#243439',2);for(let k=0;k<8;k++)box(compute,[.07,.22,.84],[-1.08+c*1.5+k*.095,.45,-.1],'#9aaeb2',2);}
  for(let i=0;i<5;i++)box(compute,[.11,.26,1.15],[1.35+i*.18,.22,-.2],'#182f39',2);
  for(let i=0;i<12;i++){box(compute,[.17,.04,.12],[-2.2+i*.35,.12,1],'#c9a66c');box(compute,[.02,.015,.5],[-2.2+i*.35,.103,.64],'#68a08a');}
  const cooling=groups[3];for(let i=0;i<3;i++){const x=-1.6+i*1.1;box(cooling,[.92,.72,.65],[x,.42,-1.17],'#3b4f59',3);const geo=new T.CylinderGeometry(.29,.29,.09,24),mat=new T.MeshStandardMaterial({color:'#16262f',metalness:.5,roughness:.4});resources.push(geo,mat);const fan=new T.Mesh(geo,mat);fan.rotation.x=Math.PI/2;fan.position.set(x,.42,-.8);fan.userData.part=3;targets.push(fan);cooling.add(fan);for(let j=0;j<3;j++){const fin=box(cooling,[.45,.05,.07],[x,.42,-.74],'#88a3a9',3);fin.rotation.z=j*Math.PI/3;}}
  for(let i=0;i<2;i++){box(groups[4],[.68,.7,1.45],[2.05,.38,-.82+i*.02],'#667982',4);if(i===1)groups[4].children[groups[4].children.length-1].position.x=1.28;}
  for(let i=0;i<2;i++){box(groups[4],[.36,.3,.1],[1.28+i*.77,.4,-1.59],'#121d24',4);box(groups[4],[.08,.06,.06],[1.55+i*.77,.65,-1.66],'#55e9bd');}
  box(groups[5],[1.15,.2,.75],[-1.8,.35,.2],'#87999f',5);label(groups[5],'MGMT',.7,.18,-1.8,.46,.59);box(groups[5],[.45,.3,.18],[-2,.3,1.94],'#0c171c',5);
  const grid=new T.GridHelper(22,32,'#26434b','#142f38');grid.position.y=-1.45;scene.add(grid);resources.push(grid.geometry,...(Array.isArray(grid.material)?grid.material:[grid.material]));
  const ringGeo=new T.RingGeometry(4.3,4.31,100),ringMat=new T.MeshBasicMaterial({color:'#2f6b73',side:T.DoubleSide,transparent:true,opacity:.65}),ring=new T.Mesh(ringGeo,ringMat);ring.rotation.x=-Math.PI/2;ring.position.y=-1.42;scene.add(ring);resources.push(ringGeo,ringMat);
  const labels=f5Parts.map((part,i)=>{const node=document.createElement('button');node.className='f5-hotspot';node.textContent=String(i+1).padStart(2,'0');node.setAttribute('aria-label','انتخاب '+part.name);node.onclick=()=>live.current.onSelect(i);host.appendChild(node);return node;});
  const offsets=[new T.Vector3(-2.4,1.2,0),new T.Vector3(.2,.4,2.05),new T.Vector3(0,.55,0),new T.Vector3(-1.8,.7,-1.2),new T.Vector3(1.8,.8,-1.2),new T.Vector3(-1.8,.6,.35)];
  const exploded=[new T.Vector3(0,2.2,-.3),new T.Vector3(0,-.05,1.3),new T.Vector3(0,.75,0),new T.Vector3(-.4,1.2,-1.2),new T.Vector3(1.5,.65,-.3),new T.Vector3(-1.3,.65,.4)];
  const observer=new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();});observer.observe(host);
  let down={x:0,y:0};const pointerDown=(e:PointerEvent)=>{down={x:e.clientX,y:e.clientY};};const pointerUp=(e:PointerEvent)=>{if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)return;const r=renderer.domElement.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hit=ray.intersectObjects(targets)[0];if(hit)live.current.onSelect(hit.object.userData.part);};
  renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointerup',pointerUp);
  const contextLost=(e:Event)=>{e.preventDefault();setError(true);};renderer.domElement.addEventListener('webglcontextlost',contextLost);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let start=performance.now(),lastReset=reset;
  renderer.setAnimationLoop(()=>{if(document.hidden)return;const s=live.current;if(lastReset!==s.reset){camera.position.set(7.8,6.5,10.5);controls.target.set(0,.7,0);lastReset=s.reset;}
   const entrance=reduced.matches?1:Math.min((performance.now()-start)/1200,1);root.scale.setScalar(.65+.35*(1-Math.pow(1-entrance,3)));root.position.y=(1-entrance)*-2;
   groups.forEach((g,i)=>{const goal=s.expanded?exploded[i]:new T.Vector3();g.position.lerp(goal,reduced.matches?1:.095);glows[i].forEach(m=>{m.emissive.set(i===s.selected?'#176f68':'#000000');m.emissiveIntensity=.28;});});
   controls.autoRotate=s.rotate&&!reduced.matches;controls.update();scene.updateMatrixWorld();
   labels.forEach((node,i)=>{const pos=groups[i].localToWorld(offsets[i].clone()).project(camera);node.style.left=`${(pos.x*.5+.5)*host.clientWidth}px`;node.style.top=`${(-pos.y*.5+.5)*host.clientHeight}px`;node.hidden=pos.z>1;node.classList.toggle('active',i===s.selected);node.setAttribute('aria-pressed',String(i===s.selected));});renderer.render(scene,camera);
  });
  return()=>{renderer.setAnimationLoop(null);observer.disconnect();controls.dispose();renderer.domElement.removeEventListener('webglcontextlost',contextLost);renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);labels.forEach(n=>n.remove());resources.forEach(r=>r.dispose());renderer.dispose();renderer.domElement.remove();};
 },[]);
 return <div ref={mount} className="f5-render" aria-label="مدل سه‌بعدی تعاملی F5؛ اجزا با دکمه‌های شماره‌دار انتخاب می‌شوند">{error&&<div className="f5-render-fallback" role="status">نمای سه‌بعدی در دسترس نیست. معرفی کامل اجزا و تمام تمرین‌ها از فهرست زیر قابل استفاده‌اند.</div>}</div>;
}
