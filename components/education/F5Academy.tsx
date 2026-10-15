"use client";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Box,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  Layers3,
  Maximize2,
  Network,
  Pause,
  Play,
  RotateCcw,
  Rotate3D,
  Search,
  ShieldCheck,
  Terminal,
  Wifi,
  X,
} from "lucide-react";
import F5Stage from "./F5Stage";
import {
  assessLab,
  chapters,
  courseKey,
  f5Parts,
  f5Sources,
  initialCourse,
  knowledgeCheck,
  labCases,
  logEvents,
  parseCourse,
  platforms,
  type CourseProgress,
} from "@/lib/education/f5-course";
import "./f5-academy.css";
import type { LabSubmission } from "@/lib/product/api";
type AcademyProps = {
  account?: string;
  initialProgress?: CourseProgress;
  onSave?: (progress: CourseProgress) => Promise<unknown>;
  onLab?: (input: LabSubmission) => Promise<{ ok: boolean; text: string }>;
  onAssessment?: (
    answers: number[],
  ) => Promise<{ correct: number; total: number }>;
  onReport?: () => Promise<void>;
  serverScore?: number;
  serverBestCorrect?: number;
  syncStatus?: string;
  onRetrySave?: () => void;
};
const chapterIcons = [Box, Layers3, Network, FileText, Terminal, GraduationCap];
const fa = (n: number) => n.toLocaleString("fa-IR");
export default function F5Academy({
  account,
  initialProgress,
  onSave,
  onLab,
  onAssessment,
  onReport,
  serverScore,
  serverBestCorrect,
  syncStatus,
  onRetrySave,
}: AcademyProps = {}) {
  const [progress, setProgress] = useState<CourseProgress>(() => {
    try {
      return initialProgress ?? parseCourse(localStorage.getItem(courseKey));
    } catch {
      return initialCourse();
    }
  });
  const [storage, setStorage] = useState(""),
    [part, setPart] = useState(0),
    [expanded, setExpanded] = useState(false),
    [rotate, setRotate] = useState(false),
    [reset, setReset] = useState(0),
    [sources, setSources] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null),
    dialog = useRef<HTMLDialogElement>(null),
    sourceTrigger = useRef<HTMLButtonElement>(null),
    stage = useRef<HTMLDivElement>(null);
  const chapter = progress.chapter,
    correct =
      serverBestCorrect ??
      knowledgeCheck.filter((q, i) => progress.answers[i] === q.answer).length;
  const score =
    serverScore ??
    Math.round(
      ((progress.parts.length + progress.solved.length * 3 + correct * 2) /
        21) *
        100,
    );
  const [assessmentBusy, setAssessmentBusy] = useState(false),
    [assessmentResult, setAssessmentResult] = useState("");
  const mounted = useRef(false);
  useEffect(() => {
    if (onSave) {
      if (!mounted.current) {
        mounted.current = true;
        return;
      }
      void onSave(progress).catch(() => {});
      return;
    }
    try {
      localStorage.setItem(courseKey, JSON.stringify(progress));
    } catch {
      setStorage(
        "ذخیره در مرورگر ممکن نیست؛ پیشرفت این نشست تا بستن صفحه حفظ می‌شود.",
      );
    }
  }, [progress, onSave]);
  useEffect(() => {
    if (sources) dialog.current?.showModal();
    else dialog.current?.close();
  }, [sources]);
  const selectPart = (n: number) => {
    setPart(n);
    setProgress((p) => ({ ...p, parts: [...new Set([...p.parts, n])] }));
  };
  const go = (n: number) => {
    setProgress((p) => ({ ...p, chapter: n }));
    requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true });
      document.querySelector(".academy-scroll")?.scrollTo({ top: 0 });
    });
  };
  const download = () => {
    if (onReport) {
      void onReport();
      return;
    }
    const data = {
      course: "SooVers / F5 BIG-IP",
      version: "0.5.0",
      simulation: true,
      exportedAt: new Date().toISOString(),
      score,
      partsExplored: progress.parts.map((n) => f5Parts[n].name),
      solvedCases: progress.solved,
      assessment: knowledgeCheck.map((q, i) => ({
        question: q.q,
        answer: q.options[progress.answers[i]] ?? null,
        correct: progress.answers[i] === q.answer,
      })),
      sources: f5Sources,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "SooVers-F5-Learning-Report.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <main className="academy" dir="rtl">
      <a className="academy-skip" href="#academy-content">
        رفتن به محتوای آموزش
      </a>
      <header className="academy-header">
        <a
          className="academy-brand"
          href={account ? "#home" : "#demo"}
          aria-label="آکادمی سورین"
        >
          <span className="academy-symbol">S</span>
          <span dir="ltr">
            SooVers<small>SOORIN LEARNING WORLD</small>
          </span>
        </a>
        <nav aria-label="بخش‌های برنامه">
          <span className="academy-nav-active">
            <GraduationCap size={17} />
            آکادمی سورین
          </span>
          <a href="#tower">
            <Building2 size={16} />
            جهان متاورسی
          </a>
          <button ref={sourceTrigger} onClick={() => setSources(true)}>
            <BookOpen size={16} />
            منابع دوره
          </button>
        </nav>
        <div className="academy-profile">
          <span className="academy-online" />
          {account || "محیط تمرین"}
          <span className="academy-avatar">{account?.slice(0, 1) || "S"}</span>
        </div>
      </header>
      <div className="academy-layout">
        <aside className="academy-sidebar" aria-label="مسیر یادگیری F5">
          <a className="academy-back" href={account ? "#home" : "#tower"}>
            <ArrowRight size={15} />
            {account ? "بازگشت به یادگیری من" : "بازگشت به برج سورین"}
          </a>
          <div className="academy-course">
            <span className="f5-logo">f5</span>
            <span>
              <b dir="ltr">F5 BIG-IP</b>
              <small>شبکه، امنیت و تحلیل رخداد</small>
            </span>
            <span className="academy-course-dot" />
          </div>
          <div className="academy-path-label">
            <span>مسیر یادگیری</span>
            <small>۶ بخش</small>
          </div>
          <nav className="academy-chapters">
            {chapters.map((c, i) => {
              const Icon = chapterIcons[i];
              const done =
                i === 0
                  ? progress.parts.length === 6
                  : i === 4
                    ? progress.solved.length === 3
                    : i === 5
                      ? correct === 3
                      : false;
              return (
                <button
                  key={c.en}
                  onClick={() => go(i)}
                  aria-current={chapter === i ? "step" : undefined}
                  className={chapter === i ? "active" : ""}
                >
                  <span className="chapter-symbol">
                    {done ? <Check size={18} /> : <Icon size={18} />}
                  </span>
                  <span>
                    <b>{c.title}</b>
                    <small>{c.time}</small>
                  </span>
                  <span className="chapter-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </button>
              );
            })}
          </nav>
          <div className="academy-progress">
            <div>
              <span>پیشرفت مهارتی</span>
              <b>{fa(score)}٪</b>
            </div>
            <progress value={score} max={100} />
            <small>{fa(progress.solved.length)} از ۳ پرونده حل شده</small>
          </div>
          <div className="academy-mentor">
            <span className="mentor-orb">✦</span>
            <b>یاد بگیر. تجربه کن. تحلیل کن.</b>
            <p>روی یک جزء کلیک کن؛ بعد اثر آن را در ترافیک و لاگ پیدا کن.</p>
            <span>مسیر تخصصی شبکه و SOC</span>
          </div>
          <div className="academy-sidebar-foot">
            <span className="academy-online" />
            {account ? (
              <button
                className="product-sync-button"
                onClick={onRetrySave}
                aria-live="polite"
              >
                {syncStatus}
              </button>
            ) : (
              "پیشرفت روی همین مرورگر ذخیره می‌شود"
            )}
            <small dir="ltr">
              SOOVERS {account ? "1.0 / ACADEMY" : "0.5 / PREVIEW"}
            </small>
          </div>
        </aside>
        <section className="academy-main">
          <div className="academy-scroll" id="academy-content">
            <div className="academy-breadcrumb">
              <span>آکادمی</span>
              <ChevronLeft size={13} />
              <span>تجهیزات شبکه</span>
              <ChevronLeft size={13} />
              <b dir="ltr">F5 BIG-IP</b>
              <span className="academy-lab-badge">
                <span />
                آزمایشگاه تعاملی
              </span>
            </div>
            <div className="academy-title">
              <div>
                <span className="academy-eyebrow">
                  {chapters[chapter].en} <i />{" "}
                  {String(chapter + 1).padStart(2, "0")}
                </span>
                <h1 ref={heading} tabIndex={-1}>
                  {chapter === 0 ? (
                    <>
                      دستگاه را از <em>نزدیک</em> بشناس.
                    </>
                  ) : (
                    chapters[chapter].title
                  )}
                </h1>
                <p>{chapters[chapter].summary}</p>
              </div>
              <div className="academy-level">
                <ShieldCheck size={17} />
                <span>
                  مسیر تخصصی<small>Network & SOC</small>
                </span>
              </div>
            </div>
            {chapter === 0 && (
              <>
                <div className="academy-explorer">
                  <div className="academy-stage" ref={stage}>
                    <div className="stage-top">
                      <span>
                        <span className="academy-online" />
                        نمای تعاملی دستگاه
                      </span>
                      <span dir="ltr">F5 / BIG-IP</span>
                    </div>
                    <F5Stage
                      expanded={expanded}
                      selected={part}
                      rotate={rotate}
                      reset={reset}
                      onSelect={selectPart}
                    />
                    <div className="stage-side-word" aria-hidden="true">
                      EXPLORE
                      <br />
                      THE INSIDE.
                    </div>
                    <div className="stage-tags">
                      <span>مدل مفهومی آموزشی</span>
                      <span>۶ جزء قابل بررسی</span>
                    </div>
                    <div className="stage-toolbar">
                      <button
                        className={expanded ? "selected" : ""}
                        aria-pressed={expanded}
                        onClick={() => {
                          setExpanded((v) => !v);
                          selectPart(part);
                        }}
                      >
                        <Layers3 size={17} />
                        {expanded ? "جمع‌کردن دستگاه" : "بازکردن اجزا · Unbox"}
                      </button>
                      <span />
                      <button
                        aria-label="چرخش خودکار دستگاه"
                        title="چرخش خودکار"
                        aria-pressed={rotate}
                        onClick={() => setRotate((v) => !v)}
                      >
                        <Rotate3D size={18} />
                      </button>
                      <button
                        aria-label="بازنشانی نمای دستگاه"
                        title="بازنشانی نما"
                        onClick={() => setReset((n) => n + 1)}
                      >
                        <RotateCcw size={17} />
                      </button>
                      <button
                        aria-label="تمام‌صفحه کردن دستگاه"
                        title="تمام‌صفحه"
                        onClick={() => {
                          if (document.fullscreenElement)
                            void document.exitFullscreen();
                          else
                            void stage.current
                              ?.requestFullscreen?.()
                              .catch(() =>
                                setStorage(
                                  "تمام‌صفحه در این مرورگر در دسترس نیست.",
                                ),
                              );
                        }}
                      >
                        <Maximize2 size={16} />
                      </button>
                    </div>
                    <span className="stage-hint">
                      <Rotate3D size={13} />
                      برای چرخش بکش؛ برای بزرگ‌نمایی اسکرول کن.
                    </span>
                  </div>
                  <aside className="academy-part">
                    <div className="part-eyebrow">
                      <span>زیر ذره‌بین</span>
                      <span dir="ltr">{f5Parts[part].tag}</span>
                    </div>
                    <div className="part-illustration">
                      <Box size={43} />
                      <span>{String(part + 1).padStart(2, "0")}</span>
                    </div>
                    <h2>{f5Parts[part].name}</h2>
                    <span className="part-en" dir="ltr">
                      {f5Parts[part].en}
                    </span>
                    <p>{f5Parts[part].description}</p>
                    <div className="part-signal">
                      <Activity size={16} />
                      <div>
                        <b>در مانیتورینگ چه می‌بینی؟</b>
                        <p>{f5Parts[part].signal}</p>
                      </div>
                    </div>
                    <div className="part-tip">
                      <span>نکتهٔ تحلیلگر</span>
                      <p>{f5Parts[part].check}</p>
                    </div>
                    <button
                      className="academy-text-action"
                      onClick={() => selectPart((part + 1) % 6)}
                    >
                      بررسی جزء بعدی
                      <ArrowLeft size={16} />
                    </button>
                  </aside>
                </div>
                <div className="academy-parts">
                  {f5Parts.map((p, i) => (
                    <button
                      key={p.id}
                      aria-pressed={part === i}
                      className={part === i ? "active" : ""}
                      onClick={() => selectPart(i)}
                    >
                      <span className="part-index">
                        {progress.parts.includes(i) ? (
                          <Check size={14} />
                        ) : (
                          String(i + 1).padStart(2, "0")
                        )}
                      </span>
                      <b>{p.name}</b>
                      <small dir="ltr">{p.en}</small>
                    </button>
                  ))}
                </div>
                <div className="academy-note">
                  <BookOpen size={17} />
                  <p>
                    <b>از ظاهر دستگاه تا رفتار واقعی.</b> این مدل، اجزا را
                    به‌صورت شماتیک باز می‌کند؛ جای قطعات و تعداد پورت‌ها، نقشهٔ
                    دقیق یک مدل تجاری نیست. در بخش بعد تفاوت سخت‌افزار، TMOS و
                    ماژول‌ها را می‌بینی.
                  </p>
                </div>
              </>
            )}
            {chapter === 1 && <Platforms />}
            {chapter === 2 && <Traffic />}
            {chapter === 3 && <LogInspector />}
            {chapter === 4 && (
              <IncidentLab
                onLab={onLab}
                solved={progress.solved}
                onSolve={(id) =>
                  setProgress((p) => ({
                    ...p,
                    solved: [...new Set([...p.solved, id])],
                  }))
                }
              />
            )}
            {chapter === 5 && (
              <div className="academy-assessment"><p className="academy-note">ارزیابی اختیاری است. بدون شرکت در آزمون هم می‌توانی همهٔ بخش‌ها و آزمایشگاه‌ها را استفاده کنی.</p>
                <div className="academy-score-card">
                  <div className="score-circle">
                    {fa(score)}
                    <small>از ۱۰۰</small>
                  </div>
                  <div>
                    <h2>
                      {score === 100
                        ? "مسیر F5 را کامل کردی."
                        : "دانسته‌هایت را محک بزن."}
                    </h2>
                    <p>
                      {fa(progress.parts.length)} جزء بررسی‌شده ·{" "}
                      {fa(progress.solved.length)} پرونده حل‌شده · {fa(correct)}{" "}
                      پاسخ درست
                    </p>
                    <button className="academy-primary" onClick={download}>
                      <Download size={16} />
                      دریافت گزارش یادگیری
                    </button>
                  </div>
                </div>
                {knowledgeCheck.map((q, i) => (
                  <section className="academy-question" key={q.q}>
                    <h3>
                      <span>{fa(i + 1)}</span>
                      {q.q}
                    </h3>
                    <div className="academy-options">
                      {q.options.map((option, n) => (
                        <button
                          key={option}
                          aria-pressed={progress.answers[i] === n}
                          className={
                            progress.answers[i] === n ? "selected" : ""
                          }
                          onClick={() =>
                            setProgress((p) => ({
                              ...p,
                              answers: { ...p.answers, [i]: n },
                            }))
                          }
                        >
                          {option}
                          {progress.answers[i] === n && <Check size={16} />}
                        </button>
                      ))}
                    </div>
                    {!onAssessment && progress.answers[i] !== undefined && (
                      <p
                        role="status"
                        className={
                          progress.answers[i] === q.answer
                            ? "answer-correct"
                            : "answer-retry"
                        }
                      >
                        {progress.answers[i] === q.answer
                          ? "درست است. "
                          : "دوباره بررسی کن. "}
                        {q.explain}
                      </p>
                    )}
                  </section>
                ))}
                {onAssessment && (
                  <div className="assessment-submit">
                    <button
                      className="academy-primary"
                      disabled={
                        assessmentBusy ||
                        knowledgeCheck.some(
                          (_, i) => progress.answers[i] === undefined,
                        )
                      }
                      onClick={async () => {
                        setAssessmentBusy(true);
                        setAssessmentResult("");
                        try {
                          const result = await onAssessment(
                            knowledgeCheck.map((_, i) => progress.answers[i]),
                          );
                          setAssessmentResult(
                            `${fa(result.correct)} پاسخ درست از ${fa(result.total)}؛ نتیجه در حساب ثبت شد.`,
                          );
                        } catch (e) {
                          setAssessmentResult(
                            e instanceof Error
                              ? e.message
                              : "ثبت نتیجه انجام نشد.",
                          );
                        } finally {
                          setAssessmentBusy(false);
                        }
                      }}
                    >
                      {assessmentBusy
                        ? "در حال ثبت…"
                        : "ثبت ارزیابی و دریافت نتیجه"}
                    </button>
                    <p role="status">{assessmentResult}</p>
                  </div>
                )}
                <div className="academy-note">
                  <BookOpen size={18} />
                  <p>
                    گزارش، نتیجهٔ تمرین آموزشی است و مدرک رسمی F5 محسوب نمی‌شود.
                    برای تکمیل امتیاز، هر شش جزء و سه پرونده را هم بررسی کن.
                  </p>
                </div>
              </div>
            )}
            {storage && (
              <p className="academy-storage" role="status">
                {storage}
              </p>
            )}
          </div>
          {account && (
            <button
              className="academy-mobile-sync"
              onClick={onRetrySave}
              aria-live="polite"
            >
              {syncStatus}
            </button>
          )}
          <footer className="academy-footer">
            <span>
              <Clock3 size={15} />
              حدود ۳۶ دقیقه
              <span className="footer-divider" />
              بخش {fa(chapter + 1)} از ۶
            </span>
            <div>
              <button
                className="academy-secondary"
                disabled={chapter === 0}
                onClick={() => go(chapter - 1)}
              >
                <ArrowRight size={16} />
                بخش قبل
              </button>
              {chapter < 5 ? (
                <button
                  className="academy-primary"
                  onClick={() => go(chapter + 1)}
                >
                  ادامه: {chapters[chapter + 1].title}
                  <ArrowLeft size={17} />
                </button>
              ) : (
                <button className="academy-primary" onClick={download}>
                  <Download size={17} />
                  دریافت گزارش
                </button>
              )}
            </div>
          </footer>
        </section>
      </div>
      <dialog
        className="academy-source-dialog"
        ref={dialog}
        onCancel={(e) => {
          e.preventDefault();
          setSources(false);
        }}
        onClose={() => {
          setSources(false);
          sourceTrigger.current?.focus();
        }}
      >
        <div dir="rtl">
          <header>
            <div>
              <span className="academy-eyebrow">OFFICIAL REFERENCES</span>
              <h2>منابع و حدود شبیه‌سازی</h2>
            </div>
            <button aria-label="بستن منابع" onClick={() => setSources(false)}>
              <X size={22} />
            </button>
          </header>
          <p>
            این درس بر مفاهیم BIG-IP کلاسیک/TMOS تمرکز دارد. مثال‌های لاگ و
            خروجی فرمان‌ها ساختگی و محلی‌اند؛ قالب دقیق و پشتیبانی نسخه‌ها باید
            با مستند همان محیط تطبیق داده شود.
          </p>
          {f5Sources.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noreferrer">
              {s.title}
              <ExternalLink size={16} />
            </a>
          ))}
          <small>
            بازبینی منابع: ۱۵ اکتبر ۲۰۲۶ · نسخه‌های مستندات یکسان نیستند و نسخهٔ
            پیشنهادی استقرار محسوب نمی‌شوند.
          </small>
        </div>
      </dialog>
    </main>
  );
}

function Platforms() {
  const [selected, setSelected] = useState(0),
    p = platforms[selected];
  return (
    <div className="academy-platforms">
      <div className="platform-choices">
        {platforms.map((p, i) => (
          <button
            key={p.id}
            className={selected === i ? "selected" : ""}
            aria-pressed={selected === i}
            onClick={() => setSelected(i)}
          >
            {i === 2 ? <Network size={25} /> : <Layers3 size={25} />}
            <b dir="ltr">{p.name}</b>
            <span>{p.subtitle}</span>
            <small dir="ltr">{p.examples}</small>
          </button>
        ))}
      </div>
      <div className="platform-detail">
        <div>
          <span className="academy-eyebrow">DEPLOYMENT STACK</span>
          <h2>هر لایه، مسئولیت خودش را دارد.</h2>
          <p>{p.body}</p>
          <div className="academy-note">
            <ShieldCheck size={18} />
            <p>{p.note}</p>
          </div>
        </div>
        <div className="platform-stack">
          {p.stack.map((s, i) => (
            <div key={s}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <bdi>{s}</bdi>
            </div>
          ))}
        </div>
      </div>
      <div className="academy-version-grid">
        <article>
          <h3>مدل ≠ نسخه ≠ ماژول</h3>
          <p>
            r5900 یک مدل سخت‌افزاری است؛ F5OS-A 1.8.4 یک نسخهٔ نرم‌افزار پلتفرم
            و BIG-IP 17.1.x یک شاخهٔ نرم‌افزاری است. LTM یا Advanced WAF نقش و
            قابلیت را مشخص می‌کنند.
          </p>
        </article>
        <article>
          <h3>نمونهٔ نسخه برای مطالعه</h3>
          <p>
            این درس مفاهیم BIG-IP/TMOS را تمرین می‌کند. مستندهای 14.x، 15.x و
            17.x صرفاً برای مرجع مفاهیم پیوند شده‌اند؛ رفتار دقیق، Patch، مجوز و
            سازگاری را برای نسخهٔ نصب‌شده بررسی کن.
          </p>
        </article>
        <article>
          <h3>کاربرد ماژول‌ها</h3>
          <p>
            <bdi>LTM</bdi>: مدیریت ترافیک و Pool · <bdi>Advanced WAF</bdi>:
            سیاست امنیت برنامه · <bdi>APM</bdi>: کنترل دسترسی · <bdi>DNS</bdi>:
            توزیع پاسخ DNS. وجود سخت‌افزار به معنی فعال‌بودن همهٔ ماژول‌ها نیست.
          </p>
        </article>
      </div>
      <a
        className="academy-source-link"
        href={f5Sources[0].url}
        target="_blank"
        rel="noreferrer"
      >
        مرجع مدل و سازگاری Part Number در F5
        <ExternalLink size={15} />
      </a>
    </div>
  );
}

const trafficModes = [
  {
    name: "توزیع بار HTTPS",
    en: "LOAD BALANCING",
    description:
      "اتصال کلاینت روی Virtual Server پذیرفته می‌شود. در این مثال TLS روی BIG-IP خاتمه می‌یابد و اتصال تازه‌ای به عضو سالم Pool برقرار می‌شود.",
    steps: [
      "Client",
      "Virtual Server",
      "Client SSL",
      "WAF policy",
      "Pool / Monitor",
      "Server",
    ],
    details: [
      "کلاینت به VIP سرویس وصل می‌شود.",
      "IP، پورت و Profileهای Virtual Server تعیین‌کننده‌اند.",
      "در این سناریو Client SSL پروفایل لازم برای خاتمهٔ TLS است.",
      "درخواست مجاز از Policy عبور می‌کند.",
      "عضو سالم با روش توزیع انتخاب می‌شود؛ Monitor سلامت را بررسی می‌کند.",
      "پاسخ عضو انتخاب‌شده از مسیر پروکسی برمی‌گردد.",
    ],
    result: "PASS · درخواست به عضو سالم رسید",
  },
  {
    name: "حفاظت برنامه با WAF",
    en: "APPLICATION SECURITY",
    description:
      "در این سناریو Policy در حالت Blocking است و شرط Block برای Violation مورد تمرین فعال است. با تغییر به Transparent، تفاوت تشخیص و اعمال سیاست را ببین.",
    steps: [
      "Client",
      "Virtual Server",
      "Client SSL",
      "WAF policy",
      "Pool / Monitor",
      "Server",
    ],
    details: [
      "درخواست آزمایشی مشکوک وارد می‌شود.",
      "درخواست به Policy همین سرویس می‌رسد.",
      "محتوای HTTP در این سناریو پس از خاتمهٔ TLS قابل بررسی است.",
      "Policy تخلف را تشخیص می‌دهد.",
      "در حالت Transparent، مسیر ادامه پیدا می‌کند.",
      "درخواست در حالت Transparent به برنامه می‌رسد.",
    ],
    result: "BLOCK · در این Policy درخواست متوقف شد",
  },
  {
    name: "خرابی یک عضو Pool",
    en: "AVAILABILITY",
    description:
      "یک عضو از پایش سلامت عبور نمی‌کند. اتصال‌های تازه به عضو سالم می‌روند؛ رفتار اتصال‌های موجود به تنظیمات و شرایط بستگی دارد.",
    steps: [
      "Client",
      "Virtual Server",
      "Client SSL",
      "Pool / Monitor",
      "Healthy member",
    ],
    details: [
      "اتصال تازه وارد می‌شود.",
      "Virtual Server هنوز عضو سالم در دسترس دارد.",
      "TLS طبق Profile این تمرین پردازش می‌شود.",
      "عضو Down از انتخاب اتصال تازه کنار گذاشته می‌شود.",
      "درخواست به عضو سالم دیگر تحویل داده شد.",
    ],
    result: "PASS · ظرفیت کاهش یافته؛ سرویس برقرار است",
  },
];
function Traffic() {
  const [mode, setMode] = useState(0),
    [step, setStep] = useState(-1),
    [playing, setPlaying] = useState(false),
    [blocking, setBlocking] = useState(true);
  const t = trafficModes[mode],
    limit = mode === 1 && blocking ? 3 : t.steps.length - 1;
  useEffect(() => {
    setPlaying(false);
    setStep(-1);
  }, [mode, blocking]);
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      if (step >= limit) setPlaying(false);
      else setStep((s) => s + 1);
    }, 1100);
    return () => clearTimeout(timer);
  }, [playing, step, limit]);
  return (
    <div className="academy-traffic">
      <div className="traffic-modes">
        {trafficModes.map((t, i) => (
          <button
            className={mode === i ? "selected" : ""}
            aria-pressed={mode === i}
            key={t.en}
            onClick={() => setMode(i)}
          >
            <Network size={21} />
            <b>{t.name}</b>
            <small>{t.en}</small>
          </button>
        ))}
      </div>
      <div className="traffic-stage">
        <div className="traffic-stage-head">
          <span>
            <span className="academy-online" />
            مسیر مفهومی ترافیک
          </span>
          <span dir="ltr">CLIENT → APPLICATION</span>
        </div>
        <div className="traffic-nodes" dir="ltr">
          {t.steps.map((name, i) => (
            <div
              className={`traffic-node ${step === i ? "current" : ""} ${step > i ? "passed" : ""} ${mode === 1 && blocking && step === 3 && i === 3 ? "blocked" : ""}`}
              key={name}
            >
              <span>
                {i === 0 ? <Wifi /> : i === 3 ? <ShieldCheck /> : <Box />}
              </span>
              <b>{name}</b>
              <small>{i === step ? "●" : String(i + 1).padStart(2, "0")}</small>
            </div>
          ))}
        </div>
        <div className="traffic-caption" role="status">
          {step < 0
            ? "برای دنبال‌کردن درخواست، پخش را بزن."
            : step === limit && !playing
              ? mode === 1 && !blocking
                ? "PASS · تخلف ثبت شد؛ Transparent مانع عبور نشد"
                : t.result
              : t.details[step]}
        </div>
        <div className="traffic-controls">
          <button
            className="academy-primary"
            onClick={() => {
              if (step >= limit) setStep(-1);
              setPlaying((v) => !v);
            }}
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}{" "}
            {playing ? "توقف مسیر" : "پخش مسیر"}
          </button>
          <button
            className="academy-secondary"
            disabled={playing || step >= limit}
            onClick={() => setStep((n) => n + 1)}
          >
            گام بعد
          </button>
          <button
            className="academy-secondary"
            onClick={() => {
              setPlaying(false);
              setStep(-1);
            }}
          >
            از ابتدا
          </button>
          {mode === 1 && (
            <label>
              حالت Policy
              <select
                value={blocking ? "blocking" : "transparent"}
                onChange={(e) => setBlocking(e.target.value === "blocking")}
              >
                <option value="blocking">Blocking</option>
                <option value="transparent">Transparent</option>
              </select>
            </label>
          )}
        </div>
      </div>
      <div className="academy-note">
        <Network size={19} />
        <p>{t.description}</p>
      </div>
      <div className="academy-version-grid">
        <article>
          <h3>Full proxy</h3>
          <p>
            ارتباط سمت کلاینت و سرور مستقل‌اند. IP دیده‌شده در Backend ممکن است
            تحت تأثیر SNAT باشد؛ هدر XFF فقط با زنجیرهٔ اعتماد معتبر قابل
            اتکاست.
          </p>
        </article>
        <article>
          <h3>TLS و دیده‌شدن محتوا</h3>
          <p>
            عبور TLS بدون خاتمه‌دادن آن، با بازرسی محتوای HTTP یکسان نیست.
            ارتباط مجدد با سرور می‌تواند با Server SSL رمز شود.
          </p>
        </article>
        <article>
          <h3>مسیر، شماتیک است</h3>
          <p>
            ترتیب این نمایش برای توضیح همین مثال است؛ توالی کامل رویدادهای داخلی
            TMM، iRule و همهٔ Profileها را مدل نمی‌کند.
          </p>
        </article>
      </div>
    </div>
  );
}

function LogInspector() {
  const [selected, setSelected] = useState(0),
    [filter, setFilter] = useState("ALL"),
    [query, setQuery] = useState(""),
    [field, setField] = useState(0);
  const event = logEvents[selected],
    visible = logEvents.filter(
      (e) =>
        (filter === "ALL" || e.kind === filter) &&
        `${e.raw} ${e.title}`.toLowerCase().includes(query.toLowerCase()),
    );
  return (
    <div className="academy-logs">
      <div className="log-tools">
        <div>
          {["ALL", "LTM", "WAF", "AUDIT", "F5OS"].map((f) => (
            <button
              key={f}
              aria-pressed={filter === f}
              className={filter === f ? "selected" : ""}
              onClick={() => setFilter(f)}
            >
              {f === "ALL" ? "همهٔ رخدادها" : f}
            </button>
          ))}
        </div>
        <label className="log-search">
          <Search size={16} />
          <input
            aria-label="جست‌وجوی لاگ"
            placeholder="جست‌وجوی IP، آبجکت، رخداد…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="log-workspace">
        <div className="log-list">
          <header>
            <span>رویدادهای نمونه</span>
            <span>{fa(visible.length)} رخداد</span>
          </header>
          {visible.map((e) => (
            <button
              className={event.id === e.id ? "active" : ""}
              aria-pressed={event.id === e.id}
              key={e.id}
              onClick={() => {
                setSelected(logEvents.indexOf(e));
                setField(0);
              }}
            >
              <div>
                <span className={`severity ${e.severity}`}>{e.kind}</span>
                <time>{e.time}</time>
              </div>
              <b>{e.title}</b>
              <small dir="ltr">{e.source}</small>
            </button>
          ))}
          {!visible.length && (
            <div className="logs-empty">
              <Search size={25} />
              <p>رخدادی پیدا نشد.</p>
              <button
                onClick={() => {
                  setFilter("ALL");
                  setQuery("");
                }}
              >
                پاک‌کردن فیلترها
              </button>
            </div>
          )}
        </div>
        <section className="log-detail">
          <div className="log-detail-head">
            <span className="academy-eyebrow">EVENT INSPECTOR</span>
            <span className="synthetic-badge">لاگ شبیه‌سازی‌شده</span>
          </div>
          <h2>{event.title}</h2>
          <span className="log-source" dir="ltr">
            {event.source}
          </span>
          <pre dir="ltr">{event.raw}</pre>
          <h3>فیلد را انتخاب کن، معنا را ببین.</h3>
          <div className="log-fields">
            {event.fields.map(([name, value], i) => (
              <button
                key={name}
                className={field === i ? "selected" : ""}
                aria-pressed={field === i}
                onClick={() => setField(i)}
                dir="ltr"
              >
                <small>{name}</small>
                <b>{value}</b>
              </button>
            ))}
          </div>
          <div className="field-explanation" role="status">
            <span dir="ltr">{event.fields[field][0]}</span>
            <p>{event.fields[field][2]}</p>
          </div>
          <div className="academy-note">
            <Activity size={18} />
            <p>{event.insight}</p>
          </div>
        </section>
      </div>
      <div className="academy-version-grid">
        <article>
          <h3>کدام لاگ، کدام پرسش؟</h3>
          <p>
            LTM برای رویدادهای ترافیک محلی؛ Audit برای تغییرات در صورت
            فعال‌بودن؛ WAF برای رویدادهای امنیت برنامه. ثبت هر درخواست HTTP را
            پیش‌فرض همهٔ لاگ‌های LTM فرض نکن.
          </p>
        </article>
        <article>
          <h3>چرا رویداد را نمی‌بینم؟</h3>
          <p>
            اتصال Logging Profile، فیلتر رخداد، مقصد و مسیر ارسال را بررسی کن.
            رویداد WAF الزاماً در /var/log/asm نیست؛ ثبت محتوا در این فایل
            وابسته به تنظیم است و می‌تواند هزینهٔ کارایی داشته باشد.
          </p>
        </article>
        <article>
          <h3>دام‌های تحلیل</h3>
          <p>
            اختلاف زمان، چرخش و نگهداری لاگ، تکرار پیام، Parser نامناسب، SNAT و
            IP پشت Proxy می‌توانند نتیجه را منحرف کنند. ابتدا منبع و زمینهٔ داده
            را تثبیت کن.
          </p>
        </article>
      </div>
      <a
        className="academy-source-link"
        href={f5Sources[2].url}
        target="_blank"
        rel="noreferrer"
      >
        مرجع رسمی تنظیم ثبت رخداد WAF
        <ExternalLink size={15} />
      </a>
    </div>
  );
}

function IncidentLab({
  solved,
  onSolve,
  onLab,
}: {
  solved: string[];
  onSolve: (id: string) => void;
  onLab?: AcademyProps["onLab"];
}) {
  const [index, setIndex] = useState(0);
  return (
    <div className="academy-lab">
      <div className="lab-selector">
        {labCases.map((c, i) => (
          <button
            key={c.id}
            aria-pressed={i === index}
            className={i === index ? "selected" : ""}
            onClick={() => setIndex(i)}
          >
            <span>
              {solved.includes(c.id) ? (
                <CheckCircle2 size={20} />
              ) : (
                String(i + 1).padStart(2, "0")
              )}
            </span>
            <b>{c.title}</b>
            <small>{c.tag}</small>
          </button>
        ))}
      </div>
      <CaseExercise
        key={index}
        onLab={onLab}
        index={index}
        solved={solved.includes(labCases[index].id)}
        onSolve={onSolve}
      />
    </div>
  );
}
function CaseExercise({
  index,
  solved,
  onSolve,
  onLab,
}: {
  index: number;
  solved: boolean;
  onSolve: (id: string) => void;
  onLab?: AcademyProps["onLab"];
}) {
  const c = labCases[index];
  const [evidence, setEvidence] = useState<number[]>([]),
    [active, setActive] = useState<number | null>(null),
    [diagnosis, setDiagnosis] = useState<number | null>(null),
    [action, setAction] = useState<number | null>(null),
    [feedback, setFeedback] = useState(""),
    [success, setSuccess] = useState(false),
    [hint, setHint] = useState(false),
    [submitting, setSubmitting] = useState(false);
  return (
    <div className="lab-case">
      <div className="lab-case-header">
        <div>
          <span className="academy-eyebrow">
            CASE / {String(index + 1).padStart(2, "0")} · {c.tag}
          </span>
          <h2>{c.title}</h2>
          <p>{c.intro}</p>
        </div>
        <span className={success ? "lab-state resolved" : "lab-state"}>
          <Activity size={18} />
          {success ? c.after : c.before}
        </span>
      </div>
      <div className="lab-columns">
        <section className="lab-evidence">
          <h3>
            <span>۱</span>شواهد را جمع کن{" "}
            <small>{fa(evidence.length)} / ۳</small>
          </h3>
          <p>میز بررسی، خروجی‌های آمادهٔ همین سناریو را نشان می‌دهد.</p>
          <div className="evidence-commands" dir="ltr">
            {c.evidence.map((e, i) => (
              <button
                key={e.command}
                className={active === i ? "selected" : ""}
                onClick={() => {
                  setActive(i);
                  setEvidence((v) => [...new Set([...v, i])]);
                }}
              >
                <Terminal size={14} />
                {e.command}
                {evidence.includes(i) && <Check size={13} />}
              </button>
            ))}
          </div>
          <div className="evidence-terminal">
            <header>
              <span />
              <span />
              <span />
              <b>SOOVERS / SIMULATED CONSOLE</b>
            </header>
            <pre dir="ltr" aria-live="polite">
              {active === null
                ? "$ Select an evidence command\n\nNo commands run on a real device."
                : `$ ${c.evidence[active].command}\n\n${c.evidence[active].output}`}
            </pre>
          </div>
          <button
            className="academy-text-action"
            onClick={() => setHint((v) => !v)}
          >
            {hint ? "بستن راهنما" : "یک راهنمایی می‌خواهم"}
            <BookOpen size={15} />
          </button>
          {hint && <p className="lab-hint">{c.wrong}</p>}
        </section>
        <section className="lab-decisions">
          <h3>
            <span>۲</span>تشخیص محتمل چیست؟
          </h3>
          <div className="academy-options">
            {c.diagnoses.map((d, i) => (
              <button
                key={d}
                aria-pressed={diagnosis === i}
                className={diagnosis === i ? "selected" : ""}
                disabled={success}
                onClick={() => {
                  setDiagnosis(i);
                  setFeedback("");
                }}
              >
                {d}
              </button>
            ))}
          </div>
          <h3>
            <span>۳</span>اقدام مناسب را انتخاب کن.
          </h3>
          <div className="academy-options">
            {c.actions.map((d, i) => (
              <button
                key={d}
                aria-pressed={action === i}
                className={action === i ? "selected" : ""}
                disabled={success}
                onClick={() => {
                  setAction(i);
                  setFeedback("");
                }}
              >
                {d}
              </button>
            ))}
          </div>
          <button
            className="academy-primary lab-apply"
            disabled={
              submitting || success || diagnosis === null || action === null
            }
            onClick={async () => {
              setSubmitting(true);
              try {
                const result = onLab
                  ? await onLab({
                      caseId: c.id,
                      evidence,
                      diagnosis: diagnosis!,
                      action: action!,
                    })
                  : assessLab(c, evidence, diagnosis, action);
                setFeedback(result.text);
                setSuccess(result.ok);
                if (result.ok) onSolve(c.id);
              } catch (e) {
                setFeedback(
                  e instanceof Error
                    ? e.message
                    : "ثبت تصمیم انجام نشد؛ دوباره تلاش کنید.",
                );
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <Play size={16} />
            {submitting
              ? "در حال بررسی…"
              : success
                ? "پرونده با موفقیت حل شد"
                : "اعمال تصمیم در شبیه‌سازی"}
          </button>
        </section>
      </div>
      {feedback && (
        <div
          className={success ? "lab-feedback success" : "lab-feedback retry"}
          role="status"
        >
          {success ? <CheckCircle2 size={24} /> : <Activity size={24} />}
          <div>
            <strong>
              {success ? "اثر اصلاح را ببین." : "شواهد را دوباره بررسی کن."}
            </strong>
            <p>{feedback}</p>
            {success && (
              <span className="lab-result-change">
                {c.before}
                <ArrowLeft size={16} />
                {c.after}
              </span>
            )}
          </div>
        </div>
      )}
      {(success || solved) && (
        <div className="lab-saved">
          <Check size={15} />
          موفقیت این پرونده در پیشرفت ثبت شده است.
          <button
            onClick={() => {
              setSuccess(false);
              setDiagnosis(null);
              setAction(null);
              setEvidence([]);
              setActive(null);
              setFeedback("");
            }}
          >
            تمرین دوباره
          </button>
        </div>
      )}
    </div>
  );
}
