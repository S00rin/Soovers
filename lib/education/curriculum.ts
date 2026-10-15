export type Domain = 'network' | 'systems' | 'defense' | 'response';
export const domainNames: Record<Domain,string> = {network:'شبکه',systems:'سیستم‌عامل',defense:'تشخیص تهدید',response:'پاسخ به رخداد'};
export const placementQuestions = [
 {domain:'network',question:'برای شناخت یک اتصال TCP، کدام اطلاعات را کنار هم می‌گذاری؟',options:['فقط نام کاربر','IP و پورت مبدأ و مقصد، همراه پروتکل','فقط اندازهٔ فایل'],correct:1},
 {domain:'systems',question:'کاربر عادی باید برای کار روزانه چه مجوزی داشته باشد؟',options:['مدیر سیستم','دسترسی به همهٔ فایل‌ها','حداقل دسترسی لازم برای وظیفه'],correct:2},
 {domain:'defense',question:'یک هشدار IDS به‌تنهایی چه چیزی را ثابت می‌کند؟',options:['رخداد قطعاً حمله است','الگویی نیازمند بررسی دیده شده','سامانه حتماً نفوذ شده است'],correct:1},
 {domain:'response',question:'پس از دیدن ورودهای ناموفق پرتعداد، اولین اقدام چیست؟',options:['بررسی مبدأ، زمان و نتیجهٔ ورودها','پاک‌کردن لاگ‌ها','مسدودکردن همهٔ کاربران'],correct:0},
 {domain:'network',question:'فایروال Stateful با پاسخ یک اتصال مجاز چه می‌کند؟',options:['همیشه آن را حذف می‌کند','صرفاً اندازهٔ بسته را می‌سنجد','آن را با جدول وضعیت اتصال تطبیق می‌دهد'],correct:2},
 {domain:'systems',question:'اجرای PowerShell از یک فایل Office چه معنایی دارد؟',options:['همیشه عادی است','رابطهٔ والد و فرزندِ پردازش نیاز به بررسی دارد','وجود بدافزار را به‌تنهایی اثبات می‌کند'],correct:1},
 {domain:'defense',question:'تفاوت IDS غیرفعال و IPS در مسیر ترافیک چیست؟',options:['IDS مشاهده و هشدار می‌دهد؛ IPS می‌تواند طبق سیاست مسدود کند','هر دو همیشه بسته را حذف می‌کنند','IDS فقط سخت‌افزاری است'],correct:0},
 {domain:'response',question:'قبل از بستن پروندهٔ رخداد چه چیزی لازم است؟',options:['حذف آثار رخداد','فقط یک اسکرین‌شات','ثبت شواهد، زمان، دامنه و نتیجهٔ اقدام'],correct:2},
] as const;
export type Placement = {score:number;level:'foundation'|'intermediate'|'advanced';domains:Record<Domain,number>;answers:number[]};
export const levelNames = {foundation:'پایه',intermediate:'میانی',advanced:'پیشرفته'};
export function assess(answers:number[]): Placement | null {
 if(answers.length!==placementQuestions.length || answers.some((v,i)=>!Number.isInteger(v)||v<0||v>=placementQuestions[i].options.length)) return null;
 const domains:Record<Domain,number>={network:0,systems:0,defense:0,response:0};
 placementQuestions.forEach((q,i)=>{if(answers[i]===q.correct) domains[q.domain]++;});
 const score=Object.values(domains).reduce((a,b)=>a+b,0);
 return {score,level:score>=7?'advanced':score>=4?'intermediate':'foundation',domains,answers:[...answers]};
}
export type LessonFrame={title:string;lines:string[];say:string};
export const lessons = {
 linux:{title:'هویت و دسترسی',subtitle:'LINUX FOUNDATIONS',source:'linux',reference:'least-privilege',minutes:4,frames:[
  {title:'با چه هویتی کار می‌کنیم؟',lines:['کاربر → گروه → مجوز','یک حساب، یک مسئولیت'],say:'من SOO هستم. از هویت شروع می‌کنیم. قبل از هر تغییر، باید بدانیم چه کاربری درخواست را فرستاده و چه مجوزی دارد.'},
  {title:'اصل کمترین دسترسی',lines:['خواندن، نوشتن و اجرا مستقل‌اند.','کار روزانه به حساب مدیر نیاز ندارد.'],say:'تصور کن کلید یک اتاق را لازم داری. کلید همهٔ برج را نمی‌گیری. مجوز هم باید فقط به اندازهٔ وظیفه باشد.'},
  {title:'نوبت تو',lines:['روی میز کار بنشین.','با whoami هویت نشست را بررسی کن.'],say:'حالا به پایانه برو. دستور whoami را اجرا کن و نقش فعلی را ببین. این نقطهٔ شروع بررسی یک نشست است.'}
 ],question:'کدام مجوز برای کار روزانه مناسب است؟',options:['حداقل مجوز مورد نیاز','دسترسی مدیر برای همه'],answer:0},
 packet:{title:'سفر یک بسته',subtitle:'PACKET ANALYSIS',source:'packet',reference:'pfsense',minutes:5,frames:[
  {title:'از مبدأ تا مقصد',lines:['مبدأ و مقصد: IP + Port','پروتکل مسیر گفت‌وگو را مشخص می‌کند.'],say:'این بسته را یک نامه در نظر بگیر. آدرس شبکه ما را به دستگاه می‌رساند و پورت، سرویس مقصد را مشخص می‌کند.'},
  {title:'دروازهٔ شبکه',lines:['رابط ورودی → وضعیت اتصال → قوانین','بستهٔ مجاز ادامه می‌دهد.'],say:'در فایروال، اتصال‌های موجود با جدول وضعیت بررسی می‌شوند. برای اتصال تازه قوانین تعیین می‌کنند که عبور مجاز است یا نه. ترتیب NAT هم در نتیجه اثر دارد.'},
  {title:'روی میز آزمایشگاه',lines:['فایروال را باز کن.','یک اتصال تازه و پاسخ آن را مقایسه کن.'],say:'مدل فایروال را در آزمایشگاه باز می‌کنیم. به جای حفظ نام اجزا، مسیر تصمیم‌گیری را دنبال کن.'}
 ],question:'فایروال Stateful چه چیزی را نگه می‌دارد؟',options:['فقط ظاهر بسته','وضعیت اتصال‌های مجاز'],answer:1},
 security:{title:'از نشانه تا شواهد',subtitle:'SECURITY FOUNDATIONS',source:'security',reference:'suricata',minutes:5,frames:[
  {title:'یک هشدار، آغاز بررسی',lines:['هشدار ≠ اثبات نفوذ','زمان، مبدأ، مقصد و نتیجه را کنار هم بگذار.'],say:'به کلاس خوش آمدی. روی نمایشگر یک هشدار می‌بینی. هنوز نمی‌دانیم حمله موفق بوده یا نه؛ باید شواهد را جمع کنیم.'},
  {title:'دیدن و متوقف‌کردن',lines:['IDS: مشاهده و هشدار','IPS: تصمیم در مسیر عبور'],say:'حسگر در حالت IDS یک نسخه از ترافیک را می‌بیند. برای توقف ترافیک باید در مسیر عبور و در حالت IPS پیکربندی شود. این دو را با هم اشتباه نگیر.'},
  {title:'شواهد روی میز تو',lines:['۱۸ و سپس ۲۴ ورود ناموفق','آیا ورود عادی هم در لاگ هست؟'],say:'در پایانه، لاگ ورودها را باز کن. مبدأ پرتکرار را از کاربر عادی جدا کن؛ بعد سراغ تصمیم مهار می‌رویم.'}
 ],question:'قبل از تصمیم دربارهٔ یک هشدار چه می‌کنی؟',options:['هویت و شواهد مرتبط را بررسی می‌کنم','به مبدأ داخلی اعتماد می‌کنم'],answer:0},
 nsm:{title:'شیفت اول در SOC',subtitle:'NETWORK SECURITY MONITORING',source:'nsm',reference:'suricata',minutes:5,frames:[
  {title:'تحویل شیفت',lines:['Tier 1 · ارزیابی اولیه','Tier 2 · بررسی و مهار','Tier 3 · شکار و بهبود تشخیص'],say:'در مرکز عملیات هر تصمیم صاحب دارد. تحلیلگر سطح یک هشدار را دسته‌بندی می‌کند؛ سطح دو بررسی عمیق‌تر و مهار را پیش می‌برد؛ سطح سه روی شکار و بهبود تشخیص کار می‌کند.'},
  {title:'هم‌بستگی رویدادها',lines:['ورود ناموفق → رفتار مبدأ → دارایی مقصد','یک جریان را در چند منبع دنبال کن.'],say:'رویدادهای شبکه و میزبان را با زمان و شناسهٔ جریان مرتبط کن. چند نشانه کنار هم، تصویر بهتری از رخداد می‌دهند.'},
  {title:'پرونده را تحویل بده',lines:['مبدأ مشکوک را مشخص کن.','اقدام و شواهد را برای شیفت بعد ثبت کن.'],say:'حالا پروندهٔ SV-042 را در مرکز عملیات ادامه بده. تصمیم تو باید به یک شواهد مشخص متکی باشد.'}
 ],question:'کدام کار به Tier 1 نزدیک‌تر است؟',options:['حذف تمام هشدارها','ارزیابی اولیه و ارجاع مستند'],answer:1},
 ir:{title:'رد یک نفوذ',subtitle:'INCIDENT RESPONSE',source:'ir',reference:'attack',minutes:6,frames:[
  {title:'رفتار مهاجم را بخوان',lines:['ورود اولیه → اجرا → دسترسی به اعتبارنامه','هر تکنیک، یک رفتار قابل بررسی است.'],say:'در ATT&CK، تاکتیک هدف مهاجم و تکنیک روش انجام آن است. زنجیره‌ای که می‌بینی یک سناریوی آموزشی منتخب است؛ همهٔ حمله‌ها این ترتیب را ندارند.'},
  {title:'مهار همراه با شواهد',lines:['دامنهٔ اثر را محدود کن.','خط زمانی و علت تصمیم را حفظ کن.'],say:'سرعت مهم است، اما مهار بدون شناخت دامنه ممکن است سرویس سالم را هم قطع کند. اقدام و نتیجه را ثبت کن تا تصمیم قابل بازبینی بماند.'},
  {title:'وارد مأموریت شو',lines:['شواهد را در ایستگاه‌های جهان دنبال کن.','در هر مرحله یک تصمیم دفاعی بگیر.'],say:'در عرصهٔ مأموریت، یک زنجیرهٔ نفوذ را دنبال می‌کنی. با هر تصمیم درست، ایستگاه بعدی روشن می‌شود.'}
 ],question:'پس از مهار چه باید کرد؟',options:['ثبت شواهد و نتیجهٔ اقدام','بستن فوری پرونده'],answer:0}
} satisfies Record<string,{title:string;subtitle:string;source:string;reference:string;minutes:number;frames:LessonFrame[];question:string;options:string[];answer:number}>;
export type LessonId=keyof typeof lessons;
export function roadmap(p:Placement|null):{id:LessonId;reason:string}[]{
 if(!p)return (['security','packet','linux','nsm','ir'] as LessonId[]).map(id=>({id,reason:'انتخاب آزاد؛ بدون نیاز به تعیین سطح'}));
 const result:{id:LessonId;reason:string}[]=[];
 if(p.domains.systems<2)result.push({id:'linux',reason:'تقویت هویت و مجوزهای سیستم'});
 if(p.domains.network<2)result.push({id:'packet',reason:'تقویت شناخت شبکه و جریان بسته'});
 if(p.domains.defense<2 || p.level==='foundation')result.push({id:'security',reason:'تمرین تشخیص مبتنی بر شواهد'});
 result.push({id:'nsm',reason:'کار با پرونده و تحلیل در SOC'});
 result.push({id:'ir',reason:p.domains.response<2?'تقویت تصمیم‌گیری و حفظ شواهد':'تمرین پیشرفتهٔ زنجیرهٔ نفوذ'});
 return result;
}
export type LearningProgress={version:1;placement:Placement|null;completed:LessonId[];selected:LessonId;mission:number};
export const emptyProgress=():LearningProgress=>({version:1,placement:null,completed:[],selected:'security',mission:0});
export const progressKey='soovers-learning-v1';
export function parseProgress(raw:string|null):LearningProgress{
 try{const p=JSON.parse(raw||'null');if(!p||p.version!==1)return emptyProgress();return {version:1,placement:assess(p.placement?.answers||[]),completed:Array.isArray(p.completed)?[...new Set(p.completed.filter((id:unknown)=>typeof id==='string'&&Object.hasOwn(lessons,id)))] as LessonId[]:[],selected:Object.hasOwn(lessons,p.selected)?p.selected:'security',mission:Number.isInteger(p.mission)&&p.mission>=0&&p.mission<=5?p.mission:0};}catch{return emptyProgress();}
}
