import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createApplication } from "../server/app.mjs";
import { knowledgeCheck, labCases } from "../lib/education/f5-course.ts";

await test("persistent academy API and access boundaries", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "soovers-api-"));
  const options = {
    database: path.join(directory, "academy.sqlite"),
    root: path.resolve("local-dist"),
    origin: "http://127.0.0.1",
  };
  let app, base;
  async function start() {
    app = await createApplication(options);
    await new Promise((resolve) => app.server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${app.server.address().port}`;
  }
  async function request(
    route,
    {
      method = "GET",
      data,
      cookie = "",
      origin = options.origin,
      headers = {},
    } = {},
  ) {
    const response = await fetch(base + "/api" + route, {
      method,
      headers: {
        Cookie: cookie,
        Origin: origin,
        "Content-Type": "application/json",
        "X-Soovers-Request": "1",
        ...headers,
      },
      body: method === "GET" ? undefined : JSON.stringify(data ?? {}),
    });
    return {
      status: response.status,
      body: await response.json(),
      cookie: response.headers.get("set-cookie")?.split(";")[0],
      headers: response.headers,
    };
  }
  const password = "a long learning password!";
  let alice, bob, aliceId;
  try {
    await start();
    await t.test(
      "anonymous access, CSRF, JSON validation and password policy",
      async () => {
        assert.equal((await request("/course")).status, 401);
        assert.equal(
          (
            await request("/auth/register", {
              method: "POST",
              origin: "https://attacker.example",
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await request("/auth/register", {
              method: "POST",
              headers: { "X-Soovers-Request": "" },
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await request("/auth/register", {
              method: "POST",
              headers: { "Content-Type": "text/plain" },
            })
          ).status,
          415,
        );
        assert.equal(
          (
            await request("/auth/register", {
              method: "POST",
              data: {
                name: "Alice",
                email: "alice@example.com",
                password: "weak",
              },
            })
          ).status,
          400,
        );
        const malformed = await fetch(base + "/api/auth/register", {
          method: "POST",
          headers: {
            Origin: options.origin,
            "X-Soovers-Request": "1",
            "Content-Type": "application/json",
          },
          body: "{",
        });
        assert.equal(malformed.status, 400);
      },
    );
    await t.test(
      "registration stores password hashes and opaque sessions",
      async () => {
        const first = await request("/auth/register", {
          method: "POST",
          data: {
            name: "Alice",
            email: "ALICE@example.com",
            password,
            role: "administrator",
          },
        });
        assert.equal(first.status, 201);
        alice = first.cookie;
        aliceId = first.body.user.id;
        assert.equal(first.body.user.email, "alice@example.com");
        assert.equal(first.body.user.role, undefined);
        assert.equal(first.body.user.password_hash, undefined);
        assert.match(first.headers.get("set-cookie"), /HttpOnly; SameSite=Lax/);
        const row = app.db
          .prepare("SELECT password_hash FROM users WHERE id=?")
          .get(aliceId);
        assert.notEqual(row.password_hash, password);
        assert.match(row.password_hash, /^[a-f0-9]+:[a-f0-9]+$/);
        assert.notEqual(
          app.db.prepare("SELECT token_hash FROM sessions LIMIT 1").get()
            .token_hash,
          alice.split("=")[1],
        );
        bob = (
          await request("/auth/register", {
            method: "POST",
            data: { name: "Bob", email: "bob@example.com", password },
          })
        ).cookie;
        assert.equal(
          (
            await request("/auth/register", {
              method: "POST",
              data: { name: "Alice", email: "alice@example.com", password },
            })
          ).status,
          409,
        );
        assert.equal(
          (
            await request("/auth/login", {
              method: "POST",
              data: { email: "alice@example.com", password: "wrong" },
            })
          ).status,
          401,
        );
        assert.equal(
          (
            await request("/auth/login", {
              method: "POST",
              data: { email: "unknown@example.com", password: "wrong" },
            })
          ).status,
          401,
        );
      },
    );
    await t.test(
      "enrollment gates writes and cannot be impersonated",
      async () => {
        assert.equal(
          (
            await request("/course/progress", {
              method: "PATCH",
              cookie: alice,
            })
          ).status,
          403,
        );
        assert.equal(
          (await request("/course/enroll", { method: "POST", cookie: alice }))
            .status,
          200,
        );
        assert.equal(
          (await request("/course/enroll", { method: "POST", cookie: alice }))
            .status,
          200,
        );
        assert.equal(
          app.db.prepare("SELECT count(*) AS count FROM enrollments").get()
            .count,
          1,
        );
        assert.equal(
          (await request("/course?userId=" + aliceId, { cookie: bob })).body
            .course,
          null,
        );
        await request("/course/enroll", { method: "POST", cookie: bob });
      },
    );
    await t.test(
      "progress persists, parts merge, and score/solved injection is rejected",
      async () => {
        const data = { chapter: 3, parts: [0, 1], answers: {} };
        assert.equal(
          (
            await request("/course/progress", {
              method: "PATCH",
              cookie: alice,
              data,
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await request("/course/progress", {
              method: "PATCH",
              cookie: alice,
              data: { ...data, score: 100, solved: ["waf"] },
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await request("/course/progress", {
              method: "PATCH",
              cookie: alice,
              data: { ...data, chapter: 99 },
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await request("/course/progress", {
              method: "PATCH",
              cookie: alice,
              data: { ...data, parts: [6] },
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await request("/course/progress", {
              method: "PATCH",
              cookie: alice,
              data: { ...data, answers: { 0: 99 } },
            })
          ).status,
          400,
        );
        await request("/course/progress", {
          method: "PATCH",
          cookie: alice,
          data: { chapter: 4, parts: [2], answers: { 0: 1 } },
        });
        const record = (await request("/course", { cookie: alice })).body
          .course;
        assert.deepEqual(record.progress.parts, [0, 1, 2]);
        assert.deepEqual(record.progress.solved, []);
        assert.equal(record.bestCorrect, 0);
        assert.equal(
          (await request("/course", { cookie: bob })).body.course.score,
          0,
        );
      },
    );
    await t.test(
      "labs require evidence and correct decisions; repeats do not inflate score",
      async () => {
        const scenario = labCases[0],
          data = {
            caseId: scenario.id,
            evidence: [],
            diagnosis: scenario.cause,
            action: scenario.fix,
          };
        assert.equal(
          (
            await request("/course/labs", {
              method: "POST",
              cookie: alice,
              data,
            })
          ).body.result.ok,
          false,
        );
        assert.equal(
          (
            await request("/course/labs", {
              method: "POST",
              cookie: alice,
              data: { ...data, evidence: [0, 0] },
            })
          ).body.result.ok,
          false,
        );
        assert.equal(
          (
            await request("/course/labs", {
              method: "POST",
              cookie: alice,
              data: {
                ...data,
                evidence: [0, 1],
                action: (scenario.fix + 1) % 3,
              },
            })
          ).body.result.ok,
          false,
        );
        assert.equal(
          (
            await request("/course/labs", {
              method: "POST",
              cookie: alice,
              data: { ...data, evidence: [0, 1] },
            })
          ).body.result.ok,
          true,
        );
        const again = await request("/course/labs", {
          method: "POST",
          cookie: alice,
          data: { ...data, evidence: [0, 1] },
        });
        assert.deepEqual(again.body.course.progress.solved, [scenario.id]);
        assert.equal(again.body.course.attempts.length, 5);
      },
    );
    await t.test(
      "assessments are graded on the server and keep the best result",
      async () => {
        assert.equal(
          (
            await request("/course/assessment", {
              method: "POST",
              cookie: alice,
              data: { score: 100 },
            })
          ).status,
          400,
        );
        const good = await request("/course/assessment", {
          method: "POST",
          cookie: alice,
          data: { answers: knowledgeCheck.map((q) => q.answer), score: 0 },
        });
        assert.equal(good.body.result.correct, 3);
        const bad = await request("/course/assessment", {
          method: "POST",
          cookie: alice,
          data: {
            answers: knowledgeCheck.map((q) => (q.answer + 1) % 3),
            score: 100,
          },
        });
        assert.equal(bad.body.result.correct, 0);
        assert.equal(bad.body.course.bestCorrect, 3);
        const report = await request("/course/report", { cookie: alice });
        assert.equal(report.body.learner.id, aliceId);
        assert.equal(report.body.simulation, true);
        assert.equal(report.body.course.attempts.length, 7);
        assert.equal(
          (await request("/course/report?userId=" + aliceId, { cookie: bob }))
            .body.course.attempts.length,
          0,
        );
      },
    );
    await t.test(
      "restart retains sessions, enrollment and learning history",
      async () => {
        await app.close();
        await start();
        assert.equal(
          (await request("/session", { cookie: alice })).body.user.id,
          aliceId,
        );
        assert.equal(
          (await request("/course", { cookie: alice })).body.course.bestCorrect,
          3,
        );
        assert.equal(
          app.db.prepare("SELECT count(*) AS count FROM migrations").get()
            .count,
          1,
        );
      },
    );
    await t.test(
      "password changes revoke all old sessions and logout revokes the new session",
      async () => {
        assert.equal(
          (
            await request("/auth/password", {
              method: "POST",
              cookie: alice,
              data: { currentPassword: "wrong", password: password + "new" },
            })
          ).status,
          400,
        );
        const changed = await request("/auth/password", {
          method: "POST",
          cookie: alice,
          data: { currentPassword: password, password: password + "new" },
        });
        assert.equal(changed.status, 200);
        assert.equal((await request("/course", { cookie: alice })).status, 401);
        alice = changed.cookie;
        assert.equal((await request("/course", { cookie: alice })).status, 200);
        await request("/auth/logout", { method: "POST", cookie: alice });
        assert.equal((await request("/course", { cookie: alice })).status, 401);
        const login = await request("/auth/login", {
          method: "POST",
          data: { email: "alice@example.com", password: password + "new" },
        });
        assert.equal(login.status, 200);
        app.db
          .prepare("UPDATE sessions SET expires_at=0 WHERE user_id=?")
          .run(aliceId);
        assert.equal(
          (await request("/course", { cookie: login.cookie })).status,
          401,
        );
      },
    );
    await t.test(
      "rate limits persist and fail closed on repeated login attempts",
      async () => {
        let result;
        for (let i = 0; i < 14; i++)
          result = await request("/auth/login", {
            method: "POST",
            data: { email: "limit@example.com", password: "incorrect" },
          });
        assert.equal(result.status, 429);
        await app.close();
        await start();
        assert.equal(
          (
            await request("/auth/login", {
              method: "POST",
              data: { email: "limit@example.com", password: "incorrect" },
            })
          ).status,
          429,
        );
      },
    );
    await t.test(
      "production requires HTTPS and secure cookies; registration can be closed",
      async () => {
        await assert.rejects(
          createApplication({ ...options, production: true }),
          /HTTPS/,
        );
        const prod = await createApplication({
          ...options,
          production: true,
          origin: "https://academy.example.com",
          registration: false,
        });
        await new Promise((resolve) =>
          prod.server.listen(0, "127.0.0.1", resolve),
        );
        try {
          const response = await fetch(
            `http://127.0.0.1:${prod.server.address().port}/api/auth/login`,
            {
              method: "POST",
              headers: {
                Origin: "https://academy.example.com",
                "Content-Type": "application/json",
                "X-Soovers-Request": "1",
              },
              body: JSON.stringify({ email: "bob@example.com", password }),
            },
          );
          assert.equal(response.status, 200);
          assert.match(
            response.headers.get("set-cookie"),
            /^__Host-soovers=.*; Secure$/,
          );
          assert.equal(response.headers.get("x-frame-options"), "DENY");
          const closed = await fetch(
            `http://127.0.0.1:${prod.server.address().port}/api/auth/register`,
            {
              method: "POST",
              headers: {
                Origin: "https://academy.example.com",
                "Content-Type": "application/json",
                "X-Soovers-Request": "1",
              },
              body: JSON.stringify({
                email: "closed@example.com",
                password,
                name: "Closed",
              }),
            },
          );
          assert.equal(closed.status, 403);
        } finally {
          await prod.close();
        }
      },
    );
  } finally {
    if (app.server.listening) await app.close();
    await rm(directory, { recursive: true, force: true });
  }
});
