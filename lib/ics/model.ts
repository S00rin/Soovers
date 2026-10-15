import { lessons } from "./content.ts";
export const ICS_STORAGE_KEY = "soovers-ics-foundations-v1";
export type LearningProgress = {
  lesson: string;
  completed: string[];
  notes: string;
};
export type QuizResults = Record<string, { choice: number; correct: boolean }>;
export const initialProgress = (): LearningProgress => ({
  lesson: lessons[0].id,
  completed: [],
  notes: "",
});
export function parseProgress(value: unknown): LearningProgress {
  const v = (
    value && typeof value === "object" ? value : {}
  ) as Partial<LearningProgress>;
  const ids = new Set(lessons.map((l) => l.id));
  return {
    lesson:
      typeof v.lesson === "string" && ids.has(v.lesson)
        ? v.lesson
        : lessons[0].id,
    completed: Array.isArray(v.completed)
      ? [
          ...new Set(
            v.completed.filter(
              (id): id is string => typeof id === "string" && ids.has(id),
            ),
          ),
        ]
      : [],
    notes: typeof v.notes === "string" ? v.notes.slice(0, 6000) : "",
  };
}
export function gradeAnswer(lessonId: string, choice: number) {
  const lesson = lessons.find((l) => l.id === lessonId);
  if (
    !lesson ||
    !Number.isInteger(choice) ||
    choice < 0 ||
    choice >= lesson.question.options.length
  )
    throw new Error("پاسخ معتبر نیست.");
  return {
    choice,
    correct: choice === lesson.question.answer,
    explanation: lesson.question.explanation,
  };
}
export function currentToLevel(current: number, lower = 0, upper = 4) {
  if (![current, lower, upper].every(Number.isFinite) || upper <= lower)
    throw new Error("بازهٔ مهندسی معتبر نیست.");
  return {
    value: lower + ((current - 4) / 16) * (upper - lower),
    valid: current >= 4 && current <= 20,
  };
}
export function levelToCurrent(level: number, lower = 0, upper = 4) {
  if (![level, lower, upper].every(Number.isFinite) || upper <= lower)
    throw new Error("بازهٔ مهندسی معتبر نیست.");
  return 4 + (16 * (level - lower)) / (upper - lower);
}
export function loopMargin(
  supply: number,
  resistance: number,
  minimum: number,
  current = 20,
) {
  if (
    ![supply, resistance, minimum, current].every(Number.isFinite) ||
    [supply, resistance, minimum, current].some((n) => n < 0)
  )
    throw new Error("ورودی حلقه معتبر نیست.");
  const drop = (current / 1000) * resistance;
  return { drop, margin: supply - drop - minimum };
}
export type Scenario = "normal" | "disturbance" | "sensor" | "hmi";
export type ControlMode = "P" | "PI";
export type TankSample = {
  time: number;
  level: number;
  pv: number;
  display: number;
  age: number;
  command: number;
  inflow: number;
  outflow: number;
  integral: number;
  spillLitres: number;
};
export const initialTank = (): TankSample => ({
  time: 0,
  level: 2,
  pv: 2,
  display: 2,
  age: 0,
  command: 50,
  inflow: 10,
  outflow: 10,
  integral: 0,
  spillLitres: 0,
});
const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));
/** One-second Euler steps. All parameters are fictional; no network or device I/O. */
export function stepTank(
  s: TankSample,
  scenario: Scenario,
  mode: ControlMode,
): TankSample {
  const time = s.time + 1,
    inflow = scenario === "normal" || time <= 300 ? 10 : 14;
  const error = s.pv - 2;
  let integral = mode === "PI" ? s.integral + 0.4 * error : 0;
  const raw = 50 + 80 * error + integral;
  if (mode === "PI" && ((raw > 100 && error > 0) || (raw < 0 && error < 0)))
    integral = s.integral;
  const command = clamp(50 + 80 * error + integral, 0, 100),
    outflow = (command / 100) * 20;
  const unbounded = s.level + (inflow - outflow) / 1000 / 2;
  const level = clamp(unbounded, 0, 4),
    pv = scenario === "sensor" && time >= 300 ? 2 : level;
  const stale = scenario === "hmi" && time > 300;
  return {
    time,
    level,
    pv,
    display: stale ? s.display : pv,
    age: stale ? s.age + 1 : 0,
    command,
    inflow,
    outflow,
    integral,
    spillLitres: s.spillLitres + Math.max(0, unbounded - 4) * 2 * 1000,
  };
}
export function advanceTank(
  history: TankSample[],
  scenario: Scenario,
  mode: ControlMode,
  seconds = 60,
) {
  const next = [...history];
  for (let i = 0; i < seconds && next[next.length - 1].time < 1200; i++)
    next.push(stepTank(next[next.length - 1], scenario, mode));
  return next;
}
export const evidenceItems = [
  {
    id: "hmi",
    title: "نمایش HMI و Historian",
    observation:
      "هر دو ۱٫۰۰ متر، زمان دریافت تازه؛ هر دو از تگ PLC:LT101 می‌خوانند.",
    meaning: "توافق این دو مستقل نیست؛ هر دو یک تبدیل PLC را مصرف می‌کنند.",
  },
  {
    id: "range",
    title: "تنظیمات رنج",
    observation:
      "در نسخهٔ بازیابی‌شده: TX = ۰–۸ متر؛ PLC = ۰–۴ متر. زمان اعمال تنظیمات هنوز تأیید نشده.",
    meaning:
      "ناسازگاری رنج می‌تواند مقدار یک‌متری را توضیح دهد؛ هنوز منشأ و زمان تغییر را نمی‌دانیم.",
  },
  {
    id: "field",
    title: "اندازه‌گیری مستقل",
    observation:
      "گزارش آموزشی بهره‌برداری: سطح ۲٫۰۰ متر؛ زمان هم‌تراز با سایر نمونه‌ها، روش مرجع ثبت شده.",
    meaning:
      "با فرض اعتبار روش مستقل، اختلاف با نمایش را تأیید می‌کند. در محیط واقعی روش و زمان باید بررسی شوند.",
  },
  {
    id: "login",
    title: "ورود مهندسی و تیکت",
    observation:
      "ورود کاربر به EWS ثبت شده و تیکت تعمیرات وجود دارد؛ رکورد عملیات و نسخهٔ قبل/بعد هنوز جمع نشده.",
    meaning:
      "ورود و تیکت به‌تنهایی دانلود برنامه یا مجازبودن تمام تغییرها را اثبات نمی‌کنند.",
  },
];
