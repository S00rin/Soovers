export type CampusSpace='reception'|'gallery'|'education'|'classroom'|'lab'|'soc'|'arena'|'auditorium';
export type DemoRole='visitor'|'student'|'instructor'|'administrator';
export const roles:Record<DemoRole,string>={visitor:'بازدیدکننده',student:'دانشجو',instructor:'استاد',administrator:'مدیر'};
export const spaces:Record<CampusSpace,{title:string;en:string;hint:string}>={
 reception:{title:'لابی SooVers',en:'ARRIVAL / INFORMATION',hint:'به میز پذیرش نزدیک شوید و راهنمای برج را انتخاب کنید.'},
 gallery:{title:'گالری تجربه',en:'DISCOVERY GALLERY / M',hint:'برج مینیاتوری و بازی مسیر بسته را کشف کنید.'},
 education:{title:'مرکز آموزش',en:'EDUCATION / LEVEL 01',hint:'از درگاه‌های روشن وارد کلاس، آزمایشگاه یا سالن شوید.'},
 classroom:{title:'کلاس هوشمند',en:'CLASSROOM / SECURITY FOUNDATIONS',hint:'نمایشگر درس یا تختهٔ سمت راست را انتخاب کنید.'},
 lab:{title:'آزمایشگاه امنیت',en:'CYBER LAB / NETWORK DEFENCE',hint:'میز شبکه را انتخاب کنید و جریان یک رخداد آموزشی را بررسی کنید.'},
 soc:{title:'مرکز عملیات آموزشی',en:'VIRTUAL SOC / INCIDENT RESPONSE',hint:'نمایشگر مرکزی را انتخاب کنید و رخداد را تحلیل کنید.'},
 arena:{title:'عرصهٔ چالش',en:'CTF ARENA / INVESTIGATE',hint:'پایانهٔ چالش را باز کنید و شواهد را به پاسخ تبدیل کنید.'},
 auditorium:{title:'سالن ارائه',en:'AUDITORIUM / KNOWLEDGE FORUM',hint:'نمایشگر صحنه را برای یک ارائهٔ خودآموز انتخاب کنید.'}
};
export const slides=[
 {title:'اعتماد را بررسی کن',subtitle:'01 / ZERO TRUST',lines:['هر درخواست باید هویت معتبر و دسترسی متناسب داشته باشد.','حضور در شبکهٔ داخلی به‌تنهایی دلیل اعتماد نیست.','در این درس: هویت، شواهد، تصمیم.'],diagram:'identity'},
 {title:'مسیر یک رویداد امنیتی',subtitle:'02 / OBSERVABILITY',lines:['Endpoint → Firewall → Collector → SIEM','یک هشدار نقطهٔ شروع بررسی است، نه اثبات قطعی حمله.','زمان، مبدأ، مقصد و نتیجهٔ رویداد را کنار هم بررسی کن.'],diagram:'network'},
 {title:'از تشخیص تا پاسخ',subtitle:'03 / INCIDENT RESPONSE',lines:['نشانه را بررسی و دامنهٔ رخداد را مشخص کن.','مهار متناسب انجام بده و شواهد را حفظ کن.','در آزمایشگاه، همین مسیر را روی دادهٔ شبیه‌سازی‌شده تمرین می‌کنی.'],diagram:'response'}
];
export function canEnter(space:CampusSpace,role:DemoRole){return space==='reception'||space==='gallery'||role!=='visitor';}
export const sampleLogs=[
 '10:20:01 src=198.51.100.23 dst=10.10.0.12 user=analyst result=failed count=18',
 '10:20:04 src=198.51.100.23 dst=10.10.0.12 user=analyst result=failed count=24',
 '10:20:08 src=10.10.0.31 dst=10.10.0.12 user=backup result=success count=1',
 '10:20:10 src=198.51.100.23 dst=10.10.0.12 alert=authentication_burst'
];
export type IncidentPhase='idle'|'alert'|'identified'|'contained'|'reviewed';
export class TrainingSession {
 role:DemoRole='visitor';phase:IncidentPhase='idle';slide=0;score=0;ctfSolved=false;quizSolved=false;routeSolved=false;mistakes=0;events:string[]=[];
 private award(id:string,points:number){if(this.events.includes(id))return;this.events.push(id);this.score+=points;}
 setRole(role:DemoRole){this.role=role;}
 beginIncident(){if(this.role==='visitor')return false;this.phase='alert';return true;}
 identify(ip:string){if(this.role==='visitor')return false;if(this.phase!=='alert')return false;if(ip.trim()!=='198.51.100.23'){this.mistakes++;return false;}this.phase='identified';this.award('identify',25);return true;}
 contain(action:string){if(this.role==='visitor')return false;if(this.phase!=='identified')return false;if(action!=='block-source'){this.mistakes++;return false;}this.phase='contained';this.award('contain',25);return true;}
 review(action:string){if(this.role==='visitor')return false;if(this.phase!=='contained')return false;if(action!=='preserve-evidence'){this.mistakes++;return false;}this.phase='reviewed';this.award('review',20);return true;}
 solveCTF(flag:string){if(this.role==='visitor')return false;if(flag.trim().toUpperCase()!=='SOOVERS{198.51.100.23}'){this.mistakes++;return false;}this.ctfSolved=true;this.award('ctf',20);return true;}
 quiz(answer:string){if(this.role==='visitor')return false;if(answer!=='verify'){this.mistakes++;return false;}this.quizSolved=true;this.award('quiz',10);return true;}
 route(values:string[]){const pass=values.join(',')==='endpoint,firewall,siem';if(pass)this.routeSolved=true;return pass;}
 report(){return {mode:'single-user-local-demo',role:this.role,score:this.score,maxScore:100,phase:this.phase,ctfSolved:this.ctfSolved,quizSolved:this.quizSolved,routeSolved:this.routeSolved,mistakes:this.mistakes,completed:[...this.events],generatedAt:new Date().toISOString()};}
}
// Boundaries are enforced per axis so the visitor slides alongside obstacles.
export type Obstacle={minX:number;maxX:number;minZ:number;maxZ:number};
export function moveWithCollision(x:number,z:number,dx:number,dz:number,boxes:Obstacle[],halfX=15.5,halfZ=12.5){
 const radius=.32,blocked=(a:number,b:number)=>boxes.some(o=>a>o.minX-radius&&a<o.maxX+radius&&b>o.minZ-radius&&b<o.maxZ+radius);
 const nextX=Math.max(-halfX,Math.min(halfX,x+dx)),nextZ=Math.max(-halfZ,Math.min(halfZ,z+dz));
 if(!blocked(nextX,z))x=nextX;if(!blocked(x,nextZ))z=nextZ;return {x,z};
}
