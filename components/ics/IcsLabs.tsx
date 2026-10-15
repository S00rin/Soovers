"use client";
import { useEffect, useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  ArrowLeft,
  Check,
} from "lucide-react";
import {
  advanceTank,
  currentToLevel,
  levelToCurrent,
  loopMargin,
  initialTank,
  evidenceItems,
  type Scenario,
  type ControlMode,
  type TankSample,
} from "@/lib/ics/model";
export function downloadData(name: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob(
      [typeof data === "string" ? data : JSON.stringify(data, null, 2)],
      {
        type: name.endsWith(".csv")
          ? "text/csv;charset=utf-8"
          : "application/json",
      },
    ),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const number = (n: number, d = 2) =>
  n.toLocaleString("fa-IR", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
export function PlantDiagram({
  level = 2,
  command = 50,
}: {
  level?: number;
  command?: number;
}) {
  return (
    <svg
      className="ics-plant"
      viewBox="0 0 640 300"
      role="img"
      aria-label={`شماتیک آموزشی مخزن، ترانسمیتر، PLC و پمپ؛ سطح ${number(level)} متر`}
    >
      <defs>
        <pattern
          id="ics-grid"
          width="24"
          height="24"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 24 0 L 0 0 0 24"
            fill="none"
            stroke="#263a3e"
            strokeWidth=".5"
          />
        </pattern>
        <linearGradient id="ics-water" x2="0" y2="1">
          <stop stopColor="#56c8b9" stopOpacity=".6" />
          <stop offset="1" stopColor="#1f737b" stopOpacity=".25" />
        </linearGradient>
      </defs>
      <rect width="640" height="300" rx="18" fill="url(#ics-grid)" />
      <path
        d="M25 80H125V115 M275 232H425 M475 232H610"
        fill="none"
        stroke="#77d2c5"
        strokeWidth="8"
      />
      <path
        d="m90 72 12 8-12 8m490 216 16 16-16 16"
        fill="none"
        stroke="#77d2c5"
        strokeWidth="2"
      />
      <rect
        x="125"
        y="67"
        width="150"
        height="188"
        rx="10"
        fill="#0a1d22"
        stroke="#8caaa9"
        strokeWidth="2"
      />
      <rect
        x="128"
        y={251 - (level / 4) * 180}
        width="144"
        height={Math.max(1, (level / 4) * 180)}
        fill="url(#ics-water)"
      />
      <path d="M130 161H270" stroke="#efd4a4" strokeDasharray="5 5" />
      <text x="200" y="43" textAnchor="middle">
        TK-101
      </text>
      <text x="200" y="205" textAnchor="middle" className="ics-svg-value">
        {level.toFixed(2)} m
      </text>
      <text x="290" y="165">
        SP 2.0 m
      </text>
      <circle
        cx="450"
        cy="232"
        r="27"
        fill="#173238"
        stroke="#e7b479"
        strokeWidth="2"
      />
      <path d="m440 215 24 17-24 17Z" fill="#e7b479" />
      <text x="450" y="283" textAnchor="middle">
        P-101 · {command.toFixed(0)}%
      </text>
      <circle cx="315" cy="92" r="23" fill="#102b31" stroke="#e7b479" />
      <text x="315" y="97" textAnchor="middle">
        LT
      </text>
      <path
        d="M275 92H292 M338 92H400 M455 128V205"
        fill="none"
        stroke="#e7b479"
        strokeWidth="2"
        strokeDasharray="6 5"
      />
      <rect
        x="400"
        y="55"
        width="110"
        height="73"
        rx="7"
        fill="#173238"
        stroke="#92a9a9"
      />
      <text x="455" y="86" textAnchor="middle">
        PLC
      </text>
      <text x="455" y="110" textAnchor="middle">
        PV → u
      </text>
      <path d="M510 91H560" stroke="#899be9" strokeDasharray="4 4" />
      <rect
        x="560"
        y="62"
        width="66"
        height="57"
        rx="5"
        fill="#1b2341"
        stroke="#899be9"
      />
      <text x="593" y="96" textAnchor="middle">
        HMI
      </text>
    </svg>
  );
}
export function TankLab() {
  const [scenario, setScenario] = useState<Scenario>("disturbance"),
    [mode, setMode] = useState<ControlMode>("P"),
    [history, setHistory] = useState<TankSample[]>([initialTank()]),
    [playing, setPlaying] = useState(false);
  const s = history[history.length - 1];
  useEffect(() => {
    if (!playing || s.time >= 1200) return;
    const id = setInterval(
      () => setHistory((h) => advanceTank(h, scenario, mode)),
      400,
    );
    return () => clearInterval(id);
  }, [playing, scenario, mode, s.time]);
  const reset = () => {
    setPlaying(false);
    setHistory([initialTank()]);
  };
  const path = (key: "level" | "pv" | "display") =>
    history
      .filter((_, i) => i % 5 === 0 || i === history.length - 1)
      .map(
        (p, i) =>
          `${i ? "L" : "M"}${45 + (p.time / 1200) * 640},${220 - (p[key] / 4) * 190}`,
      )
      .join(" ");
  return (
    <section className="ics-lab" aria-label="آزمایشگاه مخزن">
      <div className="ics-section-head">
        <div>
          <span className="ics-eyebrow">LAB 01 / PROCESS & SIGNAL</span>
          <h2>سه مقدار؛ یک فرایند</h2>
          <p>سطح واقعی، ورودی کنترلر و نمایش HMI را در یک خط زمانی دنبال کن.</p>
        </div>
        <span className="ics-tag">شبیه‌سازی آموزشی</span>
      </div>
      <div className="ics-lab-toolbar">
        <label>
          سناریو
          <select
            aria-label="سناریو"
            value={scenario}
            onChange={(e) => {
              setScenario(e.target.value as Scenario);
              reset();
            }}
          >
            <option value="normal">تعادل عادی</option>
            <option value="disturbance">افزایش ورودی</option>
            <option value="sensor">حسگر ثابت</option>
            <option value="hmi">HMI قدیمی</option>
          </select>
        </label>
        <label>
          کنترل
          <select
            aria-label="کنترل"
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as ControlMode);
              reset();
            }}
          >
            <option>P</option>
            <option>PI</option>
          </select>
        </label>
        <button
          className="ics-primary"
          disabled={s.time >= 1200}
          onClick={() => setPlaying(!playing)}
        >
          {playing && s.time < 1200 ? <Pause size={16} /> : <Play size={16} />}{" "}
          {playing && s.time < 1200 ? "توقف" : "اجرای شبیه‌سازی"}
        </button>
        <button
          disabled={s.time >= 1200 || playing}
          onClick={() => setHistory((h) => advanceTank(h, scenario, mode))}
        >
          ۶۰ ثانیه جلو
        </button>
        <button onClick={reset} aria-label="بازنشانی شبیه‌سازی">
          <RotateCcw size={17} />
        </button>
      </div>
      <p className="ics-note">
        پس از ثانیهٔ ۳۰۰، ورودی از ۱۰ به ۱۴ لیتر بر ثانیه می‌رسد (به‌جز تعادل
        عادی). خطای انتخاب‌شده نیز از همین زمان اعمال می‌شود.
      </p>
      <div className="ics-simulation">
        <PlantDiagram level={s.level} command={s.command} />
        <div className="ics-readouts" aria-live="off">
          {[
            ["زمان مدل", number(s.time, 0) + " s"],
            ["سطح فیزیکی مدل", number(s.level) + " m"],
            ["ورودی PLC", number(s.pv) + " m"],
            ["نمایش HMI", number(s.display) + " m"],
            ["سن نمونهٔ HMI", number(s.age, 0) + " s"],
            ["خروجی پمپ", number(s.outflow) + " L/s"],
          ].map(([label, value]) => (
            <div key={label}>
              <small>{label}</small>
              <b dir="ltr">{value}</b>
            </div>
          ))}
        </div>
      </div>
      <figure className="ics-chart">
        <svg
          viewBox="0 0 720 260"
          role="img"
          aria-label="نمودار سطح فیزیکی، ورودی کنترلر و نمایش HMI بر حسب زمان"
        >
          <text x="12" y="20">
            m
          </text>
          {[0, 1, 2, 3, 4].map((v) => (
            <g key={v}>
              <path
                d={`M45 ${220 - (v / 4) * 190}H685`}
                stroke="#314249"
                strokeDasharray="3 5"
              />
              <text x="20" y={225 - (v / 4) * 190}>
                {v}
              </text>
            </g>
          ))}
          {[0, 300, 600, 900, 1200].map((v) => (
            <text x={45 + (v / 1200) * 640} y="246" textAnchor="middle" key={v}>
              {v}s
            </text>
          ))}
          <path
            d={path("level")}
            fill="none"
            stroke="#67d7bd"
            strokeWidth="3"
          />
          <path
            d={path("pv")}
            fill="none"
            stroke="#e9b876"
            strokeWidth="2.5"
            strokeDasharray="8 5"
          />
          <path
            d={path("display")}
            fill="none"
            stroke="#9b9def"
            strokeWidth="2.5"
            strokeDasharray="2 5"
          />
        </svg>
        <figcaption>
          <span>● سطح فیزیکی</span>
          <span>━ ورودی PLC</span>
          <span>┄ نمایش HMI</span>
        </figcaption>
      </figure>
      <div className="ics-callout">
        <strong>
          {scenario === "sensor"
            ? "تازه‌بودن، درست‌بودن نیست."
            : scenario === "hmi"
              ? "نمایش ثابت، الزاماً کنترل ثابت نیست."
              : "رفتار را قبل از اجرا پیش‌بینی کن."}
        </strong>
        <p>
          {scenario === "sensor"
            ? "PV روی ۲ متر می‌ماند؛ HMI نسخه‌های تازه از همان مقدار را دریافت می‌کند. سطح فیزیکی با افزایش ورودی بالا می‌رود."
            : scenario === "hmi"
              ? "کنترل محلی ادامه دارد؛ نمایشگر نمونهٔ قدیمی را نگه می‌دارد و سن نمونه افزایش می‌یابد."
              : "برای کنترل P با ورودی ۱۴، انتظار تعادل نزدیک ۲٫۲۵ متر داریم. PI را با همان شرایط اجرا و روند را مقایسه کن."}
        </p>
      </div>
      <button
        onClick={() =>
          downloadData(
            "SooVers-ICS-tank.csv",
            "simulation_seconds,physical_level_m,controller_pv_m,hmi_m,hmi_age_s,pump_command_pct,inflow_lps,outflow_lps\n" +
              history
                .map((p) =>
                  [
                    p.time,
                    p.level,
                    p.pv,
                    p.display,
                    p.age,
                    p.command,
                    p.inflow,
                    p.outflow,
                  ].join(","),
                )
                .join("\n"),
          )
        }
      >
        <Download size={16} />
        دریافت دادهٔ شبیه‌سازی CSV
      </button>
      <details>
        <summary>فرض‌ها و محدودیت مدل</summary>
        <p>
          مخزن فرضی با سطح مقطع ۲ مترمربع؛ SP=۲ متر، پمپ خطی ۰–۲۰ لیتر بر ثانیه،
          گام عددی یک ثانیه و Kp=۸۰. در PI، Ki=۰٫۴ است. نمودار جایگزین منحنی
          واقعی پمپ یا زمان‌بندی PLC نیست. سطح فیزیکی فقط چون مدل را می‌شناسیم
          در دسترس است. بازهٔ اجرا ۱۲۰۰ ثانیه است؛ اشباع خروجی و محدودیت انتگرال
          اعمال می‌شود.
        </p>
      </details>
    </section>
  );
}
function Slider({
  label,
  value,
  set,
  min,
  max,
  step = 1,
  unit,
}: {
  label: string;
  value: number;
  set: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit: string;
}) {
  return (
    <label className="ics-slider">
      <span>
        {label}
        <b dir="ltr">
          {number(value)} {unit}
        </b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
      />
    </label>
  );
}
export function SignalLab() {
  const [current, setCurrent] = useState(10),
    [level, setLevel] = useState(2),
    [tx, setTx] = useState(8),
    [plc, setPlc] = useState(4),
    [supply, setSupply] = useState(24),
    [resistance, setResistance] = useState(250),
    [minimum, setMinimum] = useState(12),
    [budgetCurrent, setBudgetCurrent] = useState(20);
  const scaled = currentToLevel(current),
    sent = levelToCurrent(level, 0, tx),
    received = currentToLevel(sent, 0, plc),
    budget = loopMargin(supply, resistance, minimum, budgetCurrent);
  return (
    <section>
      <div className="ics-section-head">
        <div>
          <span className="ics-eyebrow">LAB 02 / MEASUREMENT QUALITY</span>
          <h2>سیگنال را تا معنای آن دنبال کن</h2>
          <p>
            هر کنترل را تغییر بده؛ محاسبه و تفسیر آن هم‌زمان به‌روز می‌شوند.
          </p>
        </div>
      </div>
      <div className="ics-signal-grid">
        <article className="ics-panel">
          <h3>۰۱ / مقیاس‌گذاری و اعتبار</h3>
          <Slider
            label="جریان ورودی"
            value={current}
            set={setCurrent}
            min={0}
            max={24}
            step={0.5}
            unit="mA"
          />
          <div className="ics-result" data-testid="scaling-result">
            <b>{number(scaled.value)} متر</b>
            <span>
              {scaled.valid
                ? "داخل بازهٔ اسمی ۴–۲۰ mA"
                : "خارج از بازهٔ اسمی؛ اندازه‌گیری معتبر فرض نشود"}
            </span>
          </div>
          <code dir="ltr">h = (I − 4) / 16 × 4</code>
          <p>
            در این تمرین بازهٔ سطح صفر تا چهار متر است. عدد منفی حاصل فرمول، سطح
            فیزیکی منفی را اثبات نمی‌کند.
          </p>
        </article>
        <article className="ics-panel">
          <h3>۰۲ / بودجهٔ ولتاژ حلقه</h3>
          <Slider
            label="منبع"
            value={supply}
            set={setSupply}
            min={12}
            max={30}
            unit="V"
          />
          <Slider
            label="مقاومت کل مسیر"
            value={resistance}
            set={setResistance}
            min={0}
            max={1000}
            step={50}
            unit="Ω"
          />
          <Slider
            label="حداقل ولتاژ ترانسمیتر"
            value={minimum}
            set={setMinimum}
            min={8}
            max={16}
            unit="V"
          />
          <Slider
            label="جریان بررسی بودجه"
            value={budgetCurrent}
            set={setBudgetCurrent}
            min={4}
            max={22}
            unit="mA"
          />
          <div className="ics-result" data-testid="loop-result">
            <b dir="ltr">{number(budget.margin)} V</b>
            <span>
              {budget.margin >= 0
                ? "حاشیهٔ محاسبه‌شده غیرمنفی است"
                : "بودجه برای فرض‌های این مدل کافی نیست"}
            </span>
          </div>
          <p>
            افت مقاومتی: {number(budget.drop)} ولت. مقاومت کل شامل مسیر رفت و
            برگشت و ورودی است؛ افت سایر اجزا در این مدل ساده منظور نشده است.
            نتیجهٔ جریان کم را به جریان بالا تعمیم نده.
          </p>
        </article>
        <article className="ics-panel ics-wide">
          <h3>۰۳ / عدد معقول، رنج ناسازگار</h3>
          <div className="ics-three">
            <Slider
              label="سطح واقعی مدل"
              value={level}
              set={setLevel}
              min={0}
              max={4}
              step={0.25}
              unit="m"
            />
            <Slider
              label="حد بالای ترانسمیتر"
              value={tx}
              set={setTx}
              min={4}
              max={8}
              unit="m"
            />
            <Slider
              label="حد بالای PLC"
              value={plc}
              set={setPlc}
              min={4}
              max={8}
              unit="m"
            />
          </div>
          <div className="ics-signal-chain" data-testid="mismatch-result">
            <span>
              مخزن <b>{number(level)} m</b>
            </span>
            <ArrowLeft />
            <span>
              ترانسمیتر <b>{number(sent)} mA</b>
            </span>
            <ArrowLeft />
            <span>
              PLC / HMI <b>{number(received.value)} m</b>
            </span>
          </div>
          <p>
            {Math.abs(received.value - level) < 0.001
              ? "رنج‌ها در این وضعیت با مقدار فرایند سازگارند."
              : "سیگنال داخل بازه است، اما تفسیر PLC با سطح واقعی مدل اختلاف دارد."}{" "}
            توافق HMI و Historian که از همان تگ می‌خوانند، شاهد مستقل نیست.
          </p>
        </article>
      </div>
    </section>
  );
}
export function EvidenceLab({
  notes,
  onNotes,
  saveNotes,
  savedNotes,
}: {
  notes: string;
  onNotes: (value: string) => void;
  saveNotes: () => void;
  savedNotes: string;
}) {
  const [revealed, setRevealed] = useState<string[]>([]),
    [choice, setChoice] = useState<number | null>(null),
    [checked, setChecked] = useState(false);
  return (
    <section>
      <div className="ics-section-head">
        <div>
          <span className="ics-eyebrow">LAB 03 / EVIDENCE WORKBENCH</span>
          <h2>پروندهٔ LT-101</h2>
          <p>
            گزارش نمایش سطح غیرمنتظره رسیده است. شواهد ساختگی را باز کن و یک
            نتیجهٔ محدود و قابل دفاع بنویس.
          </p>
        </div>
      </div>
      <div className="ics-evidence-grid">
        {evidenceItems.map((item, i) => (
          <article className="ics-panel" key={item.id}>
            <span className="ics-eyebrow">EVIDENCE / 0{i + 1}</span>
            <h3>{item.title}</h3>
            <p>{item.observation}</p>
            <button
              onClick={() =>
                setRevealed((a) =>
                  a.includes(item.id)
                    ? a.filter((v) => v !== item.id)
                    : [...a, item.id],
                )
              }
              aria-expanded={revealed.includes(item.id)}
            >
              تفسیر و محدودیت شاهد
            </button>
            {revealed.includes(item.id) && (
              <p className="ics-note">{item.meaning}</p>
            )}
          </article>
        ))}
      </div>
      <article className="ics-panel">
        <h3>جمع‌بندی اختیاری</h3>
        <p>کدام نتیجه با اطلاعات موجود سازگارتر است؟</p>
        <div className="ics-options">
          {[
            "یک ورود به EWS، حمله و تغییر برنامه را ثابت می‌کند.",
            "ناسازگاری رنج قابل مشاهده است؛ زمان، مجوز و عامل تغییر هنوز نیاز به شاهد دارد.",
            "چون HMI و Historian برابرند، سطح واقعی قطعاً یک متر است.",
          ].map((text, i) => (
            <button
              key={text}
              aria-pressed={choice === i}
              onClick={() => {
                setChoice(i);
                setChecked(false);
              }}
            >
              {text}
            </button>
          ))}
        </div>
        <button
          className="ics-primary"
          disabled={choice === null}
          onClick={() => setChecked(true)}
        >
          بررسی استدلال
        </button>
        {checked && (
          <p role="status" className="ics-callout">
            {choice === 1
              ? "استدلال درست است."
              : "این نتیجه بیش از شواهد موجود ادعا می‌کند."}{" "}
            اختلاف رنج مشخص است؛ انتساب تغییر به رکورد عملیات، نسخهٔ قبل/بعد و
            مجوز مرتبط نیاز دارد.
          </p>
        )}
      </article>
      <article className="ics-panel">
        <h3>دفتر شواهد من</h3>
        <p>
          برای هر سؤال بنویس: دارایی، منبع و محل داده، مالک، زمان، نگهداریِ
          مشاهده‌شده، وابستگی و روش آزمون بازیابی. مقدار نامعلوم را نامعلوم نگه
          دار.
        </p>
        <label className="ics-notes-label">
          یادداشت پرونده
          <textarea
            maxLength={6000}
            rows={8}
            value={notes}
            onChange={(e) => onNotes(e.target.value)}
            placeholder="مشاهده: …\nفرضیه‌ها: …\nسؤال و منبع پاسخ: …\nمحدودیت و اقدام بررسی: …"
          />
        </label>
        <div className="ics-actions">
          <button className="ics-primary" onClick={saveNotes}>
            <Check size={16} />
            ذخیرهٔ یادداشت
          </button>
          <small>
            {notes === savedNotes
              ? "یادداشت با پیشرفت فعلی یکسان است"
              : "تغییرات یادداشت هنوز ثبت نشده است"}
          </small>
          <button
            onClick={() =>
              downloadData("SooVers-ICS-evidence-note.json", {
                simulation: true,
                case: "LT-101",
                note: notes,
                createdAt: new Date().toISOString(),
              })
            }
          >
            <Download size={16} />
            دریافت یادداشت
          </button>
        </div>
      </article>
    </section>
  );
}
