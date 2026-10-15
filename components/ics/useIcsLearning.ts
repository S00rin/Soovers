import { useEffect, useRef, useState } from "react";
import { api, type User } from "@/lib/product/api";
import {
  ICS_STORAGE_KEY,
  initialProgress,
  parseProgress,
  gradeAnswer,
  type LearningProgress,
  type QuizResults,
} from "@/lib/ics/model";
import { lessons, contentVersion } from "@/lib/ics/content";
export type LearningRecord = {
  progress: LearningProgress;
  results: QuizResults;
  workbook: Record<string, string>;
};
type Job =
  | { kind: "progress"; value: LearningProgress }
  | { kind: "note"; id: string; value: string };
export function useIcsLearning(account?: User) {
  const [progress, setProgress] = useState(initialProgress),
    [results, setResults] = useState<QuizResults>({}),
    [workbook, setWorkbook] = useState<Record<string, string>>({}),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [sync, setSync] = useState(""),
    [failed, setFailed] = useState(false),
    [revision, reload] = useState(0),
    [saving, setSaving] = useState(false);
  const record = useRef<LearningRecord>({ progress, results, workbook }),
    jobs = useRef(new Map<string, Job>()),
    queue = useRef(Promise.resolve()),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    active = useRef(true);
  function storeLocal() {
    localStorage.setItem(ICS_STORAGE_KEY, JSON.stringify(record.current));
  }
  useEffect(() => {
    active.current = true;
    let current = true;
    setReady(false);
    setError("");
    (async () => {
      try {
        let data: Partial<LearningRecord> = {};
        if (account) data = await api<LearningRecord>("/ics");
        else
          try {
            data = JSON.parse(localStorage.getItem(ICS_STORAGE_KEY) || "{}");
          } catch {
            setSync(
              "ذخیرهٔ مرورگر در دسترس نیست؛ می‌توانی گزارش را دریافت کنی.",
            );
          }
        if (!current) return;
        data = data && typeof data === "object" ? data : {};
        const safeResults: QuizResults = {};
        for (const [id, result] of Object.entries(data.results || {})) {
          try {
            safeResults[id] = gradeAnswer(id, result.choice);
          } catch {}
        }
        const safeNotes: Record<string, string> = {};
        for (const [id, note] of Object.entries(data.workbook || {})) {
          if (lessons.some((l) => l.id === id) && typeof note === "string")
            safeNotes[id] = note.slice(0, 4000);
        }
        const p = parseProgress(data.progress);
        record.current = {
          progress: p,
          results: safeResults,
          workbook: safeNotes,
        };
        setProgress(p);
        setResults(safeResults);
        setWorkbook(safeNotes);
        setReady(true);
      } catch (e) {
        if (current)
          setError(e instanceof Error ? e.message : "بارگذاری انجام نشد.");
      }
    })();
    return () => {
      current = false;
      active.current = false;
    };
  }, [account?.id, revision]);
  async function send(key: string, job: Job) {
    if (jobs.current.get(key) !== job) return;
    if (account) {
      if (job.kind === "progress")
        await api("/ics/progress", "PATCH", {
          ...job.value,
          expectedUserId: account.id,
        });
      else
        await api("/ics/workbook", "PUT", {
          lesson: job.id,
          note: job.value,
          expectedUserId: account.id,
        });
    } else storeLocal();
    if (jobs.current.get(key) === job) jobs.current.delete(key);
  }
  function flush() {
    clearTimeout(timer.current);
    const queued = [...jobs.current.entries()];
    const task = queue.current
      .catch(() => {})
      .then(async () => {
        try {
          for (const [key, job] of queued) await send(key, job);
          if (active.current) {
            setFailed(false);
            setSaving(jobs.current.size > 0);
            setSync(
              jobs.current.size
                ? "در حال ذخیره…"
                : account
                  ? "در حساب شما ذخیره شد"
                  : "در این مرورگر ذخیره شد",
            );
          }
        } catch (e) {
          if (active.current) {
            setFailed(true);
            setSaving(false);
            setSync(e instanceof Error ? e.message : "ذخیره انجام نشد.");
          }
          throw e;
        }
      });
    queue.current = task;
    return task;
  }
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (jobs.current.size) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      clearTimeout(timer.current);
      if (jobs.current.size) void flushRef.current().catch(() => {});
    };
  }, []);
  function enqueue(key: string, job: Job, delay = 0) {
    jobs.current.set(key, job);
    setSaving(true);
    setFailed(false);
    setSync("در حال ذخیره…");
    clearTimeout(timer.current);
    if (delay)
      timer.current = setTimeout(() => void flush().catch(() => {}), delay);
    else void flush().catch(() => {});
  }
  function change(next: LearningProgress, delay = 0) {
    record.current.progress = next;
    setProgress(next);
    enqueue("progress", { kind: "progress", value: next }, delay);
  }
  function note(id: string, value: string) {
    const next = { ...record.current.workbook, [id]: value };
    record.current.workbook = next;
    setWorkbook(next);
    enqueue("note:" + id, { kind: "note", id, value }, 700);
  }
  async function answer(id: string, choice: number) {
    const result = account
      ? await api<{ choice: number; correct: boolean }>(
          "/ics/assessment",
          "POST",
          { lesson: id, choice, expectedUserId: account.id },
        )
      : gradeAnswer(id, choice);
    if (!active.current) return;
    const next = { ...record.current.results, [id]: result };
    record.current.results = next;
    setResults(next);
    if (!account)
      try {
        storeLocal();
      } catch {
        setSync("نتیجه در حافظه است؛ ذخیرهٔ مرورگر در دسترس نیست.");
      }
  }
  async function report() {
    if (account) {
      await flush();
      return api("/ics/report");
    }
    await flush().catch(() => {});
    return {
      course: "ics-foundations",
      contentVersion,
      simulation: true,
      assessmentOptional: true,
      pendingSync: jobs.current.size > 0,
      ...record.current,
    };
  }
  return {
    progress,
    results,
    workbook,
    ready,
    error,
    sync,
    failed,
    saving,
    change,
    note,
    answer,
    report,
    flush,
    retry: () => void flush().catch(() => {}),
    reload: () => reload((n) => n + 1),
  };
}
