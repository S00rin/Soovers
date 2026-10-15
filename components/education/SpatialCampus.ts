import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {spaces,slides,type CampusSpace,type IncidentPhase,type Obstacle,type DemoRole} from '@/lib/education/model';
export type CampusAction={id:string;label:string};
type Display={canvas:HTMLCanvasElement;texture:T.CanvasTexture;mesh:T.Mesh};
/** Self-contained scene. All GPU resources belong to this instance and are disposed on room change. */
export class SpatialCampus {
 group=new T.Group();targets:T.Object3D[]=[];obstacles:Obstacle[]=[];
 spawn=new T.Vector3(0,1.72,10);look=new T.Vector3(0,1.8,-5);
 private geometry=new Map<string,T.BufferGeometry>();private materials=new Map<string,T.Material>();private textures:T.Texture[]=[];
 private displays=new Map<string,Display>();private miniature:T.Group|null=null;private packets:T.Mesh[]=[];private paths:T.Vector3[][]=[];private phase:IncidentPhase='idle';private guide:T.Group|null=null;private teaching=false;private missionNodes:T.Mesh[]=[];
 constructor(public space:CampusSpace){this.shell();switch(space){case'reception':this.reception();break;case'gallery':this.gallery();break;case'education':this.education();break;case'classroom':this.classroom();break;case'lab':this.laboratory();break;case'soc':this.soc();break;case'arena':this.arena();break;case'auditorium':this.auditorium();break;}}
 private geo(key:string,make:()=>T.BufferGeometry){if(!this.geometry.has(key))this.geometry.set(key,make());return this.geometry.get(key)!;}
 private mat(color:string,metal=.15,rough=.72,emissive=0,opacity=1){const key=[color,metal,rough,emissive,opacity].join('/');if(!this.materials.has(key))this.materials.set(key,new T.MeshStandardMaterial({color,metalness:metal,roughness:rough,emissive:color,emissiveIntensity:emissive,transparent:opacity<1,opacity,depthWrite:opacity===1,side:opacity<1?T.DoubleSide:T.FrontSide}));return this.materials.get(key)!;}
 private box(g:T.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,color='#17232b',glow=0,round=false){const mesh=new T.Mesh(this.geo(round?'rounded':'box',()=>round?new RoundedBoxGeometry(1,1,1,2,.07):new T.BoxGeometry(1,1,1)),this.mat(color,.2,.74,glow));mesh.scale.set(w,h,d);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;}
 private cylinder(g:T.Object3D,r:number,h:number,x:number,y:number,z:number,color='#253840',glow=0){const m=new T.Mesh(this.geo('cylinder',()=>new T.CylinderGeometry(1,1,1,36)),this.mat(color,.25,.65,glow));m.scale.set(r,h,r);m.position.set(x,y,z);m.receiveShadow=true;g.add(m);return m;}
 private barrier(x:number,z:number,w:number,d:number){this.obstacles.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});}
 private action(mesh:T.Object3D,id:string,label:string){mesh.userData.action={id,label};this.targets.push(mesh);return mesh;}
 private write(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,size=28,color='#c5d6da',align:CanvasTextAlign='left'){ctx.font=`500 ${size}px Vazirmatn, Arial, sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.direction=/[\u0600-\u06ff]/.test(text)?'rtl':'ltr';ctx.fillText(text,x,y,930);}
 private display(g:T.Object3D,key:string,w:number,h:number,x:number,y:number,z:number,title:string,lines:string[],action?:CampusAction){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=2;this.textures.push(texture);
  const mat=new T.MeshBasicMaterial({map:texture,toneMapped:false});const mesh=new T.Mesh(new T.PlaneGeometry(w,h),mat);mesh.position.set(x,y,z);g.add(mesh);this.displays.set(key,{canvas,texture,mesh});this.drawDisplay(key,title,lines);if(action)this.action(mesh,action.id,action.label);return mesh;
 }
 private drawDisplay(key:string,title:string,lines:string[]){const d=this.displays.get(key);if(!d)return;const c=d.canvas.getContext('2d')!;c.fillStyle='#0b171e';c.fillRect(0,0,1024,512);c.strokeStyle='#24515b';c.lineWidth=2;c.strokeRect(2,2,1020,508);this.write(c,'SOOVERS  /  '+this.space.toUpperCase(),48,47,18,'#628e94');c.fillStyle='#00baba';c.fillRect(48,86,55,3);this.write(c,title,512,148,43,'#d0e0e2','center');lines.forEach((l,i)=>this.write(c,l,512,233+i*51,27,i===lines.length-1?'#58b7b7':'#96b3bc','center'));this.write(c,'SOOVERS  /  LEARNING CAMPUS',512,478,16,'#557c86','center');d.texture.needsUpdate=true;}
 private plaque(text:string,x:number,y:number,z:number,w=4,h=.7,rotation=0){const mesh=this.display(this.group,'label-'+this.displays.size,w,h,x,y,z,text,[]);const d=this.displays.get('label-'+(this.displays.size-1))!;d.canvas.height=128;const c=d.canvas.getContext('2d')!;c.fillStyle='#11232b';c.fillRect(0,0,1024,128);this.write(c,text,512,64,55,'#91c6ca','center');d.texture.needsUpdate=true;mesh.rotation.y=rotation;return mesh;}
 private shell(){const g=this.group;
  this.box(g,33,.28,27,0,-.18,0,'#25323c');this.box(g,21,.018,24,0,-.025,0,'#1a2832');
  for(let x=-16;x<=16;x+=2)this.box(g,.012,.006,26,x,.005,0,'#364650');for(let z=-13;z<=13;z+=2)this.box(g,32,.006,.012,0,.006,z,'#364650');
  this.box(g,33,6.4,.28,0,3.15,-13.3,'#14252f');this.box(g,33,6.4,.28,0,3.15,13.3,'#11232c');
  for(const x of [-16.5,16.5]){const wall=this.box(g,.16,6.3,26,x,3.15,0,'#304750');wall.material=this.mat('#648693',.12,.65,0,.18);for(let z=-13;z<=13;z+=3.25)this.box(g,.23,6.3,.18,x,3.15,z,'#50636e');}
  for(const x of [-14.9,14.9])for(const z of [-10,10]){this.box(g,.6,6.3,.6,x,3.15,z,'#35454f');this.box(g,.024,4.7,.025,x-.32,2.7,z+.33,'#00baba',.25);}
  this.box(g,33,.18,27,0,6.45,0,'#101a22');for(let z=-12;z<=12;z+=2)this.box(g,28,.12,.16,0,6.25,z,'#3b4951');
  for(const x of [-9,9])for(const z of [-8,0,8]){this.box(g,3.2,.04,.45,x,6.08,z,'#9cabb1',.2);const light=new T.PointLight('#b8d1df',12,18,2);light.position.set(x,4.7,z);g.add(light);}
  // Cyan wayfinding stays on architectural edges, never a full-screen bloom wash.
  for(const x of [-2,2])this.box(g,.025,.014,22,x,.028,0,'#008c94',.15);
  const ambient=new T.HemisphereLight('#bdd4df','#18232e',1.1);g.add(ambient);
  for(const side of [-1,1])for(let i=0;i<9;i++){const h=3+(i*7%11);this.box(g,2.3,h,3,side*(23+i%3*4),h/2-2,-24+i*5,'#152630');}
  this.plaque(spaces[this.space].en,0,5.7,-13.1,11,.55);
 }
 private portal(label:string,en:string,target:CampusSpace,x:number,z:number,rotation=0){
  const g=new T.Group();g.position.set(x,0,z);g.rotation.y=rotation;this.group.add(g);
  this.box(g,4.3,4.5,.45,0,2.25,0,'#334750',0,true);this.box(g,3.65,4.1,.47,0,2.05,.04,'#0a1821');
  for(const xx of [-1.82,1.82])this.box(g,.04,3.7,.07,xx,2,.31,'#00baba',.32);
  this.box(g,3.7,.025,1.4,0,.02,.65,'#087a84',.12);
  this.display(g,'portal-'+target,3.4,1.7,0,2.5,.31,label,[en,'انتخاب برای ورود'],{id:'nav:'+target,label:'ورود به '+label});
 }
 private chair(g:T.Object3D,x:number,z:number){this.box(g,.85,.2,.85,x,.52,z,'#293c49',0,true);this.box(g,.85,.9,.2,x,.95,z+.38,'#3e5664',0,true);this.cylinder(g,.075,.43,x,.24,z);this.box(g,.85,.04,.7,x,.06,z,'#64727a');}
 private desk(x:number,z:number,screen=false){const g=this.group;this.box(g,2.5,.13,1.2,x,.86,z,'#46525a',0,true);this.box(g,2.2,.7,.12,x,.45,z-.36,'#253640');this.chair(g,x,z+1.05);this.barrier(x,z+.35,2.5,2);if(screen){this.box(g,1.45,.85,.1,x,1.4,z-.24,'#0a121b');this.display(g,'work-'+this.displays.size,1.34,.72,x,1.42,z-.17,'WS / TERMINAL',['SV-042  ·  OPEN'],{id:'workstation',label:'نشستن پشت سیستم'});}}
 private avatar(x:number,z:number,color='#00baba',scale=1,robot=false){const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(scale);this.group.add(g);this.cylinder(g,.23,.8,0,1.12,0,'#355461');for(const xx of [-.12,.12]){this.cylinder(g,.075,.8,xx,.42,0,'#223541');this.box(g,.15,.45,.15,xx*2.6,1.13,0,'#416573',0,true);}const head=new T.Mesh(this.geo('head',()=>new T.SphereGeometry(.19,20,14)),this.mat(robot?'#8196a0':'#9b958a',.2,.7));head.position.y=1.73;g.add(head);this.box(g,.3,.09,.12,0,1.74,.17,color,.25,true);this.cylinder(g,.42,.02,0,.02,0,color,.15);return g;}
 private reception(){
  this.box(this.group,6.3,1.1,1.8,0,.55,-5,'#354650',0,true);this.box(this.group,5.2,.045,.05,0,.75,-4.05,'#00baba',.3);this.barrier(0,-5,6.3,1.8);this.guide=this.avatar(0,-7,'#00baba',1.13,true);
  this.display(this.group,'guide',4.9,2.35,0,3.15,-8.1,'به SooVers خوش آمدید',['من راهنمای بازدید شما هستم.','برای معرفی و دریافت کارت ورود انتخاب کنید.'],{id:'guide',label:'گفت‌وگو با راهنمای پذیرش'});
  this.portal('طبقهٔ آموزش','کارت دانشجو','education',-10.5,-11.4);this.display(this.group,'access',5,2.4,8,2.5,1,'کارت ورود',['لابی و گالری · آزاد','آموزش و کتابخانه · کارت دانشجو'],{id:'guide',label:'مشاهدهٔ دسترسی‌ها و انتخاب کارت'});this.portal('گالری تجربه','DISCOVERY / M','gallery',10.5,-11.4);
  const info=this.display(this.group,'information',6,3,-16.25,2.7,1,'اطلاعات برج',['مسیرها، طبقات و وضعیت فضاها','برای مشاهدهٔ راهنمای طبقات انتخاب کنید.'],{id:'information',label:'اطلاعات طبقات'});info.rotation.y=Math.PI/2;
  this.plaque('INFORMATION',0,1.25,-4.05,3.2,.35);this.plaque('SOO / RECEPTION',0,4.7,-8.1,4.2,.4);
  for(const x of [-10,10]){this.box(this.group,4.2,.52,1.2,x,.35,4,'#354958',0,true);this.box(this.group,4.2,.85,.2,x,.85,4.55,'#415764',0,true);this.barrier(x,4,4.2,1.4);}
 }
 private miniTower(x:number,z:number){const g=new T.Group();g.position.set(x,1.1,z);this.group.add(g);this.miniature=g;this.cylinder(this.group,2.2,1,x,.5,z,'#34434d');this.barrier(x,z,4.4,4.4);for(let i=0;i<8;i++){this.box(g,1.8,.08,1.4,0,i*.43,0,'#56717d');this.box(g,1.75,.31,1.35,0,i*.43+.18,0,'#1a3b48');this.box(g,1.82,.015,1.42,0,i*.43+.06,0,'#00baba',.2);}this.display(this.group,'miniature',4,2,x,3.1,z+3,'جهان در حال توسعه',['هر طبقه، یک تجربهٔ مستقل','این ماکت را برای معرفی انتخاب کنید.'],{id:'miniature',label:'معرفی برج مینیاتوری'});}
 private gallery(){this.miniTower(-7,-4);this.display(this.group,'route',6,3,7,2.5,-9,'یک بسته، سه ایستگاه',['مسیر درست یک لاگ را بسازید.','Endpoint → ? → SIEM'],{id:'route-game',label:'بازی مسیر بسته'});this.box(this.group,7,1,2,7,.5,-6,'#30434e',0,true);this.barrier(7,-6,7,2);this.avatar(5,-5,'#00baba');this.avatar(8,-5,'#ae8d62');this.portal('بازگشت به پذیرش','INFORMATION','reception',0,12,Math.PI);}
 private education(){this.portal('کلاس هوشمند','CLASSROOM','classroom',-10,-11.5);this.portal('آزمایشگاه امنیت','CYBER LAB','lab',0,-11.5);this.portal('مرکز عملیات','TRAINING SOC','soc',10,-11.5);this.portal('عرصهٔ چالش','CTF ARENA','arena',-15,0,Math.PI/2);this.portal('سالن ارائه','AUDITORIUM','auditorium',15,0,-Math.PI/2);this.portal('لابی برج','RETURN / LOBBY','reception',0,12,Math.PI);
  this.display(this.group,'sessions',5,2.4,-9,2.5,6,'تعیین سطح و مسیر',['نقطهٔ شروع خود را پیدا کن.','تعیین سطح ← کلاس ← تمرین'],{id:'roadmap',label:'مسیر یادگیری من'});
  this.display(this.group,'guide-edu',4.5,2.2,9,2.5,6,'کتابخانهٔ مرجع',['منابع درس و مستندات تجهیزات','pfSense / Suricata / ATT&CK'],{id:'sources',label:'بازکردن منابع کتابخانه'});
  this.cylinder(this.group,2,.14,0,.08,0,'#314650');this.cylinder(this.group,1.92,.016,0,.16,0,'#00888e',.12);this.plaque('LEARN  /  INVESTIGATE  /  RESPOND',0,4.8,-10.5,9,.45);
 }
 private classroom(){this.display(this.group,'slides',11,5,0,3.4,-12.9,'',[],{id:'lesson',label:'کنترل نمایشگر درس'});this.setSlide(0);
  this.box(this.group,12,.18,3.1,0,.1,-10.7,'#32454f');this.box(this.group,1.8,1.1,1,-7,.55,-10,'#46535b',0,true);this.guide=this.avatar(-6,-10.5,'#00baba',1.18);
  for(const z of [-5,-1,3])for(const x of [-9,-5,5,9])this.desk(x,z,true);
  this.avatar(-9,-1.9,'#758c99',.8);this.avatar(5,2.1,'#67758b',.8);this.plaque('SOO / مدرس کلاس',-6,3.8,-9.9,4.5,.45);
  const board=this.display(this.group,'whiteboard',6,3,16.22,2.8,-5,'تختهٔ تعاملی',['برای ترسیم و یادداشت انتخاب کنید.'],{id:'whiteboard',label:'نوشتن روی تخته'});board.rotation.y=-Math.PI/2;
  this.portal('مرکز آموزش','EDUCATION','education',-9,12,Math.PI);
 }
 private laboratory(){
  this.box(this.group,12,.18,4,0,1.0,-2,'#3b505c',0,true);this.box(this.group,10,.9,2.7,0,.45,-2,'#253b49');this.barrier(0,-2,12,4);
  const names=['pfSense','SURICATA','ROUTER','SERVER'];for(let i=0;i<4;i++){const x=-4.5+i*3;this.box(this.group,1.45,1.2,.9,x,1.7,-2,'#355767',0,true);this.display(this.group,'device-'+i,1.35,.85,x,1.75,-1.53,names[i],['10.10.0.'+(10+i)],{id:i<2?'device:'+i:'catalog',label:'بررسی '+names[i]});this.box(this.group,1.1,.028,.025,x,2.2,-1.52,'#00baba',.35);}
  this.paths=[[-4.5,1.2,-.8],[-1.5,1.2,-.8],[1.5,1.2,-.8],[4.5,1.2,-.8]].slice(0,3).map((p,i)=>[new T.Vector3(...p as [number,number,number]),new T.Vector3(-1.5+i*3,1.2,-.8)]);
  for(const path of this.paths){const line=new T.Line(new T.BufferGeometry().setFromPoints(path),new T.LineBasicMaterial({color:'#277b88'}));this.group.add(line);for(let i=0;i<3;i++){const p=new T.Mesh(this.geo('packet',()=>new T.SphereGeometry(.07,8,6)),this.mat('#00baba',.1,.8,.3));p.userData.path=this.paths.indexOf(path);p.userData.offset=i/3;this.group.add(p);this.packets.push(p);}}
  this.display(this.group,'incident',11,4.7,0,3.5,-12.95,'میز دفاع شبکه',['pfSense  →  Suricata  →  Server','دستگاه را باز کن و مسیر بسته را دنبال کن.','پروندهٔ تمرین / SV-042'],{id:'incident',label:'شروع و بررسی رخداد آموزشی'});
  for(const x of [-11,11])for(const z of [-7,-3]){this.box(this.group,1.8,3.6,1.2,x,1.8,z,'#192e3b');for(let k=0;k<9;k++){this.box(this.group,1.6,.23,.04,x,.35+k*.34,z+.63,'#3b505b');this.box(this.group,.06,.06,.03,x+.61,.35+k*.34,z+.66,'#007f87',.2);}this.barrier(x,z,1.8,1.2);}
  this.desk(-8,6,true);this.desk(8,6,true);this.display(this.group,'lab-mission',5,2.4,-10,3.6,-11,'رد نفوذ',['یک زنجیره، پنج ایستگاه','MITRE ATT&CK'],{id:'nav:arena',label:'ورود به مأموریت رد نفوذ'});
  this.portal('مرکز آموزش','EDUCATION','education',-9,12,Math.PI);this.portal('مرکز عملیات','TRAINING SOC','soc',9,12,Math.PI);
 }
 private soc(){this.display(this.group,'incident',13,5,0,3.4,-12.95,'پروندهٔ SV-042',['ارزیابی ← بررسی ← پاسخ','authentication_burst','شیفت آموزش / TEAM BLUE'],{id:'incident',label:'تحلیل رخداد و پاسخ'});
  for(const [i,x] of [-8,0,8].entries())this.plaque(['TIER 1 / TRIAGE','TIER 2 / INVESTIGATE','TIER 3 / HUNT'][i],x,3,-8,5,.65);
  for(const x of [-8,0,8])for(const z of [-5,1]){this.desk(x,z,true);this.desk(x+2.9,z,true);}this.display(this.group,'timeline',5,2.5,-16.2,3,0,'خط زمانی رخداد',['01  هشدار','02  بررسی  /  03  مهار','04  حفظ شواهد'],{id:'incident',label:'بررسی خط زمانی'}).rotation.y=Math.PI/2;
  this.display(this.group,'asset-map',5,2.5,16.2,3,0,'دارایی‌ها و جریان',['Endpoint  /  Firewall  /  Server'],{id:'incident',label:'بررسی دارایی‌ها'}).rotation.y=-Math.PI/2;this.drawAssetMap();this.portal('مرکز آموزش','EDUCATION','education',-9,12,Math.PI);this.portal('آزمایشگاه','CYBER LAB','lab',9,12,Math.PI);
 }
 private arena(){
  const names=['MAIL GATEWAY','ENDPOINT','IDENTITY','REMOTE ACCESS','EGRESS'];
  const ids=['T1566.001','T1059.001','T1003','T1021.001','T1041'];
  for(let i=0;i<5;i++){const x=-10+i*5;this.box(this.group,3.4,.3,3.4,x,.15,-4,'#243f4b');this.barrier(x,-4,3.4,3.4);const node=this.cylinder(this.group,1.05,1.3,x,1,-4,'#13595e',.15);this.missionNodes.push(node);this.display(this.group,'mission-'+i,3.5,2,x,3.1,-4,names[i],[ids[i]],{id:'mission',label:'بررسی ایستگاه '+ids[i]});if(i<4)this.box(this.group,5,.025,.06,x+2.5,.04,-4,'#00baba',.3);}
  this.display(this.group,'mission',10,3.5,0,3.8,-12.9,'رد یک نفوذ',['از پیوست مشکوک تا خروج داده','۵ ایستگاه · تصمیم‌های دفاعی'],{id:'mission',label:'شروع مأموریت رد نفوذ'});
  this.desk(-8,5,true);this.display(this.group,'challenge',4,2,8,2.5,4,'چالش تحلیل لاگ',['مبدأ را پیدا کن؛ پرچم را بساز.'],{id:'ctf',label:'بازکردن چالش CTF'});
  this.portal('مرکز آموزش','EDUCATION','education',0,12,Math.PI);
 }
 private auditorium(){this.box(this.group,18,.35,5,0,.17,-9.7,'#3f4e59');this.display(this.group,'slides',13,5.5,0,3.8,-12.9,'',[],{id:'lesson',label:'ارائهٔ خودآموز'});this.setSlide(0);this.box(this.group,1.5,1.15,1,-7,.7,-8.5,'#495f69',0,true);this.avatar(-7,-9.2,'#00baba');for(let row=0;row<5;row++)for(const x of [-10,-8,-6,-4,4,6,8,10]){const z=-4+row*2.7;this.chair(this.group,x,z);this.barrier(x,z,1,1);}this.portal('مرکز آموزش','EDUCATION','education',0,12,Math.PI);}
 setAccess(role:DemoRole){this.drawDisplay('access','کارت '+({visitor:'بازدیدکننده',student:'دانشجو',instructor:'استاد',administrator:'مدیر'}[role]),['لابی و گالری · آزاد',role==='visitor'?'آموزش و کتابخانه · کارت دانشجو':'آموزش و کتابخانه · مجاز']);}
 setLesson(frame:{title:string;lines:readonly string[]}){this.drawDisplay('slides',frame.title,[...frame.lines]);}
 setTeaching(active:boolean){this.teaching=active;}
 setMission(stage:number){this.missionNodes.forEach((m,i)=>{m.material=this.mat(i<stage?'#24846c':i===stage?'#d0a163':'#13595e',.25,.65,.15);});this.drawDisplay('mission',stage>=5?'مأموریت تکمیل شد':'رد یک نفوذ',[`ایستگاه ${Math.min(stage+1,5)} / 5`,'شواهد ← تصمیم ← نتیجه']);}
 setSlide(index:number){const d=this.displays.get('slides');if(!d)return;const s=slides[index];this.drawDisplay('slides',s.title,[s.subtitle,...s.lines]);}
 setWhiteboard(canvas:HTMLCanvasElement){const d=this.displays.get('whiteboard');if(!d)return;const c=d.canvas.getContext('2d')!;c.drawImage(canvas,0,0,1024,512);d.texture.needsUpdate=true;}
 setIncident(phase:IncidentPhase){this.phase=phase;const title={idle:'شبکهٔ آموزشی آماده',alert:'هشدار: ورودهای ناموفق پرتعداد',identified:'مبدأ مشکوک شناسایی شد',contained:'ترافیک مبدأ مشکوک مهار شد',reviewed:'رخداد بررسی و مستند شد'}[phase];const lines=phase==='idle'?['برای شروع تمرین، نمایشگر را انتخاب کنید.']:['198.51.100.23  →  10.10.0.12','authentication_burst  /  SIMULATED',phase==='contained'||phase==='reviewed'?'FIREWALL: SOURCE BLOCKED':'FIREWALL: OBSERVE'];this.drawDisplay('incident',title,lines);this.drawAssetMap();}
 private drawAssetMap(){const d=this.displays.get('asset-map');if(!d)return;const c=d.canvas.getContext('2d')!;c.fillStyle='#091820';c.fillRect(0,0,1024,512);this.write(c,'ASSET MAP / SIMULATED',512,52,30,'#9dc6cc','center');const nodes=[[160,240,'ENDPOINT'],[510,160,'FIREWALL'],[810,280,'SERVER']] as const;const alert=['alert','identified'].includes(this.phase);c.lineWidth=3;c.strokeStyle=alert?'#b67761':'#227b88';c.beginPath();c.moveTo(160,240);c.lineTo(510,160);c.lineTo(810,280);c.stroke();for(const [x,y,name] of nodes){c.fillStyle='#133441';c.fillRect(x-70,y-30,140,60);c.strokeStyle='#42838b';c.strokeRect(x-70,y-30,140,60);this.write(c,name,x,y,20,'#bdd1d6','center');}this.write(c,['contained','reviewed'].includes(this.phase)?'SOURCE BLOCKED':alert?'AUTHENTICATION BURST':'READY',512,404,30,alert?'#c88e71':'#5aadb0','center');this.write(c,'3 assets  /  training topology',512,462,19,'#507888','center');d.texture.needsUpdate=true;}
 setScore(score:number){this.drawDisplay('score','پیشرفت نشست آموزشی',[`امتیاز: ${score} / 100`,'نتیجهٔ تمرین‌های همین بازدید','مسیر بعدی: مرور شواهد']);}
 update(time:number,reduced=false){if(this.miniature&&!reduced)this.miniature.rotation.y=time*.15;if(this.guide&&!reduced){this.guide.rotation.y=Math.sin(time*(this.teaching?1.5:.3))*(this.teaching?.2:.08);this.guide.position.y=this.teaching?Math.sin(time*2)*.015:0;}for(const packet of this.packets){const p=this.paths[packet.userData.path],t=(time*.3+packet.userData.offset)%1;packet.position.lerpVectors(p[0],p[1],t);packet.visible=this.phase!=='idle'&&(!['contained','reviewed'].includes(this.phase)||packet.userData.path===0);(packet.material as T.MeshStandardMaterial).color.set(['alert','identified'].includes(this.phase)?'#cb836a':'#00a9ad');}}
 dispose(){const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();this.group.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());this.textures.forEach(t=>t.dispose());this.group.removeFromParent();this.group.clear();}
}
