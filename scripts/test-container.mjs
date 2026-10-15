import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const image = process.env.SOOVERS_TEST_IMAGE || "soovers-academy:1.0.0";
const name = "soovers-validation-" + randomUUID().slice(0, 8),
  volume = name + "-data";
const docker = (...args) =>
  execFileSync("docker", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
const origin = "https://academy.example.test";
let base;
async function ready() {
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(base + "/readyz")).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Container did not become ready.");
}
async function request(route, method = "GET", data = {}, cookie = "") {
  const response = await fetch(base + "/api" + route, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "X-Soovers-Request": "1",
      Cookie: cookie,
    },
    body: method === "GET" ? undefined : JSON.stringify(data),
  });
  const body = await response.json();
  assert.ok(response.ok, JSON.stringify(body));
  return { body, cookie: response.headers.get("set-cookie")?.split(";")[0] };
}
try {
  docker("volume", "create", volume);
  docker(
    "run",
    "-d",
    "--name",
    name,
    "--read-only",
    "--cap-drop=ALL",
    "--security-opt=no-new-privileges:true",
    "-p",
    "127.0.0.1::8080",
    "-e",
    "APP_ORIGIN=" + origin,
    "--mount",
    `type=volume,src=${volume},dst=/app/data`,
    image,
  );
  base = "http://" + docker("port", name, "8080/tcp");
  await ready();
  assert.equal(docker("exec", name, "id", "-u"), "1000");
  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.match(
    page.headers.get("content-security-policy"),
    /frame-ancestors 'none'/,
  );
  const account = await request("/auth/register", "POST", {
    name: "Container learner",
    email: "container@example.com",
    password: "container validation phrase!",
  });
  assert.match(account.cookie, /^__Host-soovers=/);
  await request("/course/enroll", "POST", {}, account.cookie);
  await request(
    "/course/progress",
    "PATCH",
    { chapter: 3, parts: [0, 1, 2], answers: {} },
    account.cookie,
  );
  await request(
    "/ics/progress",
    "PATCH",
    {
      expectedUserId: account.body.user.id,
      lesson: "mismatch",
      completed: ["process"],
      notes: "ICS recovery check",
    },
    account.cookie,
  );
  await request(
    "/ics/workbook",
    "PUT",
    {
      expectedUserId: account.body.user.id,
      lesson: "drawings",
      note: "Per-lesson workbook survives restart",
    },
    account.cookie,
  );
  docker("restart", name);
  base = "http://" + docker("port", name, "8080/tcp");
  await ready();
  assert.equal(
    (await request("/course", "GET", {}, account.cookie)).body.course.progress
      .chapter,
    3,
  );
  assert.equal(
    (await request("/ics", "GET", {}, account.cookie)).body.progress.notes,
    "ICS recovery check",
  );
  assert.equal(
    (await request("/ics", "GET", {}, account.cookie)).body.workbook.drawings,
    "Per-lesson workbook survives restart",
  );
  docker(
    "exec",
    name,
    "node",
    "scripts/backup.mjs",
    "/app/data/validation-backup.sqlite",
  );
  docker(
    "exec",
    "-e",
    "DATABASE_PATH=/app/data/restored/academy.sqlite",
    name,
    "node",
    "scripts/restore.mjs",
    "/app/data/validation-backup.sqlite",
  );
  const restored = docker(
    "exec",
    name,
    "node",
    "--input-type=module",
    "-e",
    "import{DatabaseSync}from'node:sqlite';const db=new DatabaseSync('/app/data/restored/academy.sqlite',{readOnly:true});if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')process.exit(1);console.log(db.prepare('SELECT chapter FROM enrollments').get().chapter);db.close();",
  );
  assert.equal(restored, "3");
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      name,
      "node",
      "scripts/admin.mjs",
      "create-user",
      "operator-test@example.com",
      "Operator-created learner",
    ],
    { input: "operator test password phrase!", encoding: "utf8" },
  );
  await request("/auth/login", "POST", {
    email: "operator-test@example.com",
    password: "operator test password phrase!",
  });
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      name,
      "node",
      "scripts/admin.mjs",
      "reset-password",
      "container@example.com",
    ],
    { input: "replacement test password phrase!", encoding: "utf8" },
  );
  const revoked = await fetch(base + "/api/course", {
    headers: { Cookie: account.cookie },
  });
  assert.equal(revoked.status, 401);
  const recovered = await request("/auth/login", "POST", {
    email: "container@example.com",
    password: "replacement test password phrase!",
  });
  assert.equal(
    (await request("/course", "GET", {}, recovered.cookie)).body.course.progress
      .chapter,
    3,
  );
  console.log(
    "PASS Docker: non-root/read-only runtime, production cookies, enrollment, progress after restart, a verified backup restored into a new database, and operator account creation/recovery.",
  );
} catch (error) {
  console.error(error.message);
  try {
    console.error(docker("logs", "--tail", "30", name));
  } catch {}
  process.exitCode = 1;
} finally {
  try {
    docker("rm", "-f", name);
  } catch {}
  try {
    docker("volume", "rm", volume);
  } catch {}
}
