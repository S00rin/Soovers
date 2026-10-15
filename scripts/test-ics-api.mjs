import { DatabaseSync } from "node:sqlite";
import { openDatabase } from "../server/database.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createApplication } from "../server/app.mjs";
import { lessons } from "../lib/ics/content.ts";
await test("ICS account progress, optional assessments, isolation and upgrade persistence", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "soovers-ics-"));
  const options = {
    database: path.join(directory, "db.sqlite"),
    root: path.resolve("local-dist"),
    origin: "http://127.0.0.1",
  };
  let app, base;
  async function start() {
    app = await createApplication(options);
    await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
    base = "http://127.0.0.1:" + app.server.address().port;
  }
  async function req(route, method = "GET", data = {}, cookie = "") {
    const response = await fetch(base + "/api" + route, {
      method,
      headers: {
        Cookie: cookie,
        Origin: options.origin,
        "Content-Type": "application/json",
        "X-Soovers-Request": "1",
      },
      body: method === "GET" ? undefined : JSON.stringify(data),
    });
    return {
      status: response.status,
      body: await response.json(),
      cookie: response.headers.get("set-cookie")?.split(";")[0],
    };
  }
  try {
    await start();
    assert.equal((await req("/ics")).status, 401);
    assert.equal((await req("/ics/report")).status, 401);
    const alice = await req("/auth/register", "POST", {
      name: "Alice ICS",
      email: "ics-alice@example.com",
      password: "long industrial password",
    });
    const bob = await req("/auth/register", "POST", {
      name: "Bob ICS",
      email: "ics-bob@example.com",
      password: "long industrial password",
    });
    const a = alice.cookie,
      b = bob.cookie,
      expectedUserId = alice.body.user.id;
    assert.deepEqual((await req("/ics", "GET", {}, a)).body.results, {});
    // Every lesson can be marked read before submitting a single assessment or enrolling in F5.
    const save = {
      expectedUserId,
      lesson: "evidence",
      completed: lessons.map((l) => l.id),
      notes: "Question: range change; owner: engineering; retention: unknown.",
    };
    assert.equal((await req("/ics/progress", "PATCH", save, a)).status, 200);
    assert.equal(
      (await req("/ics", "GET", {}, a)).body.progress.completed.length,
      lessons.length,
    );
    assert.deepEqual(
      (await req("/ics", "GET", {}, b)).body.progress.completed,
      [],
    );
    assert.equal((await req("/ics/progress", "PATCH", save, b)).status, 409);
    assert.equal(
      (await req("/ics/progress", "PATCH", { ...save, score: 100 }, a)).status,
      400,
    );
    assert.equal(
      (
        await req(
          "/ics/progress",
          "PATCH",
          { ...save, completed: ["unknown"] },
          a,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await req(
          "/ics/progress",
          "PATCH",
          { ...save, notes: "x".repeat(6001) },
          a,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await req(
          "/ics/assessment",
          "POST",
          { expectedUserId, lesson: "scaling", choice: 0, correct: true },
          a,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await req(
          "/ics/assessment",
          "POST",
          { expectedUserId, lesson: "scaling", choice: 0 },
          a,
        )
      ).body.correct,
      false,
    );
    assert.equal(
      (
        await req(
          "/ics/assessment",
          "POST",
          { expectedUserId, lesson: "scaling", choice: 2 },
          a,
        )
      ).body.correct,
      true,
    );
    // Existing F5 course is still independent.
    await req("/course/enroll", "POST", {}, a);
    assert.equal(
      (await req("/course", "GET", {}, a)).body.course.id,
      "f5-big-ip",
    );
    assert.equal(
      (
        await req(
          "/ics/workbook",
          "PUT",
          { lesson: "process", note: "برداشت مستقل دانشجو", expectedUserId },
          a,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await req(
          "/ics/workbook",
          "PUT",
          { lesson: "process", note: "اختلاط حساب", expectedUserId },
          b,
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await req(
          "/ics/workbook",
          "PUT",
          { lesson: "invalid", note: "x", expectedUserId },
          a,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await req(
          "/ics/workbook",
          "PUT",
          { lesson: "process", note: "x".repeat(4001), expectedUserId },
          a,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await req(
          "/ics/workbook",
          "PUT",
          { lesson: "process", note: "x", score: 100, expectedUserId },
          a,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await req(
          "/ics/workbook",
          "PUT",
          { lesson: "process", note: 42, expectedUserId },
          a,
        )
      ).status,
      400,
    );
    assert.deepEqual((await req("/ics", "GET", {}, b)).body.workbook, {});
    await app.close();
    await start();
    const restored = (await req("/ics/report", "GET", {}, a)).body;
    assert.equal(restored.workbook.process, "برداشت مستقل دانشجو");
    assert.equal(restored.progress.notes, save.notes);
    assert.equal(restored.progress.lesson, "evidence");
    assert.equal(restored.results.scaling.correct, true);
    assert.equal(restored.assessmentOptional, true);
    assert.equal(
      (await req("/course", "GET", {}, a)).body.course.id,
      "f5-big-ip",
    );
    assert.deepEqual((await req("/ics/report", "GET", {}, b)).body.results, {});
    assert.equal(
      app.db.prepare("SELECT COUNT(*) AS n FROM migrations").get().n,
      3,
    );
  } finally {
    await app?.close();
    await rm(directory, { recursive: true, force: true });
  }
});

await test("adding per-lesson workbooks preserves a database from the previous release", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ics-upgrade-"));
  const filename = path.join(directory, "legacy.sqlite");
  let db = new DatabaseSync(filename);
  try {
    db.exec(
      "CREATE TABLE migrations(name TEXT PRIMARY KEY,applied_at TEXT NOT NULL)",
    );
    for (const name of ["001_academy.sql", "002_ics.sql"]) {
      db.exec(
        await readFile(
          new URL("../migrations/" + name, import.meta.url),
          "utf8",
        ),
      );
      db.prepare("INSERT INTO migrations VALUES (?,?)").run(name, "2026-10-15");
    }
    db.prepare("INSERT INTO users VALUES (?,?,?,?,?)").run(
      "legacy",
      "legacy@example.test",
      "Legacy learner",
      "fixture-only",
      "2026-10-15",
    );
    db.prepare("INSERT INTO ics_progress VALUES (?,?,?,?,?)").run(
      "legacy",
      "mismatch",
      '["process","scaling"]',
      "Existing evidence note",
      "2026-10-15",
    );
    db.close();
    db = openDatabase(filename);
    assert.equal(
      db.prepare("SELECT notes FROM ics_progress").get().notes,
      "Existing evidence note",
    );
    assert.equal(
      db.prepare("SELECT completed FROM ics_progress").get().completed,
      '["process","scaling"]',
    );
    db.prepare("INSERT INTO ics_workbook VALUES (?,?,?,?)").run(
      "legacy",
      "drawings",
      "New chapter work",
      "2026-10-15",
    );
    assert.equal(
      db.prepare("SELECT note FROM ics_workbook").get().note,
      "New chapter work",
    );
  } finally {
    db.close();
    await rm(directory, { recursive: true, force: true });
  }
});
