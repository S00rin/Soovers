"use client";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  Activity,
  ArrowLeft,
  BookOpen,
  Check,
  ChevronLeft,
  Download,
  Factory,
  FlaskConical,
  GraduationCap,
  Library,
  Map,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  lessons,
  contentVersion,
  roadmap,
  sharedConversation,
} from "@/lib/ics/content";
import { devices } from "@/lib/ics/devices";
import book from "@/lib/ics/book.json";
import {
  ICS_STORAGE_KEY,
  gradeAnswer,
  initialProgress,
  parseProgress,
  type LearningProgress,
  type QuizResults,
} from "@/lib/ics/model";
import { api, type User } from "@/lib/product/api";
import {
  TankLab,
  SignalLab,
  EvidenceLab,
  PlantDiagram,
  downloadData,
} from "./IcsLabs";
import "./ics.css";
type View =
  | "home"
  | "lessons"
  | "tank"
  | "signal"
  | "evidence"
  | "atlas"
  | "glossary"
  | "roadmap"
  | "sources";
type RecordData = { progress: LearningProgress; results: QuizResults };
const fa = (n: number) => n.toLocaleString("fa-IR");
const tabs: { id: View; label: string; icon: typeof BookOpen }[] = [
  { id: "home", label: "آکادمی", icon: Factory },
  { id: "lessons", label: "درس‌ها", icon: BookOpen },
  { id: "tank", label: "مخزن و کنترل", icon: Activity },
  { id: "signal", label: "سیگنال و رنج", icon: FlaskConical },
  { id: "evidence", label: "میز شواهد", icon: ShieldCheck },
  { id: "atlas", label: "اطلس تجهیزات", icon: Library },
  { id: "glossary", label: "واژه‌نامه", icon: Search },
  { id: "roadmap", label: "مسیر دوره", icon: Map },
  { id: "sources", label: "منابع", icon: GraduationCap },
];
const reading: Record<string, string[]> = {
  process: ["1.1", "1.2"],
  chain: ["1.3", "1.6", "1.9", "1.11", "1.12"],
  scaling: ["1.4", "1.5", "1.15"],
  feedback: ["1.7", "1.8", "1.16"],
  truth: ["1.10", "1.13", "1.14"],
  electricity: ["2.1", "2.2", "2.3", "2.4", "2.14"],
  io: ["2.5", "2.6", "2.11"],
  mismatch: ["2.7", "2.8", "2.9", "2.10", "2.12", "2.15"],
  asset: ["2.16", "E13", "E14"],
  evidence: ["1.17", "1.18", "1.19", "2.13", "2.17", "2.18"],
};
function cleanResults(value: unknown): QuizResults {
  const out: QuizResults = {};
  if (value && typeof value === "object")
    for (const [id, v] of Object.entries(value)) {
      try {
        const answer = gradeAnswer(id, (v as { choice: number }).choice);
        out[id] = { choice: answer.choice, correct: answer.correct };
      } catch {}
    }
  return out;
}
function BookReading({ ids }: { ids: string[] }) {
  return (
    <div className="ics-reading">
      <h3>مطالعهٔ عمیق از کتاب دانشجو</h3>
      <p>
        متن انگلیسی سند ارسالی، با شمارهٔ بخش اصلی. تصاویر و فایل‌های آزمایشگاهِ
        ارجاع‌شده در متن، همراه این خوانش نیستند؛ تمرین‌های تعاملی این صفحه
        پیاده‌سازی مستقل آموزشی‌اند.
      </p>
      {ids.map((id) => {
        const section = book.sections[id as keyof typeof book.sections];
        return section ? (
          <details key={id}>
            <summary dir="ltr">{section.title}</summary>
            <div lang="en" dir="ltr" className="ics-book-text">
              {section.blocks.map((block, i) =>
                block.type === "table" && "rows" in block ? (
                  <div className="ics-table-scroll" key={i}>
                    <table>
                      <tbody>
                        {block.rows?.map((row, j) => (
                          <tr key={j}>
                            {row.map((cell, k) =>
                              j === 0 ? (
                                <th scope="col" key={k}>
                                  {cell}
                                </th>
                              ) : (
                                <td key={k}>{cell}</td>
                              ),
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : "text" in block ? (
                  <p key={i}>{block.text}</p>
                ) : null,
              )}
            </div>
          </details>
        ) : null;
      })}
    </div>
  );
}
export default function IcsAcademy({ account }: { account?: User }) {
  const [view, setView] = useState<View>("home"),
    [progress, setProgress] = useState<LearningProgress>(initialProgress),
    [results, setResults] = useState<QuizResults>({}),
    [ready, setReady] = useState(false),
    [loadError, setLoadError] = useState(""),
    [sync, setSync] = useState(""),
    [notes, setNotes] = useState(""),
    [quizBusy, setQuizBusy] = useState(false),
    [quizError, setQuizError] = useState(""),
    [reload, setReload] = useState(0);
  const latest = useRef(progress),
    notesRef = useRef(notes),
    pending = useRef<LearningProgress | null>(null),
    queue = useRef<Promise<void>>(Promise.resolve()),
    mounted = useRef(true),
    title = useRef<HTMLHeadingElement>(null),
    content = useRef<HTMLDivElement>(null),
    resultsRef = useRef(results);
  latest.current = progress;
  notesRef.current = notes;
  resultsRef.current = results;
  useEffect(() => {
    mounted.current = true;
    let active = true;
    setReady(false);
    setLoadError("");
    (async () => {
      try {
        let data: RecordData;
        if (account) {
          data = await api<RecordData>("/ics");
        } else {
          let raw = "";
          try {
            raw = localStorage.getItem(ICS_STORAGE_KEY) || "";
          } catch {
            if (active)
              setSync(
                "ذخیرهٔ مرورگر در دسترس نیست؛ دریافت گزارش همچنان ممکن است.",
              );
          }
          try {
            data = raw
              ? JSON.parse(raw)
              : { progress: initialProgress(), results: {} };
          } catch {
            data = { progress: initialProgress(), results: {} };
          }
        }
        if (active) {
          const p = parseProgress(data.progress);
          setProgress(p);
          setNotes(p.notes);
          setResults(cleanResults(data.results));
          setReady(true);
        }
      } catch (e) {
        if (active)
          setLoadError(
            e instanceof Error ? e.message : "بارگذاری پیشرفت انجام نشد.",
          );
      }
    })();
    return () => {
      active = false;
      mounted.current = false;
    };
  }, [account?.id, reload]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (pending.current || notesRef.current !== latest.current.notes) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  function persist(next: LearningProgress) {
    pending.current = next;
    setSync("در حال ذخیره…");
    const task = queue.current
      .catch(() => {})
      .then(async () => {
        try {
          if (account)
            await api("/ics/progress", "PATCH", {
              ...next,
              expectedUserId: account.id,
            });
          else
            localStorage.setItem(
              ICS_STORAGE_KEY,
              JSON.stringify({ progress: next, results: resultsRef.current }),
            );
          if (pending.current === next) {
            pending.current = null;
            if (mounted.current)
              setSync(
                account ? "در حساب شما ذخیره شد" : "در این مرورگر ذخیره شد",
              );
          }
        } catch (e) {
          if (mounted.current)
            setSync(
              e instanceof Error
                ? e.message
                : "ذخیره انجام نشد؛ دوباره تلاش کن.",
            );
          throw e;
        }
      });
    queue.current = task;
    return task;
  }
  function change(next: LearningProgress) {
    latest.current = next;
    setProgress(next);
    void persist(next).catch(() => {});
  }
  function go(next: View) {
    setView(next);
    setQuizError("");
    requestAnimationFrame(() => {
      content.current?.scrollTo(0, 0);
      window.scrollTo(0, 0);
      title.current?.focus({ preventScroll: true });
    });
  }
  function openLesson(id: string) {
    change({ ...latest.current, lesson: id });
    go("lessons");
  }
  async function leave(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const destination = event.currentTarget.hash;
    if (notesRef.current !== latest.current.notes) {
      const next = { ...latest.current, notes: notesRef.current };
      setProgress(next);
      latest.current = next;
      try {
        await persist(next);
      } catch {
        return;
      }
    }
    try {
      await queue.current;
      if (pending.current) await persist(pending.current);
      location.hash = destination;
    } catch {
      setSync("خروج انجام نشد؛ ابتدا ذخیره را دوباره امتحان کن.");
    }
  }
  async function answer(choice: number) {
    if (quizBusy) return;
    setQuizBusy(true);
    setQuizError("");
    try {
      const id = progress.lesson;
      const result = account
        ? await api<{ choice: number; correct: boolean; explanation: string }>(
            "/ics/assessment",
            "POST",
            { lesson: id, choice, expectedUserId: account.id },
          )
        : gradeAnswer(id, choice);
      const next = {
        ...resultsRef.current,
        [id]: { choice: result.choice, correct: result.correct },
      };
      resultsRef.current = next;
      setResults(next);
      if (!account) {
        try {
          localStorage.setItem(
            ICS_STORAGE_KEY,
            JSON.stringify({ progress: latest.current, results: next }),
          );
        } catch {
          setSync("نتیجه در حافظه است؛ ذخیرهٔ مرورگر در دسترس نیست.");
        }
      }
    } catch (e) {
      setQuizError(e instanceof Error ? e.message : "پاسخ ثبت نشد.");
    } finally {
      setQuizBusy(false);
    }
  }
  async function report() {
    try {
      await queue.current;
      if (pending.current) await persist(pending.current);
      const data = account
        ? await api("/ics/report")
        : {
            course: "ics-foundations",
            contentVersion,
            simulation: true,
            progress: latest.current,
            results: resultsRef.current,
            assessmentOptional: true,
          };
      downloadData("SooVers-ICS-learning.json", data);
    } catch (e) {
      setSync(e instanceof Error ? e.message : "دریافت گزارش انجام نشد.");
    }
  }
  const lesson = lessons.find((l) => l.id === progress.lesson) ?? lessons[0],
    index = lessons.indexOf(lesson),
    completed = progress.completed.length;
  if (loadError)
    return (
      <main className="ics-app ics-loading" dir="rtl">
        <h1>پیشرفت دوره دریافت نشد</h1>
        <p role="alert">{loadError}</p>
        <button onClick={() => setReload((n) => n + 1)}>تلاش دوباره</button>
        <a href="#home">بازگشت به حساب</a>
      </main>
    );
  if (!ready)
    return (
      <main className="ics-app ics-loading" role="status" dir="rtl">
        در حال آماده‌سازی آکادمی کنترل صنعتی…
      </main>
    );
  return (
    <main className="ics-app" dir="rtl">
      <a
        className="ics-skip"
        href="#ics-content"
        onClick={(e) => {
          e.preventDefault();
          title.current?.focus();
        }}
      >
        رفتن به محتوا
      </a>
      <header className="ics-header">
        <a
          href={account ? "#home" : "#ics"}
          onClick={
            account
              ? leave
              : (e) => {
                  e.preventDefault();
                  go("home");
                }
          }
          className="ics-brand"
        >
          <span>S</span>
          <b dir="ltr">
            SooVers<small>INDUSTRIAL SYSTEMS ACADEMY</small>
          </b>
        </a>
        <div className="ics-header-links">
          <span className="ics-mode">
            {account ? account.name : "یادگیری آزاد · بدون ثبت‌نام"}
          </span>
          <a href={account ? "#academy" : "#demo"} onClick={leave}>
            آکادمی F5
          </a>
          <a href={account ? "#home" : "#tower"} onClick={leave}>
            {account ? "حساب من" : "پردیس سه‌بعدی"}
            <ChevronLeft size={14} />
          </a>
        </div>
      </header>
      <div className="ics-shell">
        <aside className="ics-sidebar">
          <span className="ics-eyebrow">LEARNING WORKSPACE / 01</span>
          <nav aria-label="بخش‌های آکادمی صنعتی">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                aria-label={label}
                aria-current={view === id ? "page" : undefined}
                onClick={() => go(id)}
              >
                <Icon size={18} />
                {label}
                {id === "atlas" && <small>۱۲</small>}
              </button>
            ))}
          </nav>
          <div className="ics-sidebar-progress">
            <span>
              پیشرفت مطالعه{" "}
              <b dir="ltr">
                {fa(completed)} / {fa(lessons.length)}
              </b>
            </span>
            <progress max={lessons.length} value={completed} />
            <small>خوداظهاری مطالعه؛ مستقل از آزمون</small>
            <p role="status">
              {sync ||
                (account ? "پیشرفت متصل به حساب" : "پیشرفت در همین مرورگر")}
            </p>
            {pending.current && (
              <button
                onClick={() => void persist(pending.current!).catch(() => {})}
              >
                تلاش دوباره برای ذخیره
              </button>
            )}
            <button onClick={() => void report()}>
              <Download size={15} />
              گزارش یادگیری
            </button>
          </div>
        </aside>
        <div className="ics-content" id="ics-content" ref={content}>
          <div className="ics-mobile-progress">
            <span role="status">
              {sync || `مطالعه: ${fa(completed)} از ${fa(lessons.length)}`}
            </span>
            {pending.current && (
              <button
                onClick={() => void persist(pending.current!).catch(() => {})}
              >
                تلاش دوباره برای ذخیره
              </button>
            )}
            <button
              onClick={() => void report()}
              aria-label="گزارش یادگیری موبایل"
            >
              <Download size={16} />
            </button>
          </div>
          <div className="ics-page-heading">
            <span className="ics-eyebrow">
              SOOVERS / ICS & OT / FOUNDATIONS
            </span>
            <h1 ref={title} tabIndex={-1}>
              {view === "home"
                ? "سیستم را بفهم. بعد تحلیل کن."
                : tabs.find((t) => t.id === view)?.label}
            </h1>
          </div>
          {view === "home" && (
            <>
              <section className="ics-hero">
                <div>
                  <span className="ics-tag">مسیر جدید / کنترل صنعتی</span>
                  <h2>
                    از یک قطره آب
                    <br />
                    تا یک تصمیم مهندسی.
                  </h2>
                  <p>
                    مخزن، حسگر، PLC و نمایشگر را به هم وصل کن. رفتار فرایند را
                    ببین، سیگنال را تفسیر کن و از شواهد نتیجه بگیر.
                  </p>
                  <div className="ics-actions">
                    <button
                      className="ics-primary"
                      onClick={() => openLesson(progress.lesson)}
                    >
                      {completed ? "ادامهٔ یادگیری" : "شروع یادگیری"}
                      <ArrowLeft size={17} />
                    </button>
                    <button onClick={() => go("tank")}>
                      ورود مستقیم به آزمایشگاه
                    </button>
                  </div>
                  <small>
                    بدون پیش‌نیاز اجباری یا تعیین سطح. هر درس و تمرین را آزادانه
                    باز کن.
                  </small>
                </div>
                <div className="ics-hero-visual">
                  <div className="ics-visual-label">
                    <span>PROCESS TRAINER / TK-101</span>
                    <i>● LOCAL SIMULATION</i>
                  </div>
                  <PlantDiagram />
                  <div className="ics-visual-legend">
                    <span>فرایند</span>
                    <span>سیگنال</span>
                    <span>کنترل</span>
                    <span>شواهد</span>
                  </div>
                </div>
              </section>
              <div className="ics-stats">
                {[
                  ["۱۰", "درس فارسی"],
                  ["۰۳", "میز تمرین تعاملی"],
                  ["۱۲", "پروفایل تجهیز"],
                  ["۱۰۲", "اصطلاح دوزبانه"],
                ].map(([value, label]) => (
                  <div key={label}>
                    <b>{value}</b>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              <div className="ics-section-head">
                <div>
                  <h2>پایه‌های یک تحلیل قابل اعتماد</h2>
                  <p>
                    بر پایهٔ فصل‌های ۱ و ۲ کتاب دانشجو، نسخهٔ دوم؛ همراه با
                    خوانش عمیق متن اصلی.
                  </p>
                </div>
                <button onClick={() => go("roadmap")}>
                  دیدن مسیر کامل
                  <ArrowLeft size={15} />
                </button>
              </div>
              <div className="ics-chapter-cards">
                {[1, 2].map((ch) => (
                  <article className="ics-panel" key={ch}>
                    <span className="ics-eyebrow">CHAPTER / 0{ch}</span>
                    <h3>
                      {ch === 1
                        ? "مخزن، پمپ و حلقهٔ کنترل"
                        : "برق، سیگنال و کیفیت اندازه‌گیری"}
                    </h3>
                    <p>
                      {ch === 1
                        ? "موازنهٔ حجم، ۴–۲۰ میلی‌آمپر، بازخورد و تفاوت فرایند با نمایش."
                        : "بودجهٔ حلقه، I/O، رنج ناسازگار، شناخت دارایی و برنامهٔ شواهد."}
                    </p>
                    {lessons
                      .filter((l) => l.chapter === ch)
                      .map((l) => (
                        <button
                          className="ics-lesson-link"
                          key={l.id}
                          onClick={() => openLesson(l.id)}
                        >
                          <span>
                            {progress.completed.includes(l.id) ? (
                              <Check size={15} />
                            ) : (
                              <BookOpen size={15} />
                            )}
                          </span>
                          {l.title}
                          <small>{fa(l.minutes)} دقیقه</small>
                        </button>
                      ))}
                  </article>
                ))}
              </div>
              <div className="ics-callout">
                <strong>ارزیابی برای یادگیری است.</strong>
                <p>
                  مطالعه و آزمایشگاه‌ها به نمره وابسته نیستند. زمان‌ها برآورد
                  مطالعهٔ راهنمای فارسی‌اند؛ متن عمیق و تمرین زمان بیشتری
                  می‌خواهند.
                </p>
              </div>
            </>
          )}
          {view === "lessons" && (
            <div className="ics-lesson-layout">
              <nav className="ics-lesson-nav" aria-label="فهرست درس‌ها">
                {lessons.map((l, i) => (
                  <button
                    key={l.id}
                    aria-current={l.id === lesson.id ? "step" : undefined}
                    onClick={() => openLesson(l.id)}
                  >
                    <span>
                      {progress.completed.includes(l.id) ? "✓" : fa(i + 1)}
                    </span>
                    {l.title}
                  </button>
                ))}
              </nav>
              <article className="ics-lesson">
                <span className="ics-eyebrow">
                  CHAPTER {lesson.chapter} / LESSON {index + 1} OF{" "}
                  {lessons.length}
                </span>
                <h2>{lesson.title}</h2>
                <p className="ics-objective">
                  در پایان این درس: {lesson.objective}
                </p>
                {lesson.sections.map((s) => (
                  <section key={s.title}>
                    <h3>{s.title}</h3>
                    <p>{s.text}</p>
                  </section>
                ))}
                <div className="ics-worked">
                  <span className="ics-eyebrow">WORKED EXAMPLE</span>
                  <h3>{lesson.example.title}</h3>
                  {lesson.example.formula && (
                    <pre dir="ltr">{lesson.example.formula}</pre>
                  )}
                  <p>{lesson.example.text}</p>
                </div>
                <div className="ics-callout">
                  <strong>ایدهٔ کلیدی</strong>
                  <p>{lesson.takeaway}</p>
                </div>
                <button
                  className="ics-primary"
                  onClick={() => go(lesson.activity)}
                >
                  این مفهوم را امتحان کن
                  <ArrowLeft size={16} />
                </button>
                <BookReading ids={reading[lesson.id]} />
                <section className="ics-quiz">
                  <span className="ics-tag">خودآزمایی اختیاری</span>
                  <h3>{lesson.question.prompt}</h3>
                  <div className="ics-options">
                    {lesson.question.options.map((option, i) => (
                      <button
                        disabled={quizBusy}
                        key={option}
                        aria-pressed={results[lesson.id]?.choice === i}
                        onClick={() => void answer(i)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  {quizError && <p role="alert">{quizError}</p>}
                  {results[lesson.id] && (
                    <p role="status" className="ics-answer">
                      {results[lesson.id].correct
                        ? "درست است."
                        : "یک بار دیگر بررسی کن."}{" "}
                      {lesson.question.explanation}
                    </p>
                  )}
                  <p className="ics-note">
                    می‌توانی بدون پاسخ‌دادن، مطالعه را ثبت کنی و ادامه بدهی.
                  </p>
                </section>
                <div className="ics-lesson-footer">
                  <button
                    onClick={() =>
                      change({
                        ...progress,
                        completed: [
                          ...new Set([...progress.completed, lesson.id]),
                        ],
                      })
                    }
                    disabled={progress.completed.includes(lesson.id)}
                  >
                    <Check size={16} />
                    {progress.completed.includes(lesson.id)
                      ? "مطالعه ثبت شد"
                      : "این درس را خواندم"}
                  </button>
                  {index < lessons.length - 1 && (
                    <button
                      className="ics-primary"
                      onClick={() => openLesson(lessons[index + 1].id)}
                    >
                      درس بعد
                      <ArrowLeft size={16} />
                    </button>
                  )}
                </div>
              </article>
            </div>
          )}
          {view === "tank" && <TankLab />}
          {view === "signal" && <SignalLab />}
          {view === "evidence" && (
            <EvidenceLab
              notes={notes}
              onNotes={setNotes}
              savedNotes={progress.notes}
              saveNotes={() => change({ ...latest.current, notes })}
            />
          )}
          {view === "atlas" && <Atlas openLesson={openLesson} />}
          {view === "glossary" && <Glossary />}
          {view === "roadmap" && (
            <section>
              <h2>از مبانی فرایند تا دفاع و تدریس</h2>
              <p>
                نقشهٔ کتاب شامل ۳۴ فصل در ۱۸ ماژول و برآورد ۸۱۶ ساعت است. این
                عدد برای کل برنامهٔ پیشنهادی است؛ محتوای فعلی محصول، فصل‌های ۱ و
                ۲ و اطلس اولیه را پوشش می‌دهد.
              </p>
              <div className="ics-roadmap">
                {roadmap.map(([chapters, name, hours], i) => (
                  <article className="ics-panel" key={name}>
                    <span className="ics-eyebrow">
                      MODULE / {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3>{name}</h3>
                    <p>
                      فصل {chapters} · {fa(hours)} ساعت برآورد کل ماژول
                    </p>
                    <span className="ics-tag">
                      {i === 0
                        ? "فصل‌های ۱ و ۲ در دسترس؛ فصل ۳ در برنامه"
                        : "در برنامهٔ توسعه"}
                    </span>
                    {i === 0 && (
                      <button onClick={() => openLesson("process")}>
                        شروع مبانی
                        <ArrowLeft size={15} />
                      </button>
                    )}
                  </article>
                ))}
              </div>
              <p className="ics-note">
                ترتیب مسیر پیشنهادی است؛ هیچ آزمون یا تعیین سطحی دسترسی به
                محتوای منتشرشده را قفل نمی‌کند.
              </p>
            </section>
          )}
          {view === "sources" && (
            <section className="ics-sources">
              <h2>محتوا از کجا آمده است؟</h2>
              <article className="ics-panel">
                <h3>کتاب دانشجو — Release 2</h3>
                <p>
                  Industrial Automation, ICS, SCADA, and OT Cybersecurity · Book
                  B · 15 October 2026. سند ارسالی شما مبنای خوانش انگلیسی ۳۷ بخش
                  درسی، ۱۴ بخش اطلس و واژه‌نامهٔ ۱۰۲ اصطلاحی است. راهنمای فارسی
                  و تمرین‌های وب برای این محصول تدوین شده‌اند.
                </p>
                <a href={sharedConversation} target="_blank" rel="noreferrer">
                  گفت‌وگوی مبنای کتاب ↗
                </a>
                <p>
                  فایل‌های اصلی SANS و بستهٔ Python همراه کتاب در این مرحله
                  دریافت نشده‌اند. ارجاع‌های S410 و S515 در خوانش انگلیسی،
                  ارجاع‌های خود کتاب‌اند؛ به معنی بررسی مستقل جزوه‌ها یا وابستگی
                  رسمی این آکادمی به SANS نیستند.
                </p>
              </article>
              <article className="ics-panel">
                <h3>مرجع OT و مستندات سازنده</h3>
                <a
                  href="https://csrc.nist.gov/pubs/sp/800/82/r3/final"
                  target="_blank"
                  rel="noreferrer"
                >
                  NIST SP 800-82 Rev. 3 ↗
                </a>
                <p>
                  راهنمای منتشرشدهٔ OT؛ Rev. 4 در تاریخ بررسی ۱۵ اکتبر ۲۰۲۶
                  پیش‌نویس عمومی است. در هر پروفایل اطلس، لینک سازنده برای بررسی
                  دقیق مدل آمده است. معرفی مدل‌ها، ادعای میزان نصب در ایران
                  نیست.
                </p>
              </article>
              <article className="ics-panel">
                <h3>حدود تمرین‌ها</h3>
                <p>
                  مخزن، داده‌ها و پرونده‌ها ساختگی‌اند. هیچ تمرین به PLC، شبکه
                  یا تجهیز واقعی وصل نمی‌شود. شبیه‌ساز TypeScript مستقلاً در این
                  محصول ساخته شده؛ گام زمانی و نتایج آن نباید به‌عنوان اجرای
                  فایل Python کتاب یا رفتار تأییدشدهٔ سخت‌افزار معرفی شوند.
                  شکل‌های تعاملی شماتیک‌اند، نه عکس یک مدل واقعی.
                </p>
              </article>
              <details>
                <summary>فهرست منابع ثبت‌شده در سند اصلی</summary>
                <div className="ics-book-text" lang="en" dir="ltr">
                  {book.references.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </details>
            </section>
          )}
          <footer className="ics-footer">
            <span>SOOVERS · INDUSTRIAL SYSTEMS ACADEMY</span>
            <span>فهم فرایند، کیفیت اندازه‌گیری، تصمیم با شواهد.</span>
          </footer>
        </div>
      </div>
    </main>
  );
}
function Atlas({ openLesson }: { openLesson: (id: string) => void }) {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("همه"),
    [selected, setSelected] = useState(devices[0].id);
  const filtered = devices.filter(
    (d) =>
      (category === "همه" || d.category === category) &&
      (d.name + " " + d.role).toLowerCase().includes(query.toLowerCase()),
  );
  const device = devices.find((d) => d.id === selected) ?? devices[0];
  return (
    <section>
      <div className="ics-section-head">
        <div>
          <h2>تجهیز را از نقشش بشناس</h2>
          <p>
            ۱۲ نمونهٔ واقعی؛ نقش، مسیر اتصال، خطاهای محتمل و شواهد موردنیاز.
          </p>
        </div>
      </div>
      <div className="ics-filters">
        <label>
          <Search size={16} />
          <input
            placeholder="جست‌وجوی مدل یا نقش…"
            aria-label="جست‌وجوی تجهیزات"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="گروه تجهیزات"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {[
            "همه",
            "کنترلر و I/O",
            "ابزار دقیق و عملگر",
            "نمایش، شبکه و برق",
          ].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="ics-atlas">
        <div className="ics-device-list">
          {filtered.map((d) => (
            <button
              aria-pressed={d.id === selected}
              key={d.id}
              onClick={() => setSelected(d.id)}
            >
              <span>{d.category}</span>
              <b dir="ltr">{d.name}</b>
            </button>
          ))}
          {!filtered.length && (
            <p>تجهیزی پیدا نشد. عبارت یا گروه را تغییر بده.</p>
          )}
        </div>
        <article className="ics-device-detail">
          <span className="ics-tag">{device.category}</span>
          <h3 dir="ltr">{device.name}</h3>
          {[
            ["نقش در سیستم", device.role],
            ["کاربرد آموزشی", device.use],
            ["اتصال‌ها", device.connections],
            ["شناسنامهٔ دقیق", device.identity],
            ["اشتباه رایج در تشخیص", device.failure],
            ["شواهد قابل بررسی", device.evidence],
          ].map(([title, text]) => (
            <section key={title}>
              <h4>{title}</h4>
              <p>{text}</p>
            </section>
          ))}
          <div className="ics-actions">
            <a
              className="ics-primary"
              href={device.source}
              target="_blank"
              rel="noreferrer"
            >
              صفحهٔ سازنده و تصاویر مرجع ↗
            </a>
            <button onClick={() => openLesson(device.lesson)}>
              درس مرتبط
              <ArrowLeft size={15} />
            </button>
          </div>
          <BookReading ids={["E" + (devices.indexOf(device) + 1)]} />
        </article>
      </div>
    </section>
  );
}
function Glossary() {
  const [query, setQuery] = useState("");
  const entries = book.glossary.filter((row) =>
    row.join(" ").toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section>
      <h2>زبان مشترک IT و OT</h2>
      <p>
        ۱۰۲ اصطلاح از واژه‌نامهٔ کتاب دانشجو؛ معادل فارسی و تعریف اصلی انگلیسی.
      </p>
      <label className="ics-glossary-search">
        <Search size={18} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="مثلاً PLC، کالیبراسیون، فشار…"
          aria-label="جست‌وجوی واژه‌نامه"
        />
      </label>
      <p>{fa(entries.length)} اصطلاح</p>
      <dl className="ics-glossary">
        {entries.map(([en, faText, meaning]) => (
          <div key={en}>
            <dt>
              <b dir="ltr">{en}</b>
              <span>{faText}</span>
            </dt>
            <dd lang="en" dir="ltr">
              {meaning}
            </dd>
          </div>
        ))}
      </dl>
      {!entries.length && <p>واژه‌ای پیدا نشد؛ عبارت کوتاه‌تری بنویس.</p>}
    </section>
  );
}
