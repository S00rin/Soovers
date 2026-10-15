import { chromium, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
import { createApplication } from "../server/app.mjs";
import { lessons } from "../lib/ics/content.ts";
const dir = await mkdtemp(path.join(tmpdir(), "soovers-reader-")),
  out = path.resolve("test-results/ics");
await mkdir(out, { recursive: true });
const demo = "http://127.0.0.1:8096",
  product = "http://127.0.0.1:8097";
const server = spawn(
  process.execPath,
  ["scripts/serve.mjs", "--root", "demo-dist", "--port", "8096"],
  { stdio: "pipe" },
);
const app = await createApplication({
  database: path.join(dir, "ics.sqlite"),
  root: path.resolve("local-dist"),
  origin: product,
});
await new Promise((r) => app.server.listen(8097, "127.0.0.1", r));
let browser, page;
const results = [],
  errors = [],
  apiRequests = [];
const pass = (name) => {
  results.push(name);
  console.log("PASS", name);
};
try {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(demo + "/healthz")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    headless: true,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.url().startsWith(demo) && r.status() >= 400)
      errors.push(r.status() + " " + r.url());
  });
  page.on("request", (r) => {
    if (r.url().includes("/api/")) apiRequests.push(r.url());
  });
  const click = async (name) =>
    page.getByRole("button", { name, exact: true }).click();
  const open = async (id) => {
    await page.evaluate((id) => {
      location.hash = "#ics/lesson/" + id;
    }, id);
    await expect(page.locator(".course-lesson-heading h1")).toHaveText(
      lessons.find((l) => l.id === id).title,
    );
  };
  const overflow = async () =>
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
    );
  const slider = async (name, value) =>
    page.getByRole("slider", { name }).evaluate((e, v) => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      ).set.call(e, String(v));
      e.dispatchEvent(new Event("input", { bubbles: true }));
      e.dispatchEvent(new Event("change", { bubbles: true }));
    }, value);
  await page.goto(demo);
  await expect(page.locator(".course-cover h1")).toContainText("قدم‌به‌قدم");
  await expect(
    page.locator(".course-sidebar .course-outline details"),
  ).toHaveCount(34);
  await page.screenshot({
    path: path.join(out, "01-home.png"),
    fullPage: true,
  });
  await click("شروع یادگیری");
  await expect(page).toHaveURL(/#ics\/lesson\/process$/);
  await expect(page.locator("#lesson-practice .ics-lab")).toBeVisible();
  pass(
    "One clear course entry opens reading and its experiment on the same page",
  );
  await page
    .getByLabel("یادداشت این درس", { exact: true })
    .fill("ورودی و خروجی برابر؛ سطح ثابت می‌ماند.");
  await click("خواندم؛ ادامهٔ مسیر");
  await expect(page).toHaveURL(/\/chain$/);
  await page.goBack();
  await expect(page.locator(".course-lesson-heading h1")).toHaveText(
    lessons[0].title,
  );
  await expect(page.getByLabel("یادداشت این درس", { exact: true })).toHaveValue(
    "ورودی و خروجی برابر؛ سطح ثابت می‌ماند.",
  );
  await page.reload();
  await expect(page.getByLabel("یادداشت این درس", { exact: true })).toHaveValue(
    "ورودی و خروجی برابر؛ سطح ثابت می‌ماند.",
  );
  assert.equal(
    await page.evaluate(() =>
      JSON.parse(
        localStorage.getItem("soovers-ics-foundations-v1"),
      ).progress.completed.includes("process"),
    ),
    true,
  );
  pass(
    "Read-and-continue, browser Back, deep links and workbook autosave preserve the learning context",
  );
  await page
    .getByRole("button", { name: "واژه‌نامه کنار درس", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "کتابخانه کنار درس" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".ics-glossary>div")).toHaveCount(102);
  await page.getByLabel("جست‌وجوی واژه‌نامه").fill("Calibration");
  await expect(dialog.locator(".ics-glossary>div")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "واژه‌نامه کنار درس", exact: true }),
  ).toBeFocused();
  await click("متن عمیق همین موضوع از کتاب دانشجو");
  await dialog.locator(".ics-reading summary").first().click();
  await expect(dialog.locator(".ics-book-text").first()).toBeVisible();
  await page.keyboard.press("Escape");
  pass(
    "Contextual glossary and original reading return focus to the same lesson",
  );
  await open("chain");
  await click("بازکردن اطلس کنار درس");
  await expect(dialog.locator(".ics-device-list button")).toHaveCount(12);
  await page.getByLabel("جست‌وجوی تجهیزات").fill("DVC6200");
  await dialog.locator(".ics-device-list button").click();
  await expect(dialog.locator(".ics-device-detail")).toContainText("پوزیشنر");
  await page.keyboard.press("Escape");
  pass("Equipment exploration stays in a dismissible companion panel");
  const drawn = lessons.find((l) => l.chapter === 3);
  await open(drawn.id);
  await expect(page.locator(".course-case")).toBeVisible();
  await page
    .locator(".course-decision")
    .first()
    .getByRole("button")
    .nth((drawn.practice.steps[0].answer + 1) % 3)
    .click();
  await expect(page.locator(".course-decision").first()).toContainText(
    "دوباره بررسی",
  );
  await page
    .locator(".course-decision")
    .first()
    .getByRole("button")
    .nth(drawn.practice.steps[0].answer)
    .click();
  await expect(page.locator(".course-decision").first()).toContainText(
    "استدلال درست",
  );
  await page.getByLabel("اندازهٔ متن").selectOption("21");
  await page.screenshot({
    path: path.join(out, "02-reading.png"),
    fullPage: true,
  });
  await page.reload();
  await expect(page.getByLabel("اندازهٔ متن")).toHaveValue("21");
  pass(
    "New chapters include explanatory cases and recoverable reasoning; reading size persists",
  );
  for (const l of lessons) {
    await open(l.id);
    await expect(page.locator("#lesson-text")).toContainText(
      l.sections[0].text.slice(0, 30),
    );
    await expect(page.locator("#lesson-practice")).toBeVisible();
  }
  await open("teach-back");
  await click("خواندم؛ پایان مسیر");
  await expect(page.locator(".course-cover")).toBeVisible();
  assert.equal(
    await page.evaluate(() =>
      JSON.parse(
        localStorage.getItem("soovers-ics-foundations-v1"),
      ).progress.completed.includes("teach-back"),
    ),
    true,
  );
  assert.deepEqual(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("soovers-ics-foundations-v1")).results,
    ),
    {},
  );
  pass(
    "All 42 lessons across 34 chapters open directly; final completion requires no assessment",
  );
  await open("scaling");
  await page.locator(".course-quiz summary").click();
  await page.getByRole("button", { name: "۲٫۸ متر", exact: true }).click();
  await expect(page.locator(".course-quiz")).toContainText("یک بار دیگر");
  await page.getByRole("button", { name: "۲٫۵ متر", exact: true }).click();
  await expect(page.locator(".course-quiz")).toContainText("درست است");
  await slider(/جریان ورودی/, 0);
  await expect(page.getByTestId("scaling-result")).toContainText(
    "خارج از بازه",
  );
  await slider(/حد بالای PLC/, 8);
  await expect(page.getByTestId("mismatch-result")).toContainText("۲٫۰۰");
  pass(
    "Optional quizzes and inline signal experiment give independent feedback",
  );
  await open("truth");
  await page.getByLabel("سناریو", { exact: true }).selectOption("sensor");
  await click("اجرای شبیه‌سازی");
  await expect(page.locator(".ics-readouts")).toContainText("۳٫۸۰ m", {
    timeout: 20000,
  });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /CSV/ }).click();
  const file = await download;
  await file.saveAs(path.join(out, "tank.csv"));
  assert.equal(
    (await readFile(path.join(out, "tank.csv"), "utf8")).trim().split("\n")
      .length,
    1202,
  );
  pass(
    "The inline tank model still distinguishes frozen measurement and exports the full run",
  );
  const reportEvent = page.waitForEvent("download");
  await click("دریافت گزارش یادگیری");
  const reportFile = await reportEvent;
  await reportFile.saveAs(path.join(out, "learning.json"));
  const report = JSON.parse(
    await readFile(path.join(out, "learning.json"), "utf8"),
  );
  assert.equal(
    report.workbook.process,
    "ورودی و خروجی برابر؛ سطح ثابت می‌ماند.",
  );
  assert.equal(report.results.scaling.correct, true);
  pass(
    "Export includes actual reading progress, optional results and lesson-specific work",
  );
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    for (const id of [
      "process",
      "scaling",
      drawn.id,
      "capstone-process",
      "teach-back",
    ]) {
      await open(id);
      await overflow();
    }
    await open(drawn.id);
    await page.screenshot({
      path: path.join(out, `03-mobile-${viewport.width}.png`),
      fullPage: true,
    });
    if (viewport.width < 760) {
      await click("فهرست فصل‌ها");
      const menu = page.getByRole("dialog", { name: "فهرست فصل‌ها" });
      await expect(menu).toBeVisible();
      await menu.getByLabel("جست‌وجوی درس‌ها").fill("Modbus");
      await menu.locator("details summary").first().click();
      await expect(menu).not.toBeVisible();
      await expect(page.locator(".course-lesson-heading h1")).toContainText(
        /Modbus|مودباس/i,
      );
      await page.keyboard.press("Tab");
      await overflow();
    }
  }
  pass(
    "Reader, experiments, capstones and searchable chapter drawer fit portrait and landscape",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(demo + "/#ics/lesson/does-not-exist");
  await expect(
    page.getByRole("heading", { name: "این درس پیدا نشد" }),
  ).toBeVisible();
  await click("بازگشت به دوره");
  await expect(page.locator(".course-cover")).toBeVisible();
  assert.deepEqual(apiRequests, []);
  pass(
    "Unknown lesson links recover cleanly and static study makes no account API requests",
  );
  const blocked = await browser.newPage();
  await blocked.addInitScript(() => {
    Storage.prototype.setItem = function () {
      throw new Error("storage denied");
    };
  });
  await blocked.goto(demo + "/#ics/lesson/process");
  await blocked
    .getByLabel("یادداشت این درس", { exact: true })
    .fill("یادداشت قابل دریافت");
  await expect(
    blocked.getByRole("button", { name: "تلاش دوباره برای ذخیره" }),
  ).toBeVisible();
  const blockedDownload = blocked.waitForEvent("download");
  await blocked.getByRole("button", { name: "دریافت گزارش یادگیری" }).click();
  await (await blockedDownload).saveAs(path.join(out, "blocked-storage.json"));
  assert.equal(
    JSON.parse(await readFile(path.join(out, "blocked-storage.json"), "utf8"))
      .workbook.process,
    "یادداشت قابل دریافت",
  );
  await blocked.close();
  pass(
    "Unavailable storage preserves in-memory study and allows exporting unsaved work",
  );
  const auth = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await auth.request.post(product + "/api/auth/register", {
    headers: { Origin: product, "X-Soovers-Request": "1" },
    data: {
      name: "Industrial learner",
      email: "reader@example.com",
      password: "reader validation phrase!",
    },
  });
  await auth.goto(product + "/#ics/lesson/drawings");
  await expect(auth.locator(".course-lesson-heading")).toBeVisible();
  await auth.route("**/api/ics/workbook", (r) => r.abort());
  await auth
    .getByLabel("یادداشت این درس", { exact: true })
    .fill("ثبت رابطهٔ حلقه با فرایند");
  await expect(
    auth.getByRole("button", { name: "تلاش دوباره برای ذخیره" }),
  ).toBeVisible();
  await auth.unroute("**/api/ics/workbook");
  await auth.getByRole("button", { name: "تلاش دوباره برای ذخیره" }).click();
  await expect(auth.locator(".course-save-state")).toContainText(
    "در حساب شما ذخیره شد",
  );
  await auth.reload();
  await expect(auth.getByLabel("یادداشت این درس", { exact: true })).toHaveValue(
    "ثبت رابطهٔ حلقه با فرایند",
  );
  assert.equal(
    (await (await auth.request.get(product + "/api/course")).json()).course,
    null,
  );
  await auth.close();
  pass(
    "Authenticated deep links work without F5 enrollment; failed note saves retry on mobile and survive reload",
  );
  assert.deepEqual(errors, []);
  pass("No missing assets or browser runtime errors");
  await writeFile(
    path.join(out, "results.json"),
    JSON.stringify(
      { browser: await browser.version(), results, errors },
      null,
      2,
    ),
  );
  console.log(results.length + " ICS reader scenarios passed.");
} catch (e) {
  if (page)
    await page
      .screenshot({ path: path.join(out, "failure.png"), fullPage: true })
      .catch(() => {});
  throw e;
} finally {
  await browser?.close();
  server.kill();
  await app.close();
  await rm(dir, { recursive: true, force: true });
}
