export type Device = {
  id: string;
  name: string;
  category: string;
  role: string;
  use: string;
  connections: string;
  identity: string;
  failure: string;
  evidence: string;
  lesson: string;
  source: string;
};
export const devices: Device[] = [
  {
    id: "s71500",
    name: "Siemens S7-1500 · CPU 1511-1 PN",
    category: "کنترلر و I/O",
    role: "CPU کنترلر برنامه‌پذیر؛ اجرای منطق و تبادل داده با I/O.",
    use: "نمونهٔ آموزشی برای کنترل ماشین یا فرایند و دنبال‌کردن چرخهٔ اندازه‌گیری تا فرمان.",
    connections:
      "تغذیه، ماژول‌های I/O و ارتباط PROFINET؛ امکانات دقیق تابع شماره سفارش است.",
    identity:
      "CPU، شماره سفارش، HW/FW، کارت حافظه، نسخهٔ پروژه و ابزار مهندسی.",
    failure:
      "RUN بودن CPU، درستی مقیاس‌گذاری، نگاشت کانال یا صحت منطق را تضمین نمی‌کند.",
    evidence:
      "نسخهٔ پروژهٔ مجاز، پیکربندی سخت‌افزار، رخدادهای تشخیصی و تاریخچهٔ تغییر.",
    lesson: "io",
    source: "https://sieportal.siemens.com/en-ww/products-services/10204209",
  },
  {
    id: "s71200",
    name: "Siemens S7-1200 G2 · CPU 1214C",
    category: "کنترلر و I/O",
    role: "کنترلر کامپکت؛ نمونه‌ای برای خواندن I/O و اجرای برنامهٔ محلی.",
    use: "یادگیری تفاوت نسل کنترلر، مدل CPU و امکانات یک پیکربندی مشخص.",
    connections:
      "I/O و ارتباطات مطابق مدل سفارش‌داده‌شده؛ مشخصات نسل قدیمی را به G2 تعمیم نده.",
    identity: "عبارت G2، کد کامل CPU، گونهٔ تغذیه و I/O، FW و ابزار سازگار.",
    failure:
      "انتخاب نوع ورودی یا بازهٔ اشتباه می‌تواند عدد معتبر ولی مهندسیِ نادرست بسازد.",
    evidence: "تنظیم کانال، مقدار خام، تبدیل مهندسی و نسخهٔ برنامه در کنار هم.",
    lesson: "io",
    source:
      "https://support.industry.siemens.com/cs/attachments/109972011/S71200_G2_system_manual_en-US.pdf",
  },
  {
    id: "et200",
    name: "Siemens SIMATIC ET 200SP",
    category: "کنترلر و I/O",
    role: "خانوادهٔ I/O توزیع‌شده برای ارتباط سیگنال‌های میدان با کنترل.",
    use: "بررسی نگاشت ترمینال، کانال، ماژول و تگ؛ بعضی پیکربندی‌ها CPU هم دارند.",
    connections:
      "BaseUnit، ماژول سیگنال، ماژول رابط و شبکه؛ هر اسلات باید شناسایی شود.",
    identity: "کد ماژول و BaseUnit، اسلات، نوع کانال و پارامترهای تشخیص.",
    failure:
      "جابه‌جایی ماژول یا تنظیم کانال اشتباه ممکن است فقط بخشی از اندازه‌گیری را متاثر کند.",
    evidence:
      "نقشهٔ اسلات‌ها، فهرست I/O، وضعیت کانال و مقایسه با پروژهٔ مهندسی.",
    lesson: "asset",
    source:
      "https://www.siemens.com/global/en/products/automation/systems/industrial/io-systems/et-200sp.html",
  },
  {
    id: "ac800",
    name: "ABB AC 800M · PM866A",
    category: "کنترلر و I/O",
    role: "خانوادهٔ کنترلر ماژولار در اکوسیستم کنترل فرایند ABB.",
    use: "شناخت رابطهٔ CPU، I/O، ارتباطات و محیط مهندسی در یک سامانهٔ DCS.",
    connections:
      "ماژول‌های CPU، ارتباط و تغذیه؛ آرایش افزونه یا معمولی باید جدا ثبت شود.",
    identity:
      "مدل PM866A، ماژول‌های متصل، نسخهٔ Firmware و پروژهٔ Control Builder.",
    failure:
      "وضعیت ارتباط بالا‌دستی به‌تنهایی صحت ورودی میدان یا نسخهٔ منطق را ثابت نمی‌کند.",
    evidence:
      "پروژه، تنظیمات ارتباط، تشخیص CPU/I/O و سوابق تغییر هماهنگ با بهره‌برداری.",
    lesson: "chain",
    source:
      "https://new.abb.com/control-systems/system-800xa/800xa-dcs/hardware-controllers-io/ac800m-controllers",
  },
  {
    id: "3051",
    name: "Rosemount 3051T / 3051C",
    category: "ابزار دقیق و عملگر",
    role: "نمونه‌های خانوادهٔ ترانسمیتر فشار؛ گونه و پیکربندی برای معنای اندازه‌گیری مهم‌اند.",
    use: "دنبال‌کردن رابطهٔ فشار اندازه‌گیری‌شده، بازهٔ مهندسی و سیگنال خروجی.",
    connections:
      "اتصال فرایندی و مسیر سیگنال؛ تبدیل فشار به سطح به نصب و فرض‌های فرایند وابسته است.",
    identity: "T یا C، کد سفارش، نوع فشار، واحد، LRV/URV و گزینهٔ ارتباطی.",
    failure:
      "رنج ناسازگار، واحد اشتباه یا مسئلهٔ مسیر فشار می‌تواند با ارتباط سالم همراه باشد.",
    evidence: "رنج فعال، واحد، سوابق کالیبراسیون و مقایسه با مرجع مستقل معتبر.",
    lesson: "mismatch",
    source:
      "https://www.emerson.com/en/measurement-instrumentation/products/rosemount-3051-pressure-transmitter-family",
  },
  {
    id: "3144",
    name: "Rosemount 3144P",
    category: "ابزار دقیق و عملگر",
    role: "ترانسمیتر دما؛ پردازش ورودی حسگر و ارائهٔ مقدار قابل استفادهٔ سامانه.",
    use: "تمایز خودِ حسگر دما، سیم‌های اتصال و ترانسمیتر.",
    connections:
      "حسگر متناسب با پیکربندی و مسیر خروجی؛ نوع اتصال را از مدل و نقشه تعیین کن.",
    identity: "نوع حسگر، آرایش سیم‌بندی، واحد، بازه و گزینه‌های دقیق تجهیز.",
    failure:
      "تنظیم نوع حسگر یا اتصال نادرست می‌تواند اندازه‌گیری را منحرف کند.",
    evidence: "پیکربندی ورودی، وضعیت تشخیصی، سوابق تغییر و مرجع دمای مستقل.",
    lesson: "electricity",
    source:
      "https://www.emerson.com/en/measurement-instrumentation/products/rosemount-3144p-temperature-transmitter-family",
  },
  {
    id: "dvc",
    name: "Fisher FIELDVUE DVC6200",
    category: "ابزار دقیق و عملگر",
    role: "کنترلر دیجیتال شیر / پوزیشنر؛ تطبیق موقعیت عملگر با فرمان.",
    use: "دیدن تفاوت فرمان، موقعیت، حرکت عملگر و اثر واقعی روی جریان سیال.",
    connections:
      "فرمان و بازخورد موقعیت، اتصال پنوماتیک و عملگر متناسب با نصب.",
    identity: "مدل، نسخه و گزینهٔ ارتباطی، نوع عملگر و مشخصات مجموعهٔ شیر.",
    failure:
      "دریافت فرمان، حرکت واقعی و دبی سه شاهد جدا هستند؛ مشکل مکانیکی ممکن است باقی بماند.",
    evidence:
      "روند فرمان/موقعیت، تشخیص تجهیز و سوابق سرویس؛ نه صرفاً تگ فرمان HMI.",
    lesson: "asset",
    source: "https://www.emerson.com/en/final-control/products/fisher-dvc6200",
  },
  {
    id: "acs",
    name: "ABB ACS880-01",
    category: "ابزار دقیق و عملگر",
    role: "درایو موتور؛ تبدیل فرمان کنترلی به رفتار الکتریکی متناسب با موتور.",
    use: "بررسی مسیر فرمان سرعت تا موتور و سپس اثر مکانیکی روی پمپ.",
    connections:
      "مدار قدرت، موتور، I/O و گزینه‌های ارتباط؛ اینها مسیرهای یکسان نیستند.",
    identity:
      "کد کامل درایو، Firmware، گزینه‌ها، پارامترها و مشخصات موتور مرتبط.",
    failure:
      "فرمان سرعت با چرخش موتور یا دبی پمپ برابر نیست؛ محدودیت یا خطا را جدا بخوان.",
    evidence:
      "مرجع و بازخورد سرعت، وضعیت و خطای درایو، پارامترهای فعال و تاریخچهٔ تغییر.",
    lesson: "chain",
    source:
      "https://www.abb.com/global/en/areas/motion/drives/low-voltage-ac-drives/industrial-drives/acs880-single-drives/acs880-01",
  },
  {
    id: "mtp",
    name: "Siemens MTP700 Unified Comfort",
    category: "نمایش، شبکه و برق",
    role: "پنل HMI برای مشاهدهٔ مقادیر و تعامل اپراتور.",
    use: "تفکیک تگ نمایش، کیفیت، زمان نمونه و مسیر واقعی کنترل.",
    connections:
      "ارتباط با کنترلر و پروژهٔ Runtime؛ Comfort و Basic را مدل یکسان فرض نکن.",
    identity: "نام کامل پنل، شماره سفارش، Runtime، پروژه و منابع هر تگ.",
    failure:
      "نمایش ثابت می‌تواند ناشی از قطع به‌روزرسانی باشد، در حالی که کنترل محلی ادامه دارد.",
    evidence:
      "زمان و کیفیت تگ، اتصال و منبع داده، نسخهٔ پروژه و رویدادهای قابل دسترس.",
    lesson: "truth",
    source:
      "https://docs.tia.siemens.cloud/r/unified_comfort_panels_enus_20/technical-information/technical-specifications/mtp700-mtp1000-mtp1200-unified-comfort",
  },
  {
    id: "moxa",
    name: "Moxa EDS-4008",
    category: "نمایش، شبکه و برق",
    role: "سوئیچ مدیریت‌پذیر لایهٔ دو برای شبکهٔ صنعتی.",
    use: "شناخت مسیر ارتباط، پورت، توپولوژی و وابستگی تجهیزات.",
    connections:
      "گونه‌های پورت و رسانه تابع مدل؛ EDS-G4008 خانوادهٔ نام‌گذاری جداگانه‌ای است.",
    identity: "کد دقیق، Firmware، پیکربندی پورت، VLAN و توپولوژی واقعی.",
    failure:
      "Link up بودن پورت، تحویل به‌موقع داده یا درستی مقدار فرایندی را ثابت نمی‌کند.",
    evidence:
      "شمارندهٔ خطا، رخدادهای لینک، تغییر پیکربندی و نقشهٔ اتصال تأییدشده.",
    lesson: "evidence",
    source:
      "https://moxa.com/en/products/industrial-network-infrastructure/ethernet-switches/layer-2-managed-switches/eds-4008-series",
  },
  {
    id: "sicam",
    name: "Siemens SICAM A8000 · CP-8050",
    category: "نمایش، شبکه و برق",
    role: "واحد اتوماسیون و تله‌کنترل در خانوادهٔ SICAM A8000.",
    use: "شناخت نقش RTU، گردآوری داده و ارتباط با سامانه‌های نظارتی برق.",
    connections: "ماژول‌های I/O و ارتباط بر اساس پروژه و گزینه‌های نصب.",
    identity: "CP دقیق، ماژول‌ها، نسخه‌ها، برنامه و نگاشت نقاط.",
    failure:
      "قطع مسیر نظارتی الزاماً به‌معنای ازکارافتادن تمام منطق محلی نیست.",
    evidence: "نگاشت نقاط، وضعیت ارتباط، کیفیت و زمان داده و سوابق پیکربندی.",
    lesson: "chain",
    source: "https://www.siemens.com/en-gb/products/sicam/a8000-cp8050/",
  },
  {
    id: "siprotec",
    name: "Siemens SIPROTEC 7SJ85",
    category: "نمایش، شبکه و برق",
    role: "رلهٔ حفاظت و کنترل فیدر در خانوادهٔ SIPROTEC 5.",
    use: "تمایز حفاظت الکتریکی، فرمان کنترلی و نظارت؛ حضور شبکه نقش حفاظتی را حذف نمی‌کند.",
    connections:
      "ورودی‌های مرتبط با اندازه‌گیری و وضعیت، خروجی‌ها و ارتباطات مطابق طرح.",
    identity: "کد دقیق، گزینه‌ها، نسخه، مجموعهٔ تنظیمات و نسخهٔ ابزار مهندسی.",
    failure:
      "رویداد حفاظتی را باید با زمان، وضعیت شبکهٔ برق و تنظیمات مصوب تفسیر کرد.",
    evidence:
      "رکورد رخداد و اغتشاش و نسخهٔ تنظیمات با مالکیت و زمان مشخص؛ تمرین شامل تغییر تنظیم حفاظت نیست.",
    lesson: "evidence",
    source: "https://www.siemens.com/en-gb/products/siprotec/7sj85/",
  },
];
