import { useState } from "react";
import type { Lesson } from "@/lib/ics/content";
export function ChapterCase({ lesson }: { lesson: Lesson }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const practice = lesson.practice;
  if (!practice) return null;
  return (
    <div className="course-case">
      <span className="course-kicker">پروندهٔ تمرینی · داده‌های ساختگی</span>
      <h3>{practice.title}</h3>
      <p>{practice.setup}</p>
      <div className="course-evidence">
        {practice.evidence.map((e, i) => (
          <article key={i}>
            <span>شاهد {(i + 1).toLocaleString("fa-IR")}</span>
            <h4>{e.label}</h4>
            <p>{e.text}</p>
          </article>
        ))}
      </div>
      {practice.steps.map((step, i) => (
        <fieldset className="course-decision" key={i}>
          <legend>{step.prompt}</legend>
          {step.options.map((option, j) => (
            <button
              type="button"
              aria-pressed={answers[i] === j}
              key={option}
              onClick={() => setAnswers((v) => ({ ...v, [i]: j }))}
            >
              {option}
            </button>
          ))}
          {answers[i] !== undefined && (
            <p className="course-feedback" role="status">
              <b>
                {answers[i] === step.answer
                  ? "استدلال درست است."
                  : "این گزینه را دوباره بررسی کن."}
              </b>{" "}
              {step.explanation}
            </p>
          )}
        </fieldset>
      ))}
      <div className="course-deliverable">
        <h4>خروجی این تمرین</h4>
        <p>{practice.deliverable}</p>
        <small>
          پاسخ را در دفتر همین درس بنویس. انتخاب‌ها برای تمرین‌اند و شرط ادامهٔ
          دوره نیستند.
        </small>
      </div>
    </div>
  );
}
