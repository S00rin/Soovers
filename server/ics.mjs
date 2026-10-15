import {
  initialProgress,
  parseProgress,
  gradeAnswer,
} from "../lib/ics/model.ts";
import { contentVersion, lessons } from "../lib/ics/content.ts";
import { transaction } from "./database.mjs";
export function icsRecord(db, userId) {
  const row = db
    .prepare(
      "SELECT lesson,completed,notes,updated_at FROM ics_progress WHERE user_id=?",
    )
    .get(userId);
  const results = Object.fromEntries(
    db
      .prepare(
        "SELECT lesson,choice,correct FROM ics_assessments WHERE user_id=?",
      )
      .all(userId)
      .map((r) => [r.lesson, { choice: r.choice, correct: !!r.correct }]),
  );
  return {
    progress: row
      ? {
          lesson: row.lesson,
          completed: JSON.parse(row.completed),
          notes: row.notes,
        }
      : initialProgress(),
    results,
    workbook: Object.fromEntries(
      db
        .prepare("SELECT lesson,note FROM ics_workbook WHERE user_id=?")
        .all(userId)
        .map((r) => [r.lesson, r.note]),
    ),
    updatedAt: row?.updated_at ?? null,
  };
}
export async function handleIcs({ route, db, user, req, body, json, fail }) {
  if (
    ![
      "GET /api/ics",
      "PATCH /api/ics/progress",
      "POST /api/ics/assessment",
      "GET /api/ics/report",
      "PUT /api/ics/workbook",
    ].includes(route)
  )
    return false;
  if (route === "GET /api/ics") {
    json(200, icsRecord(db, user.id));
    return true;
  }
  if (route === "GET /api/ics/report") {
    json(200, {
      course: "ics-foundations",
      contentVersion,
      learner: { id: user.id, name: user.name },
      simulation: true,
      assessmentOptional: true,
      generatedAt: new Date().toISOString(),
      ...icsRecord(db, user.id),
    });
    return true;
  }
  const input = await body(req);
  if (input.expectedUserId !== user.id)
    fail(409, "حساب تغییر کرده است؛ صفحه را دوباره باز کنید.");
  if (route === "PUT /api/ics/workbook") {
    if (
      Object.keys(input).some(
        (k) => !["expectedUserId", "lesson", "note"].includes(k),
      ) ||
      !lessons.some((l) => l.id === input.lesson) ||
      typeof input.note !== "string" ||
      input.note.length > 4000
    )
      fail(400, "یادداشت درس معتبر نیست.");
    db.prepare(
      "INSERT INTO ics_workbook(user_id,lesson,note,updated_at) VALUES (?,?,?,?) ON CONFLICT(user_id,lesson) DO UPDATE SET note=excluded.note,updated_at=excluded.updated_at",
    ).run(user.id, input.lesson, input.note, new Date().toISOString());
    json(200, { ok: true });
    return true;
  }
  if (route === "PATCH /api/ics/progress") {
    const { expectedUserId, ...submitted } = input;
    const clean = parseProgress(submitted);
    if (
      Object.keys(submitted).some(
        (k) => !["lesson", "completed", "notes"].includes(k),
      ) ||
      typeof submitted.notes !== "string" ||
      !Array.isArray(submitted.completed) ||
      JSON.stringify(submitted.lesson) !== JSON.stringify(clean.lesson) ||
      JSON.stringify(submitted.completed) !== JSON.stringify(clean.completed) ||
      submitted.notes !== clean.notes
    )
      fail(400, "دادهٔ پیشرفت معتبر نیست.");
    transaction(db, () => {
      const previous = icsRecord(db, user.id).progress;
      const completed = [
        ...new Set([...previous.completed, ...clean.completed]),
      ];
      db.prepare(
        "INSERT INTO ics_progress(user_id,lesson,completed,notes,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET lesson=excluded.lesson,completed=excluded.completed,notes=excluded.notes,updated_at=excluded.updated_at",
      ).run(
        user.id,
        clean.lesson,
        JSON.stringify(completed),
        clean.notes,
        new Date().toISOString(),
      );
    });
    json(200, icsRecord(db, user.id));
    return true;
  }
  if (
    Object.keys(input).some(
      (k) => !["expectedUserId", "lesson", "choice"].includes(k),
    )
  )
    fail(400, "فیلد پاسخ معتبر نیست.");
  let result;
  try {
    result = gradeAnswer(input.lesson, input.choice);
  } catch {
    fail(400, "پاسخ معتبر نیست.");
  }
  db.prepare(
    "INSERT INTO ics_assessments VALUES (?,?,?,?,?) ON CONFLICT(user_id,lesson) DO UPDATE SET choice=excluded.choice,correct=excluded.correct,updated_at=excluded.updated_at",
  ).run(
    user.id,
    input.lesson,
    result.choice,
    Number(result.correct),
    new Date().toISOString(),
  );
  json(200, result);
  return true;
}
