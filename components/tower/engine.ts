import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {SpatialCampus,type CampusAction} from '@/components/education/SpatialCampus';
import {moveWithCollision,canEnter,type DemoRole,type CampusSpace} from '@/lib/education/model';
import {floors} from '@/lib/tower-data';
import {SooVersMotion} from '@/lib/soovers-motion';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

type Callbacks={onFloor:(n:number)=>void;onRoom:(n:number)=>void;onWalk:(v:boolean)=>void;onError:(s:string)=>void;onCampus?:(space:CampusSpace|null)=>void;onAction?:(action:CampusAction)=>void;onTarget?:(label:string)=>void;onTransition?:(active:boolean)=>void};
export class TowerEngine {
 renderer:T.WebGLRenderer;scene=new T.Scene();camera=new T.PerspectiveCamera(42,1,.08,800);controls:OrbitControls;
 exterior=new T.Group();interior=new T.Group();rig=new T.Group();floorGroups:T.Group[]=[];selectables:T.Object3D[]=[];interactables:T.Object3D[]=[];colliders:T.Box3[]=[];
 selected=0;inside=false;walking=false;autoRotate=true;keys=new Set<string>();ray=new T.Raycaster();pointer=new T.Vector2();
 demoRole:DemoRole='visitor';campus:SpatialCampus|null=null;private campusBlocked=false;private campusTarget='';private transit:{space:CampusSpace;time:number;swapped:boolean;from:T.Vector3}|null=null;private pointerStart={x:0,y:0};
 motion=new SooVersMotion(typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches);
 private crown=new T.Group();private frame=new T.Group();private aura=new T.Group();private scan!:T.Mesh;private particleMaterial!:T.ShaderMaterial;private composer!:EffectComposer;private bloom!:UnrealBloomPass;private bloomEnabled=true;private hover=-1;private hoverLevel=new Array<number>(8).fill(0);private floorGlow:T.MeshStandardMaterial[]=[];private envTarget:T.WebGLRenderTarget|null=null;
 private geometries=new Map<string,T.BufferGeometry>(); private materials=new Map<string,T.Material>();private textures:T.Texture[]=[];private resize:ResizeObserver;private last=0;private start=performance.now();private disposed=false;private down={x:0,y:0};private drag=false;private callbacks:Callbacks;private host:HTMLElement;private targetCamera:T.Vector3|null=null;private targetLook:T.Vector3|null=null;private marker:T.Mesh;private xrSnap=false;private xrSelect=false;private eventCleanups:(()=>void)[]=[];
 constructor(host:HTMLElement,cb:Callbacks){
  this.host=host;this.callbacks=cb;
  this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.setClearColor(0x030609);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.82;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.xr.enabled=true;host.appendChild(this.renderer.domElement);
  this.scene.fog=new T.FogExp2(0x030609,.003);this.scene.add(this.exterior,this.interior,this.rig);this.rig.add(this.camera);this.interior.visible=false;
  const pmrem=new T.PMREMGenerator(this.renderer);const env=new RoomEnvironment();const tex=pmrem.fromScene(env,.05);this.scene.environment=tex.texture;this.scene.environmentIntensity=.28;this.envTarget=tex;env.dispose();pmrem.dispose();
  this.scene.add(new T.HemisphereLight(0xaedfff,0x151b28,1.35));const sun=new T.DirectionalLight(0xc7e9ff,1.7);sun.position.set(18,60,30);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-35;sun.shadow.camera.right=35;sun.shadow.camera.top=50;sun.shadow.camera.bottom=-35;sun.shadow.camera.far=150;sun.shadow.normalBias=.05;this.scene.add(sun);const rim=new T.DirectionalLight(0x00baba,.8);rim.position.set(-20,20,-30);this.scene.add(rim);
  this.camera.position.set(49,31,59);this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(0,20,0);this.controls.enableDamping=true;this.controls.dampingFactor=.06;this.controls.minDistance=26;this.controls.maxDistance=115;this.controls.maxPolarAngle=Math.PI*.48;this.controls.autoRotate=!this.motion.cinematic&&this.motion.playing;this.controls.autoRotateSpeed=.45;this.controls.enablePan=false;
  this.buildExterior();
  this.composer=new EffectComposer(this.renderer);this.composer.addPass(new RenderPass(this.scene,this.camera));this.bloom=new UnrealBloomPass(new T.Vector2(1,1),.10,.4,1.5);this.composer.addPass(this.bloom);this.composer.addPass(new OutputPass());
  this.listen(this.renderer.domElement,'wheel',()=>{this.motion.interrupt();this.targetCamera=null;this.targetLook=null;});this.listen(this.renderer.domElement,'pointercancel',()=>{this.drag=false;});this.listen(this.renderer.domElement,'pointerleave',()=>{this.hover=-1;});
  this.listen(this.renderer.domElement,'webglcontextlost',(event)=>{event.preventDefault();this.callbacks.onError('ارتباط با پردازندهٔ گرافیکی قطع شد. صفحه را دوباره بارگذاری کنید.');});
  this.listen(document,'visibilitychange',()=>{this.last=0;});
  const preference=matchMedia('(prefers-reduced-motion: reduce)');const preferenceChange=()=>{this.motion.setReduced(preference.matches);};preference.addEventListener('change',preferenceChange);this.eventCleanups.push(()=>preference.removeEventListener('change',preferenceChange));
  this.marker=new T.Mesh(new T.RingGeometry(.18,.23,32),new T.MeshBasicMaterial({color:0x47edcc,side:T.DoubleSide}));this.marker.rotation.x=-Math.PI/2;this.marker.visible=false;this.scene.add(this.marker);
  this.resize=new ResizeObserver(()=>this.size());this.resize.observe(host);this.size();this.listen(window,'keydown',this.keydown);this.listen(window,'keyup',this.keyup);this.listen(document,'pointerlockchange',this.lockchange);this.listen(window,'blur',()=>this.keys.clear());this.listen(document,'mousemove',this.mousemove);this.listen(this.renderer.domElement,'pointerdown',this.pointerdown);this.listen(this.renderer.domElement,'pointerup',this.pointerup);this.listen(this.renderer.domElement,'pointermove',this.pointermove);
  this.renderer.xr.addEventListener('sessionend',()=>{this.rig.position.set(0,0,0);this.camera.position.set(0,1.7,7);this.controls.target.set(0,1.7,-4);this.controls.enabled=true;this.walking=false;this.callbacks.onWalk(false);this.setFloor(this.selected,true);});
  for(let i=0;i<2;i++){const c=this.renderer.xr.getController(i);const line=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(0,0,0),new T.Vector3(0,0,-1)]),new T.LineBasicMaterial({color:0x5ae7dc}));line.scale.z=12;c.add(line);c.addEventListener('select',()=>{this.xrSelect=true;this.xrRay(c,true);});this.rig.add(c);}
  this.renderer.setAnimationLoop(this.animate);
 }
 private listen(target:EventTarget,type:string,fn:EventListener){target.addEventListener(type,fn);this.eventCleanups.push(()=>target.removeEventListener(type,fn));}
 private geo(key:string,create:()=>T.BufferGeometry){if(!this.geometries.has(key))this.geometries.set(key,create());return this.geometries.get(key)!;}
 private mat(color:string,metal=.2,rough=.5,glow=false,opacity=1){const key=`${color}/${metal}/${rough}/${glow}/${opacity}`;if(!this.materials.has(key))this.materials.set(key,new T.MeshStandardMaterial({color,metalness:Math.min(metal,.48),roughness:Math.max(rough,.52),emissive:glow?color:0x000000,emissiveIntensity:glow?.32:0,transparent:opacity<1,opacity,depthWrite:opacity===1,side:opacity<1?T.DoubleSide:T.FrontSide}));return this.materials.get(key)!;}
 private box(g:T.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,color:string,metal=.3,rough=.5,glow=false,opacity=1){const m=new T.Mesh(this.geo('box',()=>new T.BoxGeometry(1,1,1)),this.mat(color,metal,rough,glow,opacity));m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=opacity===1;m.receiveShadow=true;g.add(m);return m;}
 private cylinder(g:T.Object3D,r:number,h:number,x:number,y:number,z:number,color:string){const m=new T.Mesh(this.geo('cylinder',()=>new T.CylinderGeometry(1,1,1,48)),this.mat(color,.5,.5));m.scale.set(r,h,r);m.position.set(x,y,z);m.receiveShadow=true;m.castShadow=true;g.add(m);return m;}
 private label(g:T.Object3D,text:string,x:number,y:number,z:number,w=4,color='#70e6dd',size=50){const c=document.createElement('canvas');c.width=1024;c.height=256;const cx=c.getContext('2d')!;cx.fillStyle='#07131eee';cx.fillRect(0,0,c.width,c.height);cx.strokeStyle=color;cx.lineWidth=4;cx.strokeRect(4,4,1016,248);cx.fillStyle=color;cx.textAlign='center';cx.textBaseline='middle';cx.font=`500 ${size}px Arial`;cx.fillText(text,512,128,950);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;this.textures.push(tex);const m=new T.Mesh(new T.PlaneGeometry(w,w/4),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));m.position.set(x,y,z);g.add(m);return m;}
 private desk(g:T.Object3D,x:number,z:number,accent='#54cece',screen=true,rotate=0){const a=new T.Group();a.position.set(x,0,z);a.rotation.y=rotate;g.add(a);this.box(a,2.3,.12,1.1,0,.82,0,'#405465',.7,.3);for(const xx of [-.94,.94])this.box(a,.07,.8,.8,xx,.4,0,'#1c2b37',.7);this.box(a,1.9,.025,.015,0,.87,.54,accent,0,.3,true);if(screen){this.box(a,.08,.35,.08,0,1.04,-.22,'#121e26');this.box(a,1.25,.75,.07,0,1.48,-.3,'#07121a');this.screen(a,1.16,.65,0,1.48,-.255,accent);this.box(a,.75,.04,.25,-.15,.91,.17,'#142731');}this.chair(a,0,1.05);}
 private chair(g:T.Object3D,x:number,z:number){this.box(g,.65,.16,.65,x,.5,z,'#213340');this.box(g,.65,.7,.15,x,.87,z+.3,'#2c424f');this.cylinder(g,.045,.45,x,.24,z,'#465765');this.box(g,.6,.05,.6,x,.08,z,'#172633');}
 private screen(g:T.Object3D,w:number,h:number,x:number,y:number,z:number,color:string,large=false){const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d')!;ctx.fillStyle='#071b26';ctx.fillRect(0,0,512,256);ctx.fillStyle=color;ctx.font='18px monospace';ctx.fillText(large?'SOC / TRAINING DISPLAY':'SOOVERS / WORKSTATION',20,30);ctx.fillStyle='#34616f';ctx.fillRect(20,44,472,2);for(let i=0;i<12;i++){ctx.fillStyle=i%3?color:'#547483';ctx.globalAlpha=.4+i%4*.12;ctx.fillRect(22,64+i*12,35+(i*97)%350,4);}ctx.globalAlpha=1;ctx.fillStyle='#b7c7ca';ctx.font='14px monospace';ctx.fillText('SPATIAL PROTOTYPE - NO LIVE DATA',20,240);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;this.textures.push(tex);const mesh=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex}));mesh.position.set(x,y,z);g.add(mesh);return mesh;}
 private plant(g:T.Object3D,x:number,z:number,scale=1){const a=new T.Group();a.position.set(x,0,z);a.scale.setScalar(scale);g.add(a);this.cylinder(a,.35,.5,0,.25,0,'#263e46');this.cylinder(a,.04,1.3,0,1,0,'#604f3e');for(let j=0;j<3;j++){const m=new T.Mesh(this.geo('leaf',()=>new T.IcosahedronGeometry(1,2)),this.mat('#32726a',.05,.9));m.scale.set(.47,.7,.45);m.position.set(Math.sin(j*2)*.22,1.35+j*.2,Math.cos(j*2)*.22);a.add(m);}}
 private buildExterior(){
  const g=this.exterior;
  // An isolated architectural object: brushed titanium, smoked glass, soft ivory light.
  this.cylinder(g,16,.32,0,-.2,0,'#101a22');this.cylinder(g,13.8,.24,0,.08,0,'#26343e');this.cylinder(g,11.8,.18,0,.3,0,'#3d4d58');
  const plinthRing=new T.Mesh(new T.TorusGeometry(13.8,.022,6,160),this.mat('#a5d5ce',0,.2,true));plinthRing.rotation.x=Math.PI/2;plinthRing.position.y=.22;g.add(plinthRing);
  const slabGeometry=this.geo('rounded-slab',()=>new RoundedBoxGeometry(1,1,1,3,.07));
  for(let f=0;f<8;f++){
   const a=new T.Group();a.position.y=1.1+f*4.8;a.rotation.y=f*.026;a.userData.baseY=a.position.y;a.userData.baseRotation=a.rotation.y;g.add(a);this.floorGroups.push(a);
   const w=15.4-f*.55,d=11.8-f*.26;
   const slab=new T.Mesh(slabGeometry,this.mat('#81929d',.88,.24));slab.scale.set(w+.55,.32,d+.55);slab.receiveShadow=true;slab.castShadow=true;a.add(slab);
   const trimMaterial=new T.MeshStandardMaterial({color:'#8fc4be',emissive:'#a1dad0',emissiveIntensity:.18,metalness:.28,roughness:.65});this.floorGlow.push(trimMaterial);
   const trim=new T.Mesh(slabGeometry,trimMaterial);trim.scale.set(w+.57,.035,d+.57);trim.position.y=.18;a.add(trim);
   this.box(a,w,.13,d,0,4.52,0,'#304652',.85,.25);
   const faces=[this.box(a,w,4.25,.035,0,2.3,d/2,'#8facb8',.65,.12,false,.25),this.box(a,.035,4.25,d,-w/2,2.3,0,'#799aa7',.65,.12,false,.23),this.box(a,.035,4.25,d,w/2,2.3,0,'#799aa7',.65,.12,false,.23),this.box(a,w,4.25,.035,0,2.3,-d/2,'#4e6c7b',.75,.13,false,.4)];
   for(const face of faces){face.userData.floor=f;this.selectables.push(face);}
   for(let x=-w/2;x<=w/2+.01;x+=w/10){this.box(a,.048,4.25,.1,x,2.3,d/2+.02,'#becbd1',.9,.27);this.box(a,.045,4.25,.1,x,2.3,-d/2-.02,'#8eabb8',.9,.3);}
   for(const x of [-w/2,w/2])for(let z=-d/2;z<=d/2+.01;z+=d/6)this.box(a,.1,4.25,.047,x,2.3,z,'#93abb6',.88,.25);
   this.box(a,w-1,.018,.045,0,4.4,d/2-.6,'#d2c6a7',0,.2,true);
   for(const x of [-w*.27,w*.27])for(const z of [-d*.22,d*.22])this.desk(a,x,z,'#86b9b4',true);
   for(const x of [-w*.28,w*.28])this.box(a,2,.02,.18,x,4.35,-d*.2,'#acc9c6',0,.2,true);
   // A compact internal circulation core remains concealed in the first view.
   this.box(a,2.2,4.4,2.2,0,2.3,-d/2+1.25,'#172b37',.85,.22);
  }
  g.add(this.frame);
  for(let k=0;k<4;k++){
   const path=[];for(let j=0;j<=32;j++){const y=1.1+j/32*38.2,f=j/32*7,w=15.4-f*.55,d=11.8-f*.26,angle=f*.026;const x=(k<2?-1:1)*(w/2+.35),z=(k%2?-1:1)*(d/2+.32);path.push(new T.Vector3(x*Math.cos(angle)+z*Math.sin(angle),y,-x*Math.sin(angle)+z*Math.cos(angle)));}
   this.frame.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(path),48,.095,6,false),this.mat('#bdcbd2',.95,.2)));
  }
  g.add(this.crown);this.crown.position.y=39.8;
  this.box(this.crown,12.25,.25,9.7,0,0,0,'#9cabb6',.9,.22);
  for(let x=-5.8;x<=5.8;x+=.58)this.box(this.crown,.048,.24,9.4,x,.3,0,'#aabec8',.9,.3);
  this.box(this.crown,6.2,.85,3.1,0,.7,-1,'#344e5d',.85,.2);
  const crownLine=new T.Mesh(new T.TorusGeometry(3.1,.025,6,100),this.mat('#c1e6db',0,.2,true));crownLine.rotation.x=Math.PI/2;crownLine.position.y=1.25;this.crown.add(crownLine);
  this.box(g,4.2,.12,2.5,0,3.8,7,'#788d98',.85,.22);this.box(g,3.2,2.6,.04,0,2.2,6,'#90b8c5',.7,.12,false,.25);
  const ground=new T.Mesh(new T.PlaneGeometry(650,650),this.mat('#04090e',.65,.22));ground.rotation.x=-Math.PI/2;ground.position.y=-.4;ground.receiveShadow=true;g.add(ground);
  g.add(this.aura);
  this.scan=new T.Mesh(new T.TorusGeometry(11,.012,5,140),this.mat('#7aaea8',0,.2,true));this.scan.rotation.x=Math.PI/2;this.scan.scale.set(1,.77,1);this.aura.add(this.scan);
  const positions:number[]=[],seeds:number[]=[];
  // Deterministic motes coalesce around the tower's outline, with no external assets.
  for(let i=0;i<2400;i++){
   const seed=((i*16807)%2147483647)/2147483647,side=i%4,y=(i*.61803398875%1)*39,f=y/39*7,w=(15.4-f*.55)/2+.5,d=(11.8-f*.26)/2+.5,t=(i*.754877666%1)*2-1;
   let x=side<2?(side===0?-w:w):t*w,z=side<2?t*d:(side===2?-d:d);const angle=f*.026;
   positions.push(x*Math.cos(angle)+z*Math.sin(angle),y+1.1,-x*Math.sin(angle)+z*Math.cos(angle));seeds.push(seed+(i%97)/97);
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('aSeed',new T.Float32BufferAttribute(seeds,1));
  this.particleMaterial=new T.ShaderMaterial({uniforms:{uTime:{value:0},uReveal:{value:0},uPixelRatio:{value:this.renderer.getPixelRatio()},uExpand:{value:0}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
   vertexShader:`attribute float aSeed;uniform float uTime;uniform float uReveal;uniform float uPixelRatio;uniform float uExpand;varying float vAlpha;varying float vWarm;
    void main(){float seed=aSeed*37.0;float gather=1.0-smoothstep(0.0,1.0,uReveal);vec3 p=position;p.y+=floor(p.y/4.8)*uExpand*1.65;p+=vec3(sin(seed+uTime*.16)*28.0,cos(seed*1.7)*18.0,cos(seed+uTime*.13)*28.0)*gather;p.x+=sin(uTime*.28+seed)*.08;p.z+=cos(uTime*.2+seed)*.08;vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=clamp((65.0/-mv.z)*uPixelRatio,1.0,3.0);vAlpha=(.24+.55*gather)*(.5+.5*sin(seed+uTime*.7));vWarm=step(.75,fract(seed));}`,
   fragmentShader:`varying float vAlpha;varying float vWarm;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;vec3 c=mix(vec3(.48,.8,.78),vec3(.98,.86,.61),vWarm);gl_FragColor=vec4(c,vAlpha*pow(1.0-d*2.0,2.0));}`});
  const motes=new T.Points(geo,this.particleMaterial);motes.frustumCulled=false;this.aura.add(motes);
 }
 private buildInterior(){
  this.interactables=[];this.colliders=[];const g=this.interior;const sharedGeo=new Set(this.geometries.values()),sharedMat=new Set(this.materials.values());g.traverse(o=>{if(o instanceof T.Mesh){if(!sharedGeo.has(o.geometry))o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){if(!sharedMat.has(m)){const t=(m as T.MeshBasicMaterial).map;if(t){t.dispose();this.textures=this.textures.filter(v=>v!==t);}m.dispose();}}}});while(g.children.length)g.remove(g.children[0]);const f=floors[this.selected];this.box(g,25,.3,20,0,-.18,0,'#354851',.65,.3);this.box(g,25,.1,20,0,-.02,0,'#2d414b',.35,.35);
  for(let x=-12;x<=12;x+=2)this.box(g,.012,.008,20,x,.04,0,'#566774');for(let z=-10;z<=10;z+=2)this.box(g,25,.008,.012,0,.04,z,'#566774');
  for(const x of [-12.5,12.5]){this.box(g,.15,4.7,20,x,2.3,0,'#82c1d4',.8,.12,false,.16);for(let z=-10;z<=10;z+=4)this.box(g,.16,4.7,.15,x,2.3,z,'#8496a4',.8,.3);}
  this.box(g,25,4.7,.18,0,2.3,-10,'#183440',.6,.6);this.box(g,25,.07,.1,0,4.55,-9.86,f.color,0,.3,true);this.label(g,f.en,0,3.65,-9.86,8,f.color,52);
  for(const x of [-4.1,4.1]){this.box(g,.07,2.9,10,x,1.5,-4.8,'#6aafc2',.5,.1,false,.18);this.box(g,.12,.045,10,x,2.96,-4.8,f.color,0,.2,true);}
  const roomNames=f.rooms.map((r,i)=>this.selected===0?['WELCOME DESK','COMMUNITY','ELEVATOR'][i]:this.selected===1?['CLASSROOM','WORKSHOP','INSTRUCTOR'][i]:this.selected===2?['COLLECTION','READING ROOM','NOTEBOOKLM'][i]:r);
  for(let k=0;k<3;k++){const x=(k-1)*8;this.label(g,roomNames[k],x,2.85,-9.7,6.7,f.color,48);const h=this.cylinder(g,.7,.025,x,.08,3,f.color);h.userData.room=k;this.interactables.push(h);const beam=this.box(g,4,.02,.04,x,.07,1,f.color,0,.3,true);beam.userData.room=k;this.interactables.push(beam);this.label(g,`0${k+1}`,x,1.4,2.8,1.15,f.color,115);}
  if(f.kind==='lobby'){
   this.box(g,5,1.05,1.2,-8,.53,-4,'#71838a',.7,.3);this.box(g,4.5,.04,.04,-8,.85,-3.37,f.color,0,.2,true);this.label(g,'WELCOME TO SOOVERS',-8,2,-7,5,f.color);this.cylinder(g,2,.16,0,.6,-4,'#536e79');this.chair(g,-2,-3);this.chair(g,2,-3);this.plant(g,0,-7,2);this.box(g,3,3.5,.18,8,1.75,-5,'#8599a0',.8,.2);this.label(g,'SELECT A FLOOR',8,2,-4.85,2.8,f.color);}
  else if(f.kind==='library'){
   for(const x of [-10,-6]){this.box(g,2.8,2.9,.6,x,1.5,-5,'#5c6057',.3,.6);for(let row=0;row<4;row++){this.box(g,2.9,.06,.65,x,.4+row*.68,-4.98,'#a89574');for(let b=0;b<10;b++)this.box(g,.18,.48,.33,x-1.25+b*.25,.66+row*.68,-4.61,['#58a2a0','#b89060','#6378a3','#876e9a'][b%4]);}}
   this.desk(g,0,-3,f.color,false);this.desk(g,0,-6,f.color,false);this.desk(g,8,-4,f.color,true);this.plant(g,11,-8,1.4);}
  else if(f.kind==='classroom'){
   for(let row=0;row<3;row++)for(let col=0;col<2;col++)this.desk(g,-10+col*3.6,-5+row*2.5,f.color,false);this.screen(g,5,2.5,-8,2.5,-9.7,f.color,true);for(const z of [-5,-2])this.desk(g,0,z,f.color,true);this.desk(g,8,-4,f.color,true,Math.PI);this.screen(g,4,2,8,2.6,-9.7,f.color);}
  else if(f.kind==='faculty'){
   this.desk(g,-8,-4,f.color,true);this.cylinder(g,2.3,.14,0,.82,-4,'#5c6c76');for(const x of [-1.8,1.8])for(const z of [-2.6,-5.4])this.chair(g,x,z);this.box(g,5,.4,1.4,8,.5,-5,'#4b5f73');this.box(g,5,1,.25,8,.9,-5.7,'#4b5f73');this.cylinder(g,1,.12,8,.45,-2.5,'#78919b');this.plant(g,10,-8,1.6);}
  else{
   for(let k=0;k<3;k++){const x=(k-1)*8;const c=f.kind==='range'?['#e56d7b','#65b7fc','#cc91e3'][k]:f.color;for(const z of [-4,0])this.desk(g,x,z,c,true);if(f.kind==='network'||(f.kind==='forensics'&&k===1)){for(const dx of [-1.2,1.2]){this.box(g,1.4,2.6,1.2,x+dx,1.3,-8,'#112632',.75,.3);for(let r=0;r<8;r++){this.box(g,1.25,.2,.03,x+dx,.2+r*.3,-7.38,'#344d5b');this.box(g,.045,.045,.03,x+dx+.48,.22+r*.3,-7.35,c,0,.3,true);}}}else this.screen(g,6,2.6,x,2.5,-9.8,c,true);}
  }
  for(const x of [-11,11])this.plant(g,x,7,1.3);
  // A clear central circulation zone connects all rooms to the lift.
  this.box(g,3,.025,3,0,.05,7.5,'#1f6b70');this.label(g,'CENTRAL LIFT',0,1.3,8.5,3,f.color,65);
  const lift=this.box(g,3,2.8,.06,0,1.4,9.7,'#425c67',.8,.2);lift.userData.lift=true;this.interactables.push(lift);
  const floor=this.box(g,24,.01,19,0,.05,0,'#354851',.2,.4,false,0);floor.userData.ground=true;this.interactables.push(floor);
 }
 enterCampus(space:CampusSpace){
  if(this.transit)return;if(!canEnter(space,this.demoRole)){this.callbacks.onAction?.({id:'guide',label:'دریافت کارت ورود آموزشی'});return;}this.motion.enter();this.hover=space==='reception'?0:1;this.selected=space==='reception'?0:1;this.setWalking(false);this.controls.enabled=false;this.targetCamera=null;this.targetLook=null;this.transit={space,time:0,swapped:false,from:this.camera.position.clone()};this.callbacks.onTransition?.(true);
  // Reduced motion should not wait for another expensive WebGL frame to unlock the UI.
  if(this.motion.reduced){this.swapCampus(space);this.transit=null;this.walking=true;this.callbacks.onWalk(true);this.callbacks.onTransition?.(false);}
 }
 private swapCampus(space:CampusSpace){
  this.campus?.dispose();this.campus=new SpatialCampus(space);this.scene.add(this.campus.group);this.exterior.visible=false;this.interior.visible=false;this.inside=true;this.scene.fog=null;this.renderer.setClearColor(0x09141d);this.rig.position.set(0,0,0);this.camera.position.copy(this.campus.spawn);this.camera.rotation.order='YXZ';this.camera.lookAt(this.campus.look);this.controls.enabled=false;this.controls.autoRotate=false;this.callbacks.onCampus?.(space);this.campusBlocked=false;this.campusTarget='';
 }
 leaveCampus(){this.transit=null;this.campus?.dispose();this.campus=null;this.campusBlocked=false;this.callbacks.onTransition?.(false);this.callbacks.onCampus?.(null);this.callbacks.onTarget?.('');}
 blockCampus(v:boolean){this.campusBlocked=v;this.keys.clear();this.drag=false;if(v&&document.pointerLockElement===this.renderer.domElement)document.exitPointerLock();}
 campusInteract(){if(!this.campus||this.campusBlocked||this.transit)return;this.ray.setFromCamera(new T.Vector2(0,0),this.camera);const hit=this.ray.intersectObjects(this.campus.targets)[0];if(hit&&hit.distance<18)this.callbacks.onAction?.(hit.object.userData.action);}
 seatInClass(){if(this.campus?.space!=='classroom')return;this.camera.position.set(5,1.35,4.1);this.camera.lookAt(0,2.9,-12);}
 resetCampusView(){if(!this.campus)return;this.camera.position.copy(this.campus.spawn);this.camera.lookAt(this.campus.look);}
 setFloor(n:number,inside=this.inside){if(inside&&n>=6&&this.demoRole!=='administrator'){this.enterCampus('education');return;}if(inside&&n>0&&this.demoRole==='visitor'){this.enterCampus('reception');return;}this.leaveCampus();this.motion.enter();this.selected=n;this.inside=inside;this.setWalking(false);this.rig.position.set(0,0,0);this.exterior.visible=!inside;this.interior.visible=inside;this.scene.fog=inside?null:new T.FogExp2(0x030609,.003);this.renderer.setClearColor(inside?0x0a1c2a:0x030609);if(inside){this.buildInterior();this.controls.minDistance=4;this.controls.maxDistance=40;this.controls.maxPolarAngle=Math.PI*.49;this.controls.autoRotate=false;this.targetCamera=new T.Vector3(19,18,24);this.targetLook=new T.Vector3(0,0,-1);}else{this.controls.minDistance=26;this.controls.maxDistance=115;this.controls.autoRotate=this.autoRotate;this.targetCamera=this.exteriorCamera();this.targetLook=new T.Vector3(0,20,0);} }
 focusRoom(n:number){if(!this.inside)this.setFloor(this.selected,true);this.setWalking(false);const x=(n-1)*8;this.targetCamera=new T.Vector3(x+3,7,7);this.targetLook=new T.Vector3(x,1.1,-3);}
 setWalking(v:boolean){this.walking=v;this.keys.clear();this.callbacks.onWalk(v);this.controls.enabled=!v;this.targetCamera=null;this.targetLook=null;if(v){this.camera.position.set(0,1.7,7);this.camera.lookAt(0,1.7,-5);this.camera.rotation.order='YXZ';try{this.renderer.domElement.requestPointerLock()?.catch(()=>{});}catch{}}else if(document.pointerLockElement===this.renderer.domElement)document.exitPointerLock();}
 setKey(key:string,v:boolean){v?this.keys.add(key):this.keys.delete(key);}
 zoom(n:number){if(this.walking)return;this.motion.interrupt();this.targetCamera=null;this.targetLook=null;const v=this.camera.position.clone().sub(this.controls.target);v.multiplyScalar(n);this.camera.position.copy(this.controls.target).add(v);}
 rotate(v:boolean){this.autoRotate=v;this.motion.playing=v;this.motion.interrupt();this.controls.autoRotate=v&&!this.inside;}
 setMotion(v:boolean){this.motion.playing=v;this.autoRotate=v;}
 expand(v:boolean){this.motion.expandTarget=v;this.motion.elapsed=9;this.motion.interrupt();}
 replay(){if(!this.motion.showcase)return;this.motion.replay();this.targetCamera=null;this.targetLook=null;if(this.motion.reduced){this.camera.position.copy(this.exteriorCamera());this.controls.target.set(0,20,0);}}
 showcase(){this.setFloor(this.selected,false);this.motion.returnToTower();this.hover=-1;this.hoverLevel.fill(0);this.controls.autoRotate=this.motion.playing;}
 private exteriorCamera(){const factor=this.camera.aspect<.8?1.3:1;return new T.Vector3(46*factor,31,57*factor);}
 quality(v:string){this.renderer.setPixelRatio(Math.min(devicePixelRatio,v==='high'?2:v==='low'?1:1.5));this.renderer.shadowMap.enabled=v!=='low';this.bloomEnabled=v!=='low';this.size();}
 async enterVR(){const xr=(navigator as Navigator &{xr?:XRSystem}).xr;if(!xr||!await xr.isSessionSupported('immersive-vr'))throw Error('هدست یا مرورگر سازگار با WebXR پیدا نشد.');if(!this.inside)this.setFloor(this.selected,true);this.targetCamera=null;this.targetLook=null;this.controls.enabled=false;this.rig.position.set(0,0,7);this.camera.position.set(0,0,0);this.camera.rotation.set(0,0,0);const session=await xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});await this.renderer.xr.setSession(session);}
 private xrRay(c:T.Object3D,select=false){const rot=new T.Matrix4().extractRotation(c.matrixWorld);this.ray.ray.origin.setFromMatrixPosition(c.matrixWorld);this.ray.ray.direction.set(0,0,-1).applyMatrix4(rot);const hits=this.ray.intersectObjects(this.interactables);if(hits[0]){const h=hits[0];if(h.object.userData.ground){this.marker.visible=true;this.marker.position.set(h.point.x,.09,h.point.z);if(select){this.rig.position.x=T.MathUtils.clamp(h.point.x,-11.5,11.5);this.rig.position.z=T.MathUtils.clamp(h.point.z,-8.5,8.5);}}else if(select&&h.object.userData.room!==undefined){this.rig.position.set((h.object.userData.room-1)*8,0,3);}}}
 private keydown=(e:Event)=>{const k=e as KeyboardEvent;if((k.target as HTMLElement)?.matches('input,textarea,select,[contenteditable=true]'))return;if(this.campus){if(this.campusBlocked||this.transit)return;if(k.code==='KeyE'){k.preventDefault();this.campusInteract();return;}if(k.code==='Escape'){if(document.pointerLockElement)document.exitPointerLock();return;}}if(this.walking&&['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(k.code)){k.preventDefault();this.keys.add(k.code);}if(k.code==='Escape'&&this.walking){this.setWalking(false);this.setFloor(this.selected,true);}};
 private keyup=(e:Event)=>this.keys.delete((e as KeyboardEvent).code);
 private lockchange=()=>{if(!document.pointerLockElement)this.keys.clear();};
 private mousemove=(e:Event)=>{if(this.walking&&!this.campusBlocked&&document.pointerLockElement===this.renderer.domElement){const m=e as MouseEvent;this.camera.rotation.y-=m.movementX*.002;this.camera.rotation.x=T.MathUtils.clamp(this.camera.rotation.x-m.movementY*.002,-1.3,1.3);}};
 private pointerdown=(e:Event)=>{const p=e as PointerEvent;if(this.campusBlocked||this.transit)return;this.pointerStart={x:p.clientX,y:p.clientY};this.down={x:p.clientX,y:p.clientY};this.drag=true;this.motion.interrupt();this.targetCamera=null;this.targetLook=null;};
 private pointermove=(e:Event)=>{const p=e as PointerEvent;
  if(!this.inside&&!this.drag){const r=this.renderer.domElement.getBoundingClientRect();this.pointer.set((p.clientX-r.left)/r.width*2-1,-(p.clientY-r.top)/r.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);this.hover=this.ray.intersectObjects(this.selectables)[0]?.object.userData.floor??-1;}
if(this.walking&&!this.campusBlocked&&this.drag&&!document.pointerLockElement){this.camera.rotation.y-=(p.clientX-this.down.x)*.004;this.camera.rotation.x=T.MathUtils.clamp(this.camera.rotation.x-(p.clientY-this.down.y)*.004,-1.3,1.3);this.down={x:p.clientX,y:p.clientY};}};
 private pointerup=(e:Event)=>{const p=e as PointerEvent;this.drag=false;if(this.campus){if(this.campusBlocked||this.transit||Math.hypot(p.clientX-this.pointerStart.x,p.clientY-this.pointerStart.y)>8)return;const r=this.renderer.domElement.getBoundingClientRect();this.ray.setFromCamera(new T.Vector2((p.clientX-r.left)/r.width*2-1,-(p.clientY-r.top)/r.height*2+1),this.camera);const hit=this.ray.intersectObjects(this.campus.targets)[0];if(hit&&hit.distance<26)this.callbacks.onAction?.(hit.object.userData.action);return;}if(this.walking||Math.hypot(p.clientX-this.down.x,p.clientY-this.down.y)>6)return;const r=this.renderer.domElement.getBoundingClientRect();this.pointer.set((p.clientX-r.left)/r.width*2-1,-(p.clientY-r.top)/r.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);const hit=this.ray.intersectObjects(this.inside?this.interactables:this.selectables)[0];if(hit?.object.userData.floor!==undefined){if(this.motion.showcase){this.hover=hit.object.userData.floor;this.motion.elapsed=9;this.motion.interrupt();}else this.callbacks.onFloor(hit.object.userData.floor);}if(hit?.object.userData.room!==undefined)this.callbacks.onRoom(hit.object.userData.room);if(hit?.object.userData.lift){this.setFloor(this.selected,false);this.callbacks.onFloor(this.selected);}};
 private size(){const w=Math.max(1,this.host.clientWidth),h=Math.max(1,this.host.clientHeight);this.renderer.setSize(w,h);this.composer?.setPixelRatio(this.renderer.getPixelRatio());this.composer?.setSize(w,h);this.particleMaterial?.uniforms.uPixelRatio&&(this.particleMaterial.uniforms.uPixelRatio.value=this.renderer.getPixelRatio());this.camera.aspect=w/h;this.camera.updateProjectionMatrix();if(!this.inside&&this.motion?.showcase&&!this.motion.cinematic){this.targetCamera=this.exteriorCamera();this.targetLook=new T.Vector3(0,20,0);}}
 private animate=(time:number)=>{if(this.disposed||document.hidden)return;const dt=Math.min((time-this.last)/1000,.04)||.016;this.last=time;const xr=this.renderer.xr.isPresenting;
  this.motion.advance(dt);
  if(this.transit){const t=this.transit;t.time+=dt;const duration=this.motion.reduced?.05:1.65;if(!t.swapped&&!this.campus&&!this.motion.reduced){const p=Math.min(1,t.time/.78),e=p*p*(3-2*p);this.camera.position.lerpVectors(t.from,new T.Vector3(0,t.space==='reception'?4:8,23),e);this.camera.lookAt(0,t.space==='reception'?2:7,0);}if(t.time>=duration*.5&&!t.swapped){t.swapped=true;this.swapCampus(t.space);}if(t.time>=duration){this.transit=null;this.walking=true;this.callbacks.onWalk(true);this.callbacks.onTransition?.(false);}}
  if(this.campus){this.campus.update(this.motion.reduced?0:time/1000,this.motion.reduced);if(!this.campusBlocked&&!this.transit){this.ray.setFromCamera(new T.Vector2(),this.camera);const hit=this.ray.intersectObjects(this.campus.targets)[0];const label=hit&&hit.distance<18?hit.object.userData.action.label:'';if(label!==this.campusTarget){this.campusTarget=label;this.callbacks.onTarget?.(label);}}}

  if(this.motion.showcase&&!this.inside){
   const blend=this.motion.expanded,progress=Math.min(1,this.motion.elapsed/9);
   if(this.motion.cinematic){const eased=progress*progress*(3-2*progress),theta=.98-eased*.55,dist=(78-eased*8)*(this.camera.aspect<.8?1.3:1);this.camera.position.set(Math.sin(theta)*dist,34-eased*5,Math.cos(theta)*dist);this.controls.target.set(0,20,0);}
   this.controls.autoRotate=this.motion.playing&&!this.motion.cinematic&&!this.motion.reduced;
   this.frame.scale.y=1+blend*.30;this.crown.position.y=39.8+blend*12;
   const offset=blend*5;
   if(!this.motion.cinematic&&!this.drag){this.controls.target.y+=((20+offset)-this.controls.target.y)*(1-Math.exp(-dt*3));}
  }else{this.frame.scale.y=1;this.crown.position.y=39.8;}
  this.aura.visible=this.motion.showcase&&!this.inside;
  this.particleMaterial.uniforms.uTime.value=this.motion.time;this.particleMaterial.uniforms.uReveal.value=Math.min(1,this.motion.elapsed/5.4);this.particleMaterial.uniforms.uExpand.value=this.motion.expanded;
  this.scan.position.y=1.1+(this.motion.time*.85%39);this.scan.visible=!this.motion.reduced;

  if(this.targetCamera&&!xr){this.camera.position.lerp(this.targetCamera,1-Math.exp(-dt*5));this.controls.target.lerp(this.targetLook!,1-Math.exp(-dt*5));if(this.camera.position.distanceTo(this.targetCamera)<.08){this.targetCamera=null;this.targetLook=null;}}
  if(this.walking&&!xr&&!this.campusBlocked&&!this.transit){const right=(this.keys.has('KeyD')||this.keys.has('ArrowRight')?1:0)-(this.keys.has('KeyA')||this.keys.has('ArrowLeft')?1:0);const forward=(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0)-(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0);const v=new T.Vector3(right,0,forward);if(v.lengthSq()>0)v.normalize().applyAxisAngle(new T.Vector3(0,1,0),this.camera.rotation.y).multiplyScalar(dt*3.6);if(this.campus){const next=moveWithCollision(this.camera.position.x,this.camera.position.z,v.x,v.z,this.campus.obstacles);this.camera.position.set(next.x,1.72,next.z);}else{this.camera.position.add(v);this.camera.position.x=T.MathUtils.clamp(this.camera.position.x,-11.7,11.7);this.camera.position.z=T.MathUtils.clamp(this.camera.position.z,-8.8,8.8);this.camera.position.y=1.7;}}
  else if(!xr&&!this.campus&&!this.transit)this.controls.update(dt);
  if(xr){this.marker.visible=false;this.xrRay(this.renderer.xr.getController(0));const s=this.renderer.xr.getSession();for(const src of s?.inputSources??[]){const a=src.gamepad?.axes;if(a&&src.handedness==='left'){const x=a[2]??0,z=a[3]??0;if(Math.abs(x)+Math.abs(z)>.25){const direction=new T.Vector3(x,0,z).applyQuaternion(this.renderer.xr.getCamera().quaternion);direction.y=0;direction.normalize().multiplyScalar(dt*2.5);this.rig.position.add(direction);this.rig.position.x=T.MathUtils.clamp(this.rig.position.x,-11.5,11.5);this.rig.position.z=T.MathUtils.clamp(this.rig.position.z,-8.5,8.5);}}}}
  for(let i=0;i<8;i++){
   const group=this.floorGroups[i],reveal=this.motion.reveal(i);this.hoverLevel[i]+=(this.hover===i?1-this.hoverLevel[i]:-this.hoverLevel[i])*(1-Math.exp(-dt*6));
   const scale=1+this.hoverLevel[i]*.018;group.scale.set(scale,Math.max(.002,reveal),scale);group.position.y=group.userData.baseY+(1-reveal)*-3+this.motion.expanded*i*1.65;group.rotation.y=group.userData.baseRotation+(1-reveal)*.35;
   this.floorGlow[i].emissiveIntensity=.13+this.hoverLevel[i]*.45+(this.transit&&i===1?.35:0);
  }
  this.renderer.domElement.style.cursor=this.hover>=0&&!this.inside?'grab':'default';
  if(!xr&&this.bloomEnabled&&!this.inside)this.composer.render(dt);else this.renderer.render(this.scene,this.camera);
 };
 dispose(){this.campus?.dispose();this.campus=null;this.disposed=true;this.renderer.setAnimationLoop(null);this.resize.disconnect();this.controls.dispose();this.eventCleanups.forEach(fn=>fn());this.scene.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line||o instanceof T.Points){o.geometry?.dispose();const m=Array.isArray(o.material)?o.material:[o.material];m.forEach(x=>x.dispose());}});this.textures.forEach(t=>t.dispose());this.envTarget?.dispose();this.composer.passes.forEach(p=>p.dispose());this.composer.dispose();this.renderer.dispose();this.renderer.domElement.remove();}
}
