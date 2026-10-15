import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
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
      10,
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
    await app.close();
    await start();
    const restored = (await req("/ics/report", "GET", {}, a)).body;
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
      2,
    );
  } finally {
    await app?.close();
    await rm(directory, { recursive: true, force: true });
  }
});
