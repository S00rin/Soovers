"use client";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  Download,
  Library,
  Menu,
  Search,
  X,
} from "lucide-react";
import {
  lessons,
  contentVersion,
  sharedConversation,
  type Lesson,
} from "@/lib/ics/content";
import { chapters, phases, routeFor } from "@/lib/ics/course";
import type { User } from "@/lib/product/api";
import {
  TankLab,
  SignalLab,
  EvidenceLab,
  PlantDiagram,
  downloadData,
} from "./IcsLabs";
import { Atlas, Glossary, BookReading, reading } from "./ReferencePanels";
import { ChapterCase } from "./ChapterCase";
import { useIcsLearning } from "./useIcsLearning";
import "./ics.css";
import "./reader.css";
const fa = (n: number) => n.toLocaleString("fa-IR");
type Reference = "book" | "atlas" | "glossary" | "sources";
export default function IcsAcademy({ account }: { account?: User }) {
  const learning = useIcsLearning(account),
    { progress, results, workbook, ready } = learning;
  const [route, setRoute] = useState(() => routeFor(location.hash)),
    [reference, setReference] = useState<Reference>("glossary"),
    [fontSize, setFontSize] = useState(18),
    [reportError, setReportError] = useState(""),
    [quizError, setQuizError] = useState(""),
    [quizBusy, setQuizBusy] = useState(false),
    [pendingExit, setPendingExit] = useState("");
  const outline = useRef<HTMLDialogElement>(null),
    library = useRef<HTMLDialogElement>(null),
    heading = useRef<HTMLHeadingElement>(null),
    savedId = useRef("");
  const base = location.hash.startsWith("#ics-demo") ? "#ics-demo" : "#ics";
  const lesson = lessons.find((l) => l.id === (route.id || progress.lesson)),
    validLesson = lesson || lessons[0],
    index = lessons.indexOf(validLesson),
    completed = progress.completed.length;
  useEffect(() => {
    const sync = () => {
      setRoute(routeFor(location.hash));
      setQuizError("");
      outline.current?.close();
      library.current?.close();
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => {
    if (!ready) return;
    if (route.view === "lesson" && lesson && savedId.current !== lesson.id) {
      savedId.current = lesson.id;
      if (progress.lesson !== lesson.id)
        learning.change({ ...progress, lesson: lesson.id });
    }
    window.scrollTo(0, 0);
    heading.current?.focus({ preventScroll: true });
  }, [ready, route.view, route.id]);
  useEffect(() => {
    try {
      const n = Number(localStorage.getItem("soovers-reader-font"));
      if ([18, 19, 21].includes(n)) setFontSize(n);
    } catch {}
  }, []);
  function navigate(id?: string) {
    outline.current?.close();
    library.current?.close();
    const hash = id ? `${base}/lesson/${id}` : base;
    if (location.hash === hash) {
      window.scrollTo(0, 0);
      heading.current?.focus();
    } else location.hash = hash;
  }
  function openReference(kind: Reference) {
    setReference(kind);
    library.current?.showModal();
  }
  function next() {
    const nextLesson = lessons[index + 1];
    learning.change({
      ...progress,
      lesson: nextLesson?.id || validLesson.id,
      completed: [...new Set([...progress.completed, validLesson.id])],
    });
    if (nextLesson) navigate(nextLesson.id);
    else navigate();
  }
  function jump(id: string) {
    const target = document.getElementById(id);
    target?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
    target?.focus({ preventScroll: true });
  }
  async function leave(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const hash = event.currentTarget.hash;
    try {
      await learning.flush();
      location.hash = hash;
    } catch {
      setPendingExit(hash);
    }
  }
  async function answer(choice: number) {
    if (quizBusy) return;
    setQuizBusy(true);
    setQuizError("");
    try {
      await learning.answer(validLesson.id, choice);
    } catch (e) {
      setQuizError(e instanceof Error ? e.message : "پاسخ ثبت نشد.");
    } finally {
      setQuizBusy(false);
    }
  }
  async function exportReport() {
    setReportError("");
    try {
      downloadData("SooVers-ICS-learning.json", await learning.report());
    } catch (e) {
      setReportError(
        e instanceof Error ? e.message : "گزارش دریافت نشد؛ دوباره تلاش کن.",
      );
    }
  }
  if (learning.error)
    return (
      <main className="ics-app course-app course-loading" dir="rtl">
        <h1>پیشرفت دریافت نشد</h1>
        <p role="alert">{learning.error}</p>
        <button onClick={learning.reload}>تلاش دوباره</button>
        <a href="#home">بازگشت به حساب</a>
      </main>
    );
  if (!ready)
    return (
      <main
        className="ics-app course-app course-loading"
        dir="rtl"
        role="status"
      >
        در حال آماده‌سازی دوره…
      </main>
    );
  const commonOutline = (
    <CourseOutline
      selected={route.view === "lesson" ? validLesson.id : undefined}
      completed={progress.completed}
      onOpen={navigate}
    />
  );
  return (
    <main
      className="ics-app course-app"
      dir="rtl"
      style={{ "--reading-size": fontSize + "px" } as React.CSSProperties}
    >
      <a
        className="ics-skip"
        href="#course-reading"
        onClick={(e) => {
          e.preventDefault();
          heading.current?.focus();
        }}
      >
        رفتن به متن درس
      </a>
      <header className="course-header">
        <a
          className="course-brand"
          href={base}
          onClick={(e) => {
            e.preventDefault();
            navigate();
          }}
        >
          <span>S</span>
          <b dir="ltr">
            SooVers<small>آکادمی سیستم‌های کنترل صنعتی</small>
          </b>
        </a>
        <nav aria-label="ناوبری اصلی">
          <button onClick={() => navigate()}>دورهٔ صنعتی</button>
          <button onClick={() => openReference("glossary")}>
            <Library size={16} />
            کتابخانه
          </button>
          <a href={account ? "#home" : "#demo"} onClick={leave}>
            {account ? "حساب من" : "دورهٔ F5"}
          </a>
          <a className="course-immersive" href="#tower" onClick={leave}>
            پردیس سه‌بعدی
            <ChevronLeft size={14} />
          </a>
        </nav>
      </header>
      <div className="course-mobile-bar">
        <button onClick={() => outline.current?.showModal()}>
          <Menu size={18} />
          فهرست فصل‌ها
        </button>
        <span>
          {fa(completed)} از {fa(lessons.length)} درس
        </span>
      </div>
      <div className="course-layout">
        <aside className="course-sidebar">
          <div className="course-outline-heading">
            <BookOpen size={18} />
            <strong>مسیر یادگیری شما</strong>
          </div>
          <div className="course-progress">
            <span>
              {fa(completed)} از {fa(lessons.length)} درس خوانده‌شده
            </span>
            <progress value={completed} max={lessons.length} />
            <small>خواندن درس‌ها مستقل از نمره است</small>
          </div>
          {commonOutline}
        </aside>
        <div className="course-main">
          <div className="course-save-state">
            <span role="status">
              {learning.sync ||
                (account
                  ? "پیشرفت متصل به حساب شما"
                  : "ذخیرهٔ پیشرفت در همین مرورگر")}
            </span>
            {learning.failed && (
              <button onClick={learning.retry}>تلاش دوباره برای ذخیره</button>
            )}
            {pendingExit && (
              <button
                onClick={() => {
                  location.hash = pendingExit;
                }}
              >
                خروج بدون ذخیره
              </button>
            )}
            <button
              onClick={() => void exportReport()}
              aria-label="دریافت گزارش یادگیری"
            >
              <Download size={15} />
            </button>
          </div>
          {reportError && <p role="alert">{reportError}</p>}
          {route.view === "home" ? (
            <>
              <section className="course-cover">
                <div>
                  <span className="course-kicker">
                    از اولین مفهوم تا پروژهٔ پایانی
                  </span>
                  <h1 ref={heading} tabIndex={-1}>
                    کنترل صنعتی را
                    <br />
                    قدم‌به‌قدم یاد بگیر.
                  </h1>
                  <p>
                    یک مسیر روشن برای فهم فرایند، شناخت تجهیزات و دفاع از
                    سیستم‌های صنعتی. بخوان، همان‌جا تمرین کن و با یک قدم مشخص
                    ادامه بده.
                  </p>
                  <button
                    className="ics-primary course-start"
                    onClick={() => navigate(progress.lesson)}
                  >
                    {completed || progress.lesson !== lessons[0].id
                      ? "ادامهٔ یادگیری"
                      : "شروع یادگیری"}
                    <ArrowLeft size={18} />
                  </button>
                  <small>
                    {completed || progress.lesson !== lessons[0].id
                      ? `جایی که بودی: ${lessons.find((l) => l.id === progress.lesson)?.title}`
                      : "بدون نیاز به عینک، تعیین سطح یا آزمون اجباری"}
                  </small>
                </div>
                <div className="course-cover-diagram">
                  <span>فرایندی که با آن یاد می‌گیری</span>
                  <PlantDiagram />
                  <p>مخزن TK-101 · حسگر، کنترلر و پمپ</p>
                </div>
              </section>
              <div className="course-facts">
                <span>
                  <b>{fa(chapters.length)}</b> فصل آموزشی
                </span>
                <span>
                  <b>{fa(lessons.length)}</b> درس پیوسته
                </span>
                <span>
                  <b>۲</b> پروژهٔ پایانی
                </span>
                <span>
                  <b>۱۰۲</b> اصطلاح مرجع
                </span>
              </div>
              <section className="course-home-path">
                <h2>در این مسیر چه می‌سازی؟</h2>
                <p>
                  هر بخش روی بخش قبلی بنا می‌شود. هر زمان خواستی می‌توانی از
                  فهرست، مستقیماً سراغ فصل موردنظرت بروی.
                </p>
                {phases.map((phase, i) => {
                  const start = lessons.find(
                    (l) => l.chapter === phase.range[0],
                  );
                  if (!start) return null;
                  return (
                    <button
                      key={phase.title}
                      onClick={() => navigate(start.id)}
                    >
                      <span>{fa(i + 1)}</span>
                      <div>
                        <small>
                          فصل‌های {fa(phase.range[0])} تا {fa(phase.range[1])}
                        </small>
                        <h3>{phase.title}</h3>
                        <p>{phase.description}</p>
                      </div>
                      <ArrowLeft size={18} />
                    </button>
                  );
                })}
              </section>
              <section className="course-about">
                <h2>روش مطالعهٔ این دوره</h2>
                <p>
                  هر درس یک سؤال روشن، توضیح، مثال حل‌شده، تمرین و جمع‌بندی
                  دارد. واژه‌نامه و متن کتاب را بدون ترک درس باز کن. یادداشتت
                  کنار همان درس ذخیره می‌شود؛ برای ادامه لازم نیست در آزمون شرکت
                  کنی.
                </p>
                <p>
                  این نسخه، راهنمای مطالعه و تمرین برای سرفصل‌های دوره است. متن
                  اصلی کتاب دانشجو برای فصل‌های ۱ و ۲ در دسترس است؛ فصل‌های بعدی
                  محتوای تألیفی آکادمی‌اند. برآورد ۸۱۶ ساعتِ طرح مرجع، مدت این
                  درس‌های وب نیست.
                </p>
                <button onClick={() => openReference("sources")}>
                  دربارهٔ منابع دوره
                  <ArrowLeft size={15} />
                </button>
              </section>
            </>
          ) : !lesson ? (
            <section className="course-loading">
              <h1 ref={heading} tabIndex={-1}>
                این درس پیدا نشد
              </h1>
              <p>از فهرست فصل‌ها یک درس را انتخاب کن.</p>
              <button onClick={() => navigate()}>بازگشت به دوره</button>
            </section>
          ) : (
            <>
              <div className="course-breadcrumb">
                <button onClick={() => navigate()}>دورهٔ صنعتی</button>
                <ChevronLeft size={14} />
                <span>فصل {fa(lesson.chapter)}</span>
                <span className="course-duration">
                  حدود {fa(lesson.minutes)} دقیقه برای مطالعه و تمرین
                </span>
              </div>
              <article className="course-reading" id="course-reading">
                <header className="course-lesson-heading">
                  <span className="course-kicker">
                    درس {fa(index + 1)} از {fa(lessons.length)}
                  </span>
                  <h1 ref={heading} tabIndex={-1}>
                    {lesson.title}
                  </h1>
                  <p className="course-goal">
                    در پایان این درس می‌توانی: {lesson.objective}
                  </p>
                  <div className="course-reading-tools">
                    <button onClick={() => openReference("glossary")}>
                      واژه‌نامه کنار درس
                    </button>
                    <label>
                      اندازهٔ متن
                      <select
                        aria-label="اندازهٔ متن"
                        value={fontSize}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          setFontSize(n);
                          try {
                            localStorage.setItem(
                              "soovers-reader-font",
                              String(n),
                            );
                          } catch {}
                        }}
                      >
                        <option value={18}>معمولی</option>
                        <option value={19}>درشت</option>
                        <option value={21}>خیلی درشت</option>
                      </select>
                    </label>
                  </div>
                </header>
                <nav className="course-jump" aria-label="بخش‌های همین درس">
                  <button onClick={() => jump("lesson-text")}>۱. بخوان</button>
                  <button onClick={() => jump("lesson-practice")}>
                    ۲. تمرین کن
                  </button>
                  <button onClick={() => jump("lesson-wrap")}>
                    ۳. جمع‌بندی و ادامه
                  </button>
                </nav>
                <section
                  id="lesson-text"
                  tabIndex={-1}
                  className="course-prose"
                >
                  {lesson.sections.map((section, i) => (
                    <section key={i}>
                      <h2>{section.title}</h2>
                      {section.text
                        .split("\n")
                        .filter(Boolean)
                        .map((p, j) => (
                          <p key={j}>{p}</p>
                        ))}
                    </section>
                  ))}
                  <div className="course-worked">
                    <span className="course-kicker">مثال حل‌شده</span>
                    <h2>{lesson.example.title}</h2>
                    {lesson.example.formula && (
                      <pre dir="ltr">{lesson.example.formula}</pre>
                    )}
                    <p>{lesson.example.text}</p>
                  </div>
                  <div className="course-reading-references">
                    {reading[lesson.id] && (
                      <button onClick={() => openReference("book")}>
                        <BookOpen size={17} />
                        متن عمیق همین موضوع از کتاب دانشجو
                      </button>
                    )}
                    {lesson.sources?.length && (
                      <details>
                        <summary>منابع این درس</summary>
                        {lesson.sources.map((s) => (
                          <a
                            key={s.url}
                            href={s.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {s.title} ↗
                          </a>
                        ))}
                      </details>
                    )}
                  </div>
                </section>
                <section
                  id="lesson-practice"
                  tabIndex={-1}
                  className="course-practice"
                >
                  <div className="course-section-heading">
                    <span>۰۲</span>
                    <div>
                      <h2>حالا خودت امتحان کن</h2>
                      <p>
                        این تمرین بخشی از همین درس است. برای مطالعهٔ ادامه،
                        نتیجه یا نمره‌ای لازم نیست.
                      </p>
                    </div>
                  </div>
                  {lesson.activity === "tank" ? (
                    <TankLab />
                  ) : lesson.activity === "signal" ? (
                    <SignalLab />
                  ) : lesson.activity === "evidence" ? (
                    <EvidenceLab
                      notes={progress.notes}
                      onNotes={(notes) =>
                        learning.change({ ...progress, notes }, 700)
                      }
                      savedNotes={progress.notes}
                      saveNotes={learning.retry}
                    />
                  ) : lesson.activity === "atlas" ? (
                    <div className="course-equipment-prompt">
                      <h3>نقش و هویت تجهیز را جدا کن</h3>
                      <p>
                        یک تجهیز را در اطلس انتخاب کن. نقش آن، اتصال به فرایند و
                        یک شاهد لازم برای تأیید وضعیتش را در دفتر زیر بنویس.
                      </p>
                      <button onClick={() => openReference("atlas")}>
                        بازکردن اطلس کنار درس
                        <ArrowLeft size={16} />
                      </button>
                    </div>
                  ) : (
                    <ChapterCase key={lesson.id} lesson={lesson} />
                  )}
                </section>
                <section className="course-notebook">
                  <h2>دفتر این درس</h2>
                  <p>
                    {lesson.practice?.deliverable ||
                      "برداشت خودت از مثال و تمرین را بنویس: چه مشاهده کردی، چه نتیجه‌ای گرفتی و چه چیزی هنوز نامعلوم است؟"}
                  </p>
                  <label>
                    یادداشت و خروجی تمرین
                    <textarea
                      aria-label="یادداشت این درس"
                      maxLength={4000}
                      rows={5}
                      value={workbook[lesson.id] || ""}
                      onChange={(e) => learning.note(lesson.id, e.target.value)}
                      placeholder="مشاهدهٔ من… دلیل… سؤال بعدی…"
                    />
                  </label>
                  <div>
                    <small>
                      خودکار ذخیره می‌شود ·{" "}
                      {fa((workbook[lesson.id] || "").length)} / ۴۰۰۰
                    </small>
                    <button
                      onClick={() =>
                        downloadData(`SooVers-${lesson.id}-note.json`, {
                          lesson: lesson.id,
                          title: lesson.title,
                          note: workbook[lesson.id] || "",
                          contentVersion,
                          simulation: true,
                        })
                      }
                    >
                      دریافت یادداشت
                      <Download size={15} />
                    </button>
                  </div>
                </section>
                <section id="lesson-wrap" tabIndex={-1} className="course-wrap">
                  <div className="course-section-heading">
                    <span>۰۳</span>
                    <div>
                      <h2>این ایده را با خودت ببر</h2>
                      <p>{lesson.takeaway}</p>
                    </div>
                  </div>
                  <details className="course-quiz">
                    <summary>خودآزمایی اختیاری</summary>
                    <h3>{lesson.question.prompt}</h3>
                    <div className="ics-options">
                      {lesson.question.options.map((option, i) => (
                        <button
                          key={i}
                          disabled={quizBusy}
                          aria-pressed={results[lesson.id]?.choice === i}
                          onClick={() => void answer(i)}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    {quizError && <p role="alert">{quizError}</p>}
                    {results[lesson.id] && (
                      <p role="status" className="course-feedback">
                        {results[lesson.id].correct
                          ? "درست است."
                          : "یک بار دیگر بررسی کن."}{" "}
                        {lesson.question.explanation}
                      </p>
                    )}
                  </details>
                  <div className="course-next">
                    <p>
                      {lesson.bridge ||
                        (lessons[index + 1]
                          ? `حالا آماده‌ای «${lessons[index + 1].title}» را با تکیه بر این مفهوم بخوانی.`
                          : "مسیر را طی کردی. یادداشت‌ها و گزارش یادگیری‌ات را دریافت کن و هر بخش را که لازم است دوباره مرور کن.")}
                    </p>
                    <div>
                      {index > 0 && (
                        <button onClick={() => navigate(lessons[index - 1].id)}>
                          <ArrowRight size={16} />
                          درس قبل
                        </button>
                      )}
                      <button className="ics-primary" onClick={next}>
                        <Check size={17} />
                        {index < lessons.length - 1
                          ? "خواندم؛ ادامهٔ مسیر"
                          : "خواندم؛ پایان مسیر"}
                        <ArrowLeft size={17} />
                      </button>
                    </div>
                    {progress.completed.includes(lesson.id) && (
                      <small>مطالعهٔ این درس قبلاً ثبت شده است.</small>
                    )}
                    <button
                      className="course-skip-lesson"
                      onClick={() =>
                        index < lessons.length - 1
                          ? navigate(lessons[index + 1].id)
                          : navigate()
                      }
                    >
                      ادامه بدون ثبت مطالعه
                    </button>
                  </div>
                </section>
              </article>
            </>
          )}
          <footer className="course-footer">
            <span>SooVers · آکادمی سیستم‌های کنترل صنعتی</span>
            <button onClick={() => openReference("sources")}>
              منابع و محدودهٔ محتوا
            </button>
          </footer>
        </div>
      </div>
      <dialog
        ref={outline}
        className="reader-dialog course-outline-dialog"
        aria-label="فهرست فصل‌ها"
      >
        <div className="reader-dialog-head">
          <h2>فهرست فصل‌ها</h2>
          <button
            aria-label="بستن فهرست"
            onClick={() => outline.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        {commonOutline}
      </dialog>
      <dialog
        ref={library}
        className="reader-dialog course-reference-dialog"
        aria-label="کتابخانه کنار درس"
      >
        <div className="reader-dialog-head">
          <div>
            <h2>کتابخانه کنار درس</h2>
            <small>با بستن این پنجره، به همان جای درس برمی‌گردی.</small>
          </div>
          <button
            aria-label="بستن کتابخانه"
            onClick={() => library.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <nav aria-label="بخش‌های کتابخانه">
          {(["glossary", "atlas", "book", "sources"] as Reference[]).map(
            (kind, i) => (
              <button
                key={kind}
                aria-pressed={reference === kind}
                onClick={() => setReference(kind)}
              >
                {["واژه‌نامه", "اطلس تجهیزات", "کتاب دانشجو", "منابع دوره"][i]}
              </button>
            ),
          )}
        </nav>
        <div className="course-reference-body">
          {reference === "glossary" ? (
            <Glossary />
          ) : reference === "atlas" ? (
            <Atlas openLesson={navigate} />
          ) : reference === "book" ? (
            reading[validLesson.id] ? (
              <BookReading ids={reading[validLesson.id]} />
            ) : (
              <>
                <h3>خوانش کتاب برای فصل‌های ۱ و ۲</h3>
                <p>
                  این فصل به‌صورت مستقل برای آکادمی تألیف شده است. منابع آن در
                  پایان متن درس قرار دارند.
                </p>
                <button onClick={() => navigate("process")}>
                  بازکردن فصل اول
                </button>
              </>
            )
          ) : (
            <CourseSources />
          )}
        </div>
      </dialog>
    </main>
  );
}
function CourseOutline({
  selected,
  completed,
  onOpen,
}: {
  selected?: string;
  completed: string[];
  onOpen: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const outlineRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = outlineRef.current?.querySelector<HTMLElement>(
      '[aria-current="step"]',
    );
    const scroller =
      outlineRef.current?.closest<HTMLElement>(".course-sidebar");
    if (element && scroller) {
      const box = element.getBoundingClientRect(),
        area = scroller.getBoundingClientRect();
      if (box.bottom > area.bottom || box.top < area.top)
        scroller.scrollTop += box.top - area.top - scroller.clientHeight / 2;
    }
  }, [selected]);
  const filtered = chapters.filter(
    (ch) =>
      !query ||
      (
        ch.title +
        " " +
        ch.number +
        " " +
        fa(ch.number) +
        " " +
        ch.lessons.map((l) => l.title).join(" ")
      )
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
  );
  return (
    <div className="course-outline" ref={outlineRef}>
      <label className="course-search">
        <Search size={16} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="نام درس یا شمارهٔ فصل…"
          aria-label="جست‌وجوی درس‌ها"
        />
      </label>
      <nav aria-label="فصل‌های دوره">
        {filtered.map((ch) => (
          <details
            key={ch.number}
            open={
              query
                ? true
                : ch.lessons.some((l) => l.id === selected) || undefined
            }
          >
            <summary
              aria-current={
                ch.lessons.length === 1 && ch.lessons[0].id === selected
                  ? "step"
                  : undefined
              }
              onClick={(e) => {
                if (ch.lessons.length === 1) {
                  e.preventDefault();
                  onOpen(ch.lessons[0].id);
                }
              }}
            >
              <span>{fa(ch.number)}</span>
              <b>{ch.title}</b>
              {ch.lessons.every((l) => completed.includes(l.id)) && (
                <Check size={14} />
              )}
            </summary>
            {ch.lessons.length > 1 &&
              ch.lessons.map((l) => (
                <button
                  key={l.id}
                  aria-current={selected === l.id ? "step" : undefined}
                  onClick={() => onOpen(l.id)}
                >
                  <span>
                    {completed.includes(l.id) ? <Check size={14} /> : "—"}
                  </span>
                  {l.title}
                </button>
              ))}
          </details>
        ))}
      </nav>
      {!filtered.length && <p>درسی پیدا نشد. عبارت کوتاه‌تری بنویس.</p>}
    </div>
  );
}
function CourseSources() {
  return (
    <section className="course-source-copy">
      <h3>منابع و روش تدوین</h3>
      <p>
        فصل‌های ۱ و ۲ بر اساس سند Industrial Automation — Book B, Student
        Release 2 ساخته شده‌اند و ۳۷ بخش درسی و ۱۴ بخش اطلس از متن انگلیسی آن در
        کتابخانه قابل مطالعه‌اند.
      </p>
      <p>
        راهنمای فصل‌های ۳ تا ۳۴، متن و پرونده‌های تألیفی آکادمی است و ترتیب
        سرفصل‌های طرح کتاب را دنبال می‌کند. منابع اولیهٔ هر درس همان‌جا
        آمده‌اند. این راهنما جایگزین تمام ۸۱۶ ساعت برنامهٔ پیشنهادی یا آموزش
        عملی با سخت‌افزار نیست.
      </p>
      <a href={sharedConversation} target="_blank" rel="noreferrer">
        گفت‌وگوی مرجع کتاب ↗
      </a>
      <p>
        فایل‌های اصلی SANS، کتاب مدرس و بستهٔ Python همراه کتاب دریافت نشده‌اند؛
        ارجاع‌های آن‌ها در متن انگلیسی، متعلق به خود کتاب است. ادعای تأیید یا
        مدرک رسمی SANS نداریم.
      </p>
      <h3>تمرین‌های این نسخه</h3>
      <p>
        داده‌ها و سناریوها آموزشی و ساختگی‌اند؛ ابزارها به شبکه یا تجهیز صنعتی
        وصل نمی‌شوند. یادداشت‌ها و پیشرفت ذخیره می‌شوند؛ اجرای شبیه‌ساز و
        انتخاب‌های پرونده با خروج از درس بازنشانی می‌شوند و می‌توان خروجی آن‌ها
        را دریافت کرد.
      </p>
      <a
        href="https://csrc.nist.gov/pubs/sp/800/82/r3/final"
        target="_blank"
        rel="noreferrer"
      >
        NIST SP 800-82 Rev. 3 ↗
      </a>
    </section>
  );
}
