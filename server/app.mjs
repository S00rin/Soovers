import http from "node:http";
import { handleIcs } from "./ics.mjs";
import path from "node:path";
import { readFile, stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { openDatabase, transaction } from "./database.mjs";
import {
  hashPassword,
  verifyPassword,
  validPassword,
  hashToken,
  createSession,
} from "./auth.mjs";
import {
  initialCourse,
  parseCourse,
  knowledgeCheck,
  labCases,
  assessLab,
} from "../lib/education/f5-course.ts";

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fail = (status, message) => {
  throw new ApiError(status, message);
};
const now = () => new Date().toISOString();
const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
});
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".md": "text/markdown; charset=utf-8",
};

export async function createApplication({
  database,
  root,
  origin,
  production = false,
  registration = true,
}) {
  const configured = new URL(origin);
  if (
    configured.origin !== origin ||
    (production && configured.protocol !== "https:")
  )
    throw new Error(
      "APP_ORIGIN must be an exact origin; production requires HTTPS.",
    );
  if (!["http:", "https:"].includes(configured.protocol))
    throw new Error("Unsupported APP_ORIGIN protocol.");
  const db = openDatabase(database);
  const dummyPassword = await hashPassword(randomUUID());
  const cookieName = production ? "__Host-soovers" : "soovers_session";
  const cookie = (token, age = 604800) =>
    `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${production ? "; Secure" : ""}`;
  const audit = (userId, action) =>
    db
      .prepare(
        "INSERT INTO audit_events(user_id,action,created_at) VALUES (?,?,?)",
      )
      .run(userId, action, now());
  function throttle(key, limit, interval) {
    const time = Date.now();
    db.prepare("DELETE FROM rate_limits WHERE expires_at <= ?").run(time);
    db.prepare(
      "INSERT INTO rate_limits VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1",
    ).run(key, time + interval);
    if (
      db.prepare("SELECT count FROM rate_limits WHERE key=?").get(key).count >
      limit
    )
      fail(429, "تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.");
  }
  function course(userId) {
    const row = db
      .prepare("SELECT * FROM enrollments WHERE user_id=?")
      .get(userId);
    if (!row) return null;
    const progress = {
      chapter: row.chapter,
      parts: JSON.parse(row.parts),
      solved: JSON.parse(row.solved),
      answers: JSON.parse(row.answers),
    };
    return {
      id: row.course_id,
      progress,
      score: Math.round(
        ((progress.parts.length +
          progress.solved.length * 3 +
          row.best_correct * 2) /
          21) *
          100,
      ),
      bestCorrect: row.best_correct,
      enrolledAt: row.enrolled_at,
      updatedAt: row.updated_at,
      attempts: db
        .prepare(
          "SELECT id,kind,case_id AS caseId,correct,total,created_at AS createdAt FROM attempts WHERE user_id=? ORDER BY created_at DESC LIMIT 50",
        )
        .all(userId),
    };
  }
  async function body(req) {
    if (
      req.headers["content-type"]?.split(";")[0].trim() !== "application/json"
    )
      fail(415, "درخواست باید JSON باشد.");
    if (Number(req.headers["content-length"]) > 16384)
      fail(413, "درخواست بیش از حد بزرگ است.");
    let size = 0;
    const chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 16384) fail(413, "درخواست بیش از حد بزرگ است.");
      chunks.push(chunk);
    }
    try {
      const value = JSON.parse(Buffer.concat(chunks).toString());
      if (!value || Array.isArray(value) || typeof value !== "object")
        throw new Error();
      return value;
    } catch {
      fail(400, "دادهٔ درخواست معتبر نیست.");
    }
  }
  const server = http.createServer(async (req, res) => {
    const requestId = randomUUID();
    const headers = {
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
      "X-Frame-Options": "DENY",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
      "Cache-Control": "no-store",
      "X-Request-Id": requestId,
      ...(production
        ? { "Strict-Transport-Security": "max-age=31536000" }
        : {}),
    };
    const send = (status, data, extra = {}) => {
      res.writeHead(status, { ...headers, ...extra });
      res.end(req.method === "HEAD" ? undefined : data);
    };
    const json = (status, data, extra = {}) =>
      send(status, JSON.stringify(data), {
        "Content-Type": "application/json; charset=utf-8",
        ...extra,
      });
    try {
      const pathname = decodeURIComponent(new URL(req.url, origin).pathname);
      if (
        (pathname === "/healthz" || pathname === "/readyz") &&
        ["GET", "HEAD"].includes(req.method)
      ) {
        db.prepare("SELECT 1").get();
        return json(200, { status: "ok", app: "SooVers", version: "1.0.0" });
      }
      if (!pathname.startsWith("/api/")) {
        if (!["GET", "HEAD"].includes(req.method))
          return send(405, "Method not allowed", { Allow: "GET, HEAD" });
        if (
          pathname
            .split("/")
            .some((part) => part.startsWith(".") || part.includes("\\")) ||
          pathname.includes("\0")
        )
          fail(404, "Not found");
        const file = path.resolve(
          root,
          "." + (pathname === "/" ? "/index.html" : pathname),
        );
        if (!file.startsWith(path.resolve(root) + path.sep))
          fail(404, "Not found");
        let data;
        try {
          data = await readFile(file);
        } catch {
          fail(404, "Not found");
        }
        return send(200, data, {
          "Content-Type":
            mime[path.extname(file)] || "application/octet-stream",
          "Cache-Control": pathname.startsWith("/assets/")
            ? "public, max-age=31536000, immutable"
            : "no-cache",
        });
      }
      // All writes require the exact browser origin and a non-simple request header.
      if (
        !["GET", "HEAD"].includes(req.method) &&
        (req.headers.origin !== origin ||
          req.headers["x-soovers-request"] !== "1")
      )
        fail(403, "مبدأ درخواست معتبر نیست.");
      if (req.headers["sec-fetch-site"] === "cross-site")
        fail(403, "مبدأ درخواست معتبر نیست.");
      const method = req.method;
      const route = `${method} ${pathname}`;
      const token =
        req.headers.cookie
          ?.split(";")
          .map((value) => value.trim())
          .find((value) => value.startsWith(cookieName + "="))
          ?.slice(cookieName.length + 1) || "";
      const user = token
        ? db
            .prepare(
              "SELECT users.* FROM users JOIN sessions ON users.id=sessions.user_id WHERE token_hash=? AND expires_at>?",
            )
            .get(hashToken(token), Date.now())
        : null;
      if (route === "GET /api/session")
        return json(200, {
          user: user ? publicUser(user) : null,
          registration,
        });
      if (
        route === "POST /api/auth/register" ||
        route === "POST /api/auth/login"
      ) {
        const input = await body(req);
        const email =
          typeof input.email === "string"
            ? input.email.trim().toLowerCase()
            : "";
        const password = input.password;
        throttle(
          "auth-ip:" + hashToken(req.socket.remoteAddress || ""),
          40,
          15 * 60000,
        );
        if (
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
          email.length > 254 ||
          typeof password !== "string" ||
          password.length > 128
        )
          fail(400, "ایمیل یا گذرواژه معتبر نیست.");
        throttle("auth-email:" + hashToken(email), 12, 15 * 60000);
        if (route.endsWith("register")) {
          if (!registration)
            fail(403, "ثبت‌نام جدید بسته است. با مدیر سامانه تماس بگیرید.");
          if (!validPassword(password))
            fail(400, "گذرواژه باید بین ۱۲ و ۱۲۸ نویسه باشد.");
          const name = typeof input.name === "string" ? input.name.trim() : "";
          if (name.length < 2 || name.length > 80)
            fail(400, "نام باید بین ۲ و ۸۰ نویسه باشد.");
          const passwordHash = await hashPassword(password);
          const newUser = { id: randomUUID(), email, name };
          const session = transaction(db, () => {
            if (db.prepare("SELECT id FROM users WHERE email=?").get(email))
              fail(
                409,
                "ثبت‌نام انجام نشد؛ ورود یا تماس با مدیر سامانه را امتحان کنید.",
              );
            db.prepare("INSERT INTO users VALUES (?,?,?,?,?)").run(
              newUser.id,
              email,
              name,
              passwordHash,
              now(),
            );
            audit(newUser.id, "account.created");
            return createSession(db, newUser.id);
          });
          return json(
            201,
            { user: newUser },
            { "Set-Cookie": cookie(session) },
          );
        }
        const account = db
          .prepare("SELECT * FROM users WHERE email=?")
          .get(email);
        const valid = await verifyPassword(
          password,
          account?.password_hash || dummyPassword,
        );
        if (!account || !valid) fail(401, "ایمیل یا گذرواژه نادرست است.");
        const session = transaction(db, () => {
          if (token)
            db.prepare("DELETE FROM sessions WHERE token_hash=?").run(
              hashToken(token),
            );
          audit(account.id, "account.login");
          return createSession(db, account.id);
        });
        return json(
          200,
          { user: publicUser(account) },
          { "Set-Cookie": cookie(session) },
        );
      }
      if (!user) fail(401, "برای ادامه وارد حساب خود شوید.");
      throttle("user:" + user.id, 240, 60000);
      if (route === "POST /api/auth/logout") {
        await body(req);
        db.prepare("DELETE FROM sessions WHERE token_hash=?").run(
          hashToken(token),
        );
        return json(200, { ok: true }, { "Set-Cookie": cookie("", 0) });
      }
      if (route === "POST /api/auth/password") {
        const input = await body(req);
        throttle("password:" + user.id, 8, 15 * 60000);
        if (
          !validPassword(input.password) ||
          typeof input.currentPassword !== "string" ||
          input.currentPassword.length > 128
        )
          fail(400, "گذرواژهٔ جدید باید بین ۱۲ و ۱۲۸ نویسه باشد.");
        if (!(await verifyPassword(input.currentPassword, user.password_hash)))
          fail(400, "گذرواژهٔ فعلی نادرست است.");
        const encoded = await hashPassword(input.password);
        const session = transaction(db, () => {
          db.prepare("UPDATE users SET password_hash=? WHERE id=?").run(
            encoded,
            user.id,
          );
          db.prepare("DELETE FROM sessions WHERE user_id=?").run(user.id);
          audit(user.id, "account.password_changed");
          return createSession(db, user.id);
        });
        return json(200, { ok: true }, { "Set-Cookie": cookie(session) });
      }
      if (await handleIcs({route,db,user,req,body,json,fail})) return;
      if (route === "GET /api/course")
        return json(200, { course: course(user.id) });
      if (route === "POST /api/course/enroll") {
        await body(req);
        transaction(db, () => {
          const result = db
            .prepare(
              "INSERT OR IGNORE INTO enrollments(user_id,enrolled_at,updated_at) VALUES (?,?,?)",
            )
            .run(user.id, now(), now());
          if (result.changes) audit(user.id, "course.enrolled");
        });
        return json(200, { course: course(user.id) });
      }
      const current = course(user.id);
      if (!current) fail(403, "ابتدا در دوره ثبت‌نام کنید.");
      if (route === "PATCH /api/course/progress") {
        const input = await body(req);
        if (
          Object.keys(input).some(
            (key) => !["chapter", "parts", "answers"].includes(key),
          )
        )
          fail(400, "فیلد پیشرفت معتبر نیست.");
        const clean = parseCourse(
          JSON.stringify({ ...initialCourse(), ...input }),
        );
        if (
          JSON.stringify(input.chapter) !== JSON.stringify(clean.chapter) ||
          !Array.isArray(input.parts) ||
          !input.answers ||
          Array.isArray(input.answers) ||
          typeof input.answers !== "object" ||
          JSON.stringify(input.parts) !== JSON.stringify(clean.parts) ||
          JSON.stringify(input.answers) !== JSON.stringify(clean.answers)
        )
          fail(400, "پیشرفت معتبر نیست.");
        transaction(db, () => {
          const latest = course(user.id);
          const parts = [
            ...new Set([...latest.progress.parts, ...clean.parts]),
          ];
          db.prepare(
            "UPDATE enrollments SET chapter=?,parts=?,answers=?,updated_at=? WHERE user_id=?",
          ).run(
            clean.chapter,
            JSON.stringify(parts),
            JSON.stringify(clean.answers),
            now(),
            user.id,
          );
        });
        return json(200, { course: course(user.id) });
      }
      if (route === "POST /api/course/labs") {
        const input = await body(req);
        const scenario = labCases.find((item) => item.id === input.caseId);
        if (
          !scenario ||
          !Array.isArray(input.evidence) ||
          input.evidence.length > 3 ||
          !input.evidence.every(
            (n) =>
              Number.isInteger(n) && n >= 0 && n < scenario.evidence.length,
          ) ||
          !Number.isInteger(input.diagnosis) ||
          !Number.isInteger(input.action) ||
          input.diagnosis < 0 ||
          input.diagnosis >= scenario.diagnoses.length ||
          input.action < 0 ||
          input.action >= scenario.actions.length
        )
          fail(400, "تصمیم پرونده معتبر نیست.");
        const result = assessLab(
          scenario,
          input.evidence,
          input.diagnosis,
          input.action,
        );
        transaction(db, () => {
          db.prepare("INSERT INTO attempts VALUES (?,?,?,?,?,?,?,?)").run(
            randomUUID(),
            user.id,
            "lab",
            scenario.id,
            JSON.stringify(input),
            result.ok ? 1 : 0,
            1,
            now(),
          );
          if (result.ok) {
            const solved = [
              ...new Set([...course(user.id).progress.solved, scenario.id]),
            ];
            db.prepare(
              "UPDATE enrollments SET solved=?,updated_at=? WHERE user_id=?",
            ).run(JSON.stringify(solved), now(), user.id);
          }
          audit(user.id, "lab.submitted");
        });
        return json(200, { result, course: course(user.id) });
      }
      if (route === "POST /api/course/assessment") {
        const { answers } = await body(req);
        if (
          !Array.isArray(answers) ||
          answers.length !== knowledgeCheck.length ||
          !answers.every(
            (n, i) =>
              Number.isInteger(n) &&
              n >= 0 &&
              n < knowledgeCheck[i].options.length,
          )
        )
          fail(400, "به هر سه سؤال پاسخ دهید.");
        const correct = knowledgeCheck.filter(
          (question, i) => answers[i] === question.answer,
        ).length;
        transaction(db, () => {
          db.prepare("INSERT INTO attempts VALUES (?,?,?,?,?,?,?,?)").run(
            randomUUID(),
            user.id,
            "assessment",
            null,
            JSON.stringify(answers),
            correct,
            knowledgeCheck.length,
            now(),
          );
          db.prepare(
            "UPDATE enrollments SET best_correct=MAX(best_correct,?),answers=?,updated_at=? WHERE user_id=?",
          ).run(
            correct,
            JSON.stringify(
              Object.fromEntries(answers.map((answer, i) => [i, answer])),
            ),
            now(),
            user.id,
          );
          audit(user.id, "assessment.submitted");
        });
        return json(200, {
          result: { correct, total: knowledgeCheck.length },
          course: course(user.id),
        });
      }
      if (route === "GET /api/course/report")
        return json(
          200,
          {
            learner: publicUser(user),
            course: current,
            simulation: true,
            credential:
              "SooVers formative learning record; not F5 certification",
            exportedAt: now(),
            version: "1.0.0",
          },
          {
            "Content-Disposition":
              'attachment; filename="SooVers-F5-Learning-Report.json"',
          },
        );
      fail(404, "مسیر پیدا نشد.");
    } catch (error) {
      const status =
        error instanceof ApiError
          ? error.status
          : error instanceof URIError
            ? 400
            : 500;
      if (status === 500)
        console.error(
          JSON.stringify({
            requestId,
            event: "request.failed",
            type: error.name,
          }),
        );
      if (!res.headersSent)
        json(
          status,
          {
            error:
              status === 500 ? "خطای سامانه؛ دوباره تلاش کنید." : error.message,
            requestId,
          },
          status === 429 ? { "Retry-After": "900" } : {},
        );
      else res.end();
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return {
    server,
    db,
    close: () =>
      new Promise((resolve) => {
        server.close(() => {
          db.close();
          resolve();
        });
        server.closeIdleConnections();
      }),
  };
}
