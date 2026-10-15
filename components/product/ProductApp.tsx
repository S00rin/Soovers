"use client";
import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  Clock3,
  Download,
  GraduationCap,
  Layers3,
  LockKeyhole,
  LogOut,
  ShieldCheck,
  Terminal,
  UserRound,
} from "lucide-react";
import {
  api,
  RequestError,
  type User,
  type Course,
  type LabSubmission,
} from "@/lib/product/api";
import {
  chapters,
  labCases,
  type CourseProgress,
} from "@/lib/education/f5-course";
import "./product.css";
const Academy = lazy(() => import("../education/F5Academy"));
const Tower = lazy(() => import("../tower/TowerApp"));
const fa = (value: number) => value.toLocaleString("fa-IR");
const message = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "ارتباط برقرار نشد. دوباره تلاش کنید.";
export class ProductBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="product-loading" role="alert">
        <h1>نمایش این بخش متوقف شد.</h1>
        <p>پیشرفت ذخیره‌شده در حساب شما محفوظ است.</p>
        <button className="product-primary" onClick={() => location.reload()}>
          بارگذاری دوباره
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
function Brand() {
  return (
    <a className="product-brand" href="#home" aria-label="خانهٔ SooVers">
      <span>S</span>
      <b dir="ltr">
        SooVers<small>CYBERSECURITY ACADEMY</small>
      </b>
    </a>
  );
}
export default function ProductApp() {
  const [route, setRoute] = useState(location.hash || "#home");
  const [user, setUser] = useState<User | null>(null),
    [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [registration, setRegistration] = useState(true);
  const [sync, setSync] = useState("همگام با حساب شما"),
    [busy, setBusy] = useState(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const pendingProgress = useRef<CourseProgress | null>(null);
  const epoch = useRef(0);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const session = await api<{ user: User | null; registration: boolean }>(
        "/session",
      );
      setUser(session.user);
      setRegistration(session.registration);
      if (session.user)
        setCourse((await api<{ course: Course | null }>("/course")).course);
      else setCourse(null);
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const onHash = async () => {
      const target = location.hash || "#home";
      if (pendingProgress.current) {
        try {
          await queue.current;
          if (pendingProgress.current) await save(pendingProgress.current);
        } catch {
          history.replaceState(null, "", route);
          setError("پیش از خروج، پیشرفت را دوباره ذخیره کنید.");
          return;
        }
      }
      setRoute(target);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [route]);
  const preview = route === "#tower" || route === "#demo";
  useEffect(() => {
    if (!preview) void refresh();
  }, [preview, refresh]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (pendingProgress.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  const recover = useCallback((e: unknown) => {
    if (e instanceof RequestError && e.status === 401) {
      epoch.current++;
      setUser(null);
      setCourse(null);
      setError("نشست شما پایان یافته است. دوباره وارد شوید.");
    }
  }, []);
  const save = useCallback(
    (progress: CourseProgress) => {
      pendingProgress.current = progress;
      setSync("در حال ذخیره…");
      const generation = epoch.current;
      const request = queue.current
        .catch(() => {})
        .then(async () => {
          if (generation !== epoch.current) return;
          try {
            const result = await api<{ course: Course }>(
              "/course/progress",
              "PATCH",
              {
                chapter: progress.chapter,
                parts: progress.parts,
                answers: progress.answers,
              },
            );
            if (generation === epoch.current) {
              setCourse(result.course);
              if (pendingProgress.current === progress) {
                pendingProgress.current = null;
                setSync("همگام با حساب شما");
              }
            }
          } catch (e) {
            setSync("ذخیره نشد؛ تلاش دوباره");
            recover(e);
            throw e;
          }
        });
      queue.current = request;
      return request;
    },
    [recover],
  );
  const submitLab = useCallback(
    async (input: LabSubmission) => {
      const generation = epoch.current;
      await queue.current.catch(() => {});
      if (generation !== epoch.current)
        throw new Error("نشست تغییر کرده است؛ دوباره تلاش کنید.");
      try {
        const data = await api<{
          course: Course;
          result: { ok: boolean; text: string };
        }>("/course/labs", "POST", input);
        if (generation === epoch.current) setCourse(data.course);
        return data.result;
      } catch (e) {
        if (generation === epoch.current) recover(e);
        throw e;
      }
    },
    [recover],
  );
  const submitAssessment = useCallback(
    async (answers: number[]) => {
      const generation = epoch.current;
      await queue.current.catch(() => {});
      if (generation !== epoch.current)
        throw new Error("نشست تغییر کرده است؛ دوباره تلاش کنید.");
      try {
        const data = await api<{
          course: Course;
          result: { correct: number; total: number };
        }>("/course/assessment", "POST", { answers });
        if (generation === epoch.current) setCourse(data.course);
        return data.result;
      } catch (e) {
        if (generation === epoch.current) recover(e);
        throw e;
      }
    },
    [recover],
  );
  const report = async () => {
    const generation = epoch.current;
    try {
      await queue.current;
      if (generation !== epoch.current) return;
      const data = await api("/course/report");
      if (generation !== epoch.current) return;
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "SooVers-F5-Learning-Report.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(message(e));
      recover(e);
    }
  };
  const enroll = async () => {
    const generation = epoch.current;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ course: Course }>("/course/enroll", "POST");
      if (generation !== epoch.current) return;
      setCourse(result.course);
      location.hash = "academy";
    } catch (e) {
      setError(message(e));
      recover(e);
    } finally {
      setBusy(false);
    }
  };
  const logout = async () => {
    setBusy(true);
    try {
      await queue.current;
      if (pendingProgress.current) await save(pendingProgress.current);
      await api("/auth/logout", "POST");
      epoch.current++;
      pendingProgress.current = null;
      setUser(null);
      setCourse(null);
      location.hash = "home";
    } catch (e) {
      setError(message(e));
      recover(e);
    } finally {
      setBusy(false);
    }
  };
  if (route === "#tower" || route === "#demo")
    return (
      <ProductBoundary>
        <div className="preview-bar">
          <span>پیش‌نمایش آموزشی · پیشرفت این بخش به حساب شما متصل نیست</span>
          <a href="#home">
            بازگشت به آکادمی <ArrowLeft size={14} />
          </a>
        </div>
        <Suspense fallback={<Loading />}>
          {route === "#tower" ? <Tower /> : <Academy />}
        </Suspense>
      </ProductBoundary>
    );
  if (loading) return <Loading />;
  if (!user)
    return (
      <Landing
        error={error}
        registration={registration}
        onRetry={refresh}
        onLogin={async (account) => {
          epoch.current++;
          pendingProgress.current = null;
          queue.current = Promise.resolve();
          setUser(account);
          setError("");
          try {
            setCourse((await api<{ course: Course | null }>("/course")).course);
            location.hash = "home";
          } catch (e) {
            setError(message(e));
          }
        }}
      />
    );
  if (route === "#academy" && course)
    return (
      <ProductBoundary>
        <Suspense fallback={<Loading />}>
          <Academy
            key={user.id}
            account={user.name}
            initialProgress={course.progress}
            onSave={save}
            onLab={submitLab}
            onAssessment={submitAssessment}
            onReport={report}
            serverScore={course.score}
            serverBestCorrect={course.bestCorrect}
            syncStatus={sync}
            onRetrySave={() => {
              if (pendingProgress.current)
                void save(pendingProgress.current).catch(() => {});
            }}
          />
        </Suspense>
        {error && (
          <div className="product-toast" role="alert">
            {error}
            <button onClick={() => setError("")}>بستن</button>
          </div>
        )}
      </ProductBoundary>
    );
  return (
    <main className="product" dir="rtl">
      <Header user={user} logout={logout} busy={busy} />
      <div className="product-workspace">
        <nav className="product-tabs" aria-label="حساب یادگیری">
          <a
            href="#home"
            aria-current={route !== "#account" ? "page" : undefined}
          >
            <GraduationCap size={18} />
            یادگیری من
          </a>
          <a
            href="#account"
            aria-current={route === "#account" ? "page" : undefined}
          >
            <UserRound size={17} />
            حساب کاربری
          </a>
        </nav>
        {error && (
          <p className="product-error" role="alert">
            {error}
          </p>
        )}
        {route === "#account" ? (
          <Account user={user} />
        ) : (
          <>
            <div className="workspace-heading">
              <div>
                <span className="product-kicker">YOUR NEXT CHAPTER</span>
                <h1>{user.name}، آمادهٔ قدم بعدی؟</h1>
                <p>
                  {course
                    ? "از همان‌جایی که توقف کردی، ادامه بده."
                    : "یک مسیر روشن؛ از شناخت دستگاه تا تحلیل رخداد."}
                </p>
              </div>
              <span className="workspace-status">
                <span />
                پیشرفت متصل به حساب
              </span>
            </div>
            <section className="enrolled-course">
              <div className="course-art" aria-hidden="true">
                <span>f5</span>
                <div className="rack-line" />
                <div className="rack-line" />
                <div className="rack-line" />
                <small>BIG-IP / DEVICE ACADEMY</small>
              </div>
              <div className="enrolled-copy">
                <span className="product-kicker">NETWORK & SECURITY · 01</span>
                <h2>از دستگاه تا تصمیم درست.</h2>
                <p>
                  کاوش سه‌بعدی F5 BIG-IP، دنبال‌کردن ترافیک و حل پرونده‌های شبکه
                  و امنیت.
                </p>
                <div className="course-facts">
                  <span>
                    <BookOpen size={16} />۶ بخش
                  </span>
                  <span>
                    <Terminal size={16} />۳ آزمایشگاه شبیه‌سازی
                  </span>
                  <span>
                    <Clock3 size={16} />
                    حدود ۳۶ دقیقه
                  </span>
                </div>
                {course && (
                  <div className="course-progress">
                    <label htmlFor="course-progress">
                      پیشرفت مهارتی <b>{fa(course.score)}٪</b>
                    </label>
                    <progress
                      id="course-progress"
                      value={course.score}
                      max={100}
                    />
                    <small>
                      {fa(course.progress.solved.length)} پرونده حل‌شده · بهترین
                      ارزیابی: {fa(course.bestCorrect)} از ۳
                    </small>
                  </div>
                )}
                <button
                  className="product-primary"
                  disabled={busy}
                  onClick={() =>
                    course ? (location.hash = "academy") : void enroll()
                  }
                >
                  {busy
                    ? "در حال ثبت‌نام…"
                    : course
                      ? "ادامهٔ یادگیری"
                      : "ثبت‌نام و شروع دوره"}
                  <ArrowLeft size={18} />
                </button>
              </div>
            </section>
            <div className="workspace-lower">
              <section className="learning-outline">
                <div className="section-caption">
                  <h2>مسیر تو در این دوره</h2>
                  <small>به‌ترتیب یا با سرعت خودت</small>
                </div>
                {chapters.map((chapter, i) => {
                  const done =
                    !!course &&
                    (i === 0
                      ? course.progress.parts.length === 6
                      : i === 4
                        ? course.progress.solved.length === 3
                        : i === 5
                          ? course.bestCorrect === 3
                          : false);
                  return (
                    <div className="outline-row" key={chapter.en}>
                      <span className={done ? "done" : ""}>
                        {done ? (
                          <Check size={16} />
                        ) : (
                          String(i + 1).padStart(2, "0")
                        )}
                      </span>
                      <div>
                        <b>{chapter.title}</b>
                        <small>{chapter.en}</small>
                      </div>
                      <small>{chapter.time}</small>
                    </div>
                  );
                })}
              </section>
              <section className="learning-history">
                <div className="section-caption">
                  <h2>سابقهٔ تمرین</h2>
                  {course && (
                    <button onClick={report} aria-label="دریافت گزارش حساب">
                      <Download size={17} />
                    </button>
                  )}
                </div>
                {!course?.attempts.length ? (
                  <div className="history-empty">
                    <ShieldCheck size={30} />
                    <h3>اولین تجربه‌ات در انتظار توست.</h3>
                    <p>
                      نتیجهٔ هر آزمایشگاه و ارزیابی اینجا ثبت می‌شود؛ حتی اگر
                      نیاز به تلاش دوباره داشته باشد.
                    </p>
                  </div>
                ) : (
                  <ol>
                    {course.attempts.slice(0, 8).map((attempt) => (
                      <li key={attempt.id}>
                        <span
                          className={
                            attempt.correct === attempt.total
                              ? "attempt-pass"
                              : "attempt-retry"
                          }
                        >
                          {attempt.correct === attempt.total ? (
                            <Check size={16} />
                          ) : (
                            <ArrowRight size={16} />
                          )}
                        </span>
                        <div>
                          <b>
                            {attempt.kind === "assessment"
                              ? "ارزیابی دانش"
                              : labCases.find(
                                  (item) => item.id === attempt.caseId,
                                )?.title}
                          </b>
                          <small>
                            {new Date(attempt.createdAt).toLocaleString(
                              "fa-IR",
                              { dateStyle: "medium", timeStyle: "short" },
                            )}
                          </small>
                        </div>
                        <span>
                          {attempt.kind === "assessment"
                            ? `${fa(attempt.correct)} / ${fa(attempt.total)}`
                            : attempt.correct
                              ? "حل شد"
                              : "تمرین دوباره"}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
                <p className="history-note">
                  آزمایشگاه‌ها شبیه‌سازی آموزشی‌اند. گزارش یادگیری، مدرک رسمی F5
                  نیست.
                </p>
              </section>
            </div>
          </>
        )}
      </div>
      <Footer />
    </main>
  );
}
function Loading() {
  return (
    <div className="product-loading" role="status">
      <span className="loading-symbol">S</span>
      <p>در حال آماده‌سازی آکادمی…</p>
    </div>
  );
}
function Header({
  user,
  logout,
  busy,
}: {
  user: User;
  logout: () => void;
  busy: boolean;
}) {
  return (
    <header className="product-header">
      <Brand />
      <a href="#tower" className="campus-link">
        بازدید از پردیس سه‌بعدی <Layers3 size={16} />
      </a>
      <div className="product-user">
        <span>{user.name}</span>
        <button onClick={logout} disabled={busy} aria-label="خروج از حساب">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
function Footer() {
  return (
    <footer className="product-footer">
      <span dir="ltr">© {new Date().getFullYear()} SooVers Academy</span>
      <span>یادگیری با تجربه، تصمیم با شواهد.</span>
      <a href="#tower">
        پیش‌نمایش پردیس <ChevronLeft size={14} />
      </a>
    </footer>
  );
}
function Landing({
  error,
  registration,
  onLogin,
  onRetry,
}: {
  error: string;
  registration: boolean;
  onLogin: (user: User) => Promise<void>;
  onRetry: () => Promise<void>;
}) {
  const [mode, setMode] = useState<"register" | "login">(
      registration ? "register" : "login",
    ),
    [busy, setBusy] = useState(false),
    [localError, setLocalError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setLocalError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await api<{ user: User }>("/auth/" + mode, "POST", data);
      await onLogin(result.user);
    } catch (e) {
      setLocalError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="product product-landing" dir="rtl">
      <header className="product-header">
        <Brand />
        <a className="campus-link" href="#tower">
          کشف پردیس سه‌بعدی <ArrowLeft size={17} />
        </a>
      </header>
      <div className="landing-layout">
        <section className="landing-story">
          <span className="product-kicker">
            <span /> LEARN. INVESTIGATE. DEFEND.
          </span>
          <h1>
            دانش شبکه را
            <br />
            به <em>مهارت واقعی</em>
            <br />
            تبدیل کن.
          </h1>
          <p className="landing-description">
            دستگاه را از نزدیک بشناس. شواهد را کنار هم بگذار.
            <br />
            با هر تصمیم، یک قدم به تحلیلگر بهتر بودن نزدیک شو.
          </p>
          <div className="landing-device" aria-hidden="true">
            <div className="device-label">
              <span>F5 BIG-IP</span>
              <span>INTERACTIVE LEARNING / 01</span>
            </div>
            <div className="device-body">
              <strong>f5</strong>
              <div className="device-vents">
                {Array.from({ length: 14 }, (_, i) => (
                  <i key={i} />
                ))}
              </div>
              <div className="device-ports">
                {Array.from({ length: 8 }, (_, i) => (
                  <i key={i} />
                ))}
              </div>
              <span className="device-led" />
            </div>
            <div className="device-baseline">
              <span />
              EXPLORE THE SYSTEM. UNDERSTAND THE SIGNAL.
            </div>
          </div>
          <div className="landing-facts">
            <span>
              <b>۰۶</b>بخش تخصصی
            </span>
            <span>
              <b>۰۳</b>پروندهٔ تعاملی
            </span>
            <span>
              <b>۳۶</b>دقیقه یادگیری
            </span>
          </div>
        </section>
        <section className="auth-panel" aria-labelledby="auth-heading">
          <div className="auth-top">
            <span className="auth-icon">
              <GraduationCap size={24} />
            </span>
            <span className="product-kicker">YOUR LEARNING STARTS HERE</span>
          </div>
          <h2 id="auth-heading">
            {mode === "register" ? "مسیرت را شروع کن." : "خوش برگشتی."}
          </h2>
          <p>
            {mode === "register"
              ? "حساب بساز؛ پیشرفتت در هر دستگاه همراه توست."
              : "وارد شو و یادگیری را از همان‌جا ادامه بده."}
          </p>
          <div className="auth-tabs">
            {registration && (
              <button
                aria-pressed={mode === "register"}
                onClick={() => {
                  setMode("register");
                  setLocalError("");
                }}
              >
                ساخت حساب
              </button>
            )}
            <button
              aria-pressed={mode === "login"}
              onClick={() => {
                setMode("login");
                setLocalError("");
              }}
            >
              ورود به حساب
            </button>
          </div>
          <form onSubmit={submit}>
            {mode === "register" && (
              <label>
                نام شما
                <input
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={80}
                  placeholder="نام و نام خانوادگی"
                />
              </label>
            )}
            <label>
              ایمیل
              <input
                name="email"
                type="email"
                dir="ltr"
                autoComplete="email"
                required
                maxLength={254}
                placeholder="you@example.com"
              />
            </label>
            <label>
              گذرواژه
              <input
                name="password"
                type="password"
                dir="ltr"
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
                required
                minLength={mode === "register" ? 12 : 1}
                maxLength={128}
                placeholder={
                  mode === "register" ? "حداقل ۱۲ نویسه" : "گذرواژهٔ شما"
                }
              />
            </label>
            {mode === "register" && (
              <small className="password-help">
                از یک عبارت طولانی و منحصر‌به‌فرد استفاده کن.
              </small>
            )}
            {(localError || error) && (
              <div className="product-error" role="alert">
                {localError || error}
                {error && !localError && (
                  <button type="button" onClick={onRetry}>
                    بررسی دوبارهٔ اتصال
                  </button>
                )}
              </div>
            )}
            <button className="product-primary" disabled={busy}>
              {busy
                ? "در حال بررسی…"
                : mode === "register"
                  ? "ساخت حساب و شروع یادگیری"
                  : "ورود به آکادمی"}
              <ArrowLeft size={18} />
            </button>
          </form>
          <p className="auth-note">
            <LockKeyhole size={14} />
            اطلاعات حساب و پیشرفت برای ارائهٔ آموزش ذخیره می‌شوند.
          </p>
          {mode === "login" && (
            <details className="recovery-help">
              <summary>گذرواژه را فراموش کرده‌اید؟</summary>
              <p>
                برای دریافت گذرواژهٔ موقت با مدیر محل استقرار SooVers تماس
                بگیرید. بازیابی از طریق ایمیل در این نسخه فعال نیست.
              </p>
            </details>
          )}
          <div className="auth-preview">
            <span>ابتدا محیط را ببین.</span>
            <a href="#demo">
              پیش‌نمایش دوره <ArrowLeft size={15} />
            </a>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  );
}
function Account({ user }: { user: User }) {
  const [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState("");
  async function change(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setError("");
    setStatus("");
    if (data.password !== data.confirm) {
      setError("گذرواژه‌های جدید یکسان نیستند.");
      return;
    }
    setBusy(true);
    try {
      await api("/auth/password", "POST", data);
      form.reset();
      setStatus("گذرواژه تغییر کرد. نشست‌های دیگر بسته شدند.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="account-panel">
      <span className="product-kicker">YOUR ACCOUNT</span>
      <h1>حساب کاربری</h1>
      <div className="account-details">
        <UserRound size={26} />
        <div>
          <b>{user.name}</b>
          <span dir="ltr">{user.email}</span>
        </div>
      </div>
      <h2>تغییر گذرواژه</h2>
      <p>با تغییر گذرواژه، نشست‌های دیگر حساب بسته می‌شوند.</p>
      <form onSubmit={change}>
        <label>
          گذرواژهٔ فعلی
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
          />
        </label>
        <label>
          گذرواژهٔ جدید
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
          />
        </label>
        <label>
          تکرار گذرواژهٔ جدید
          <input
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
          />
        </label>
        {error && (
          <p className="product-error" role="alert">
            {error}
          </p>
        )}
        {status && (
          <p className="product-success" role="status">
            {status}
          </p>
        )}
        <button className="product-primary" disabled={busy}>
          {busy ? "در حال ذخیره…" : "ذخیرهٔ گذرواژه"}
        </button>
      </form>
    </section>
  );
}
