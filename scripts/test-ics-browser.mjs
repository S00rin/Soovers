import { chromium, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
import { createApplication } from "../server/app.mjs";
const dir = await mkdtemp(path.join(tmpdir(), "soovers-ics-browser-")),
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
  errors = [];
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
  const apiRequests = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/")) apiRequests.push(r.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.url().startsWith(demo) && r.status() >= 400)
      errors.push(r.status() + " " + r.url());
  });
  const nav = async (name) =>
    page
      .getByRole("navigation", { name: "بخش‌های آکادمی صنعتی" })
      .getByRole("button", { name, exact: true })
      .click();
  const setSlider = async (name, value) =>
    page.getByRole("slider", { name }).evaluate((e, value) => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      ).set.call(e, String(value));
      e.dispatchEvent(new Event("input", { bubbles: true }));
      e.dispatchEvent(new Event("change", { bubbles: true }));
    }, value);
  await page.goto(demo);
  await expect(
    page.getByRole("heading", { name: "سیستم را بفهم. بعد تحلیل کن." }),
  ).toBeVisible();
  await expect(page.locator(".ics-lesson-link")).toHaveCount(10);
  await page.screenshot({
    path: path.join(out, "01-home.png"),
    fullPage: true,
  });
  pass("Account-free ICS home exposes all ten lessons without placement");
  await nav("درس‌ها");
  await page
    .getByRole("navigation", { name: "فهرست درس‌ها" })
    .getByRole("button", { name: /از مشاهده تا برنامه/ })
    .click();
  await page
    .getByRole("button", { name: "این درس را خواندم", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "مطالعه ثبت شد", exact: true }),
  ).toBeDisabled();
  assert.deepEqual(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("soovers-ics-foundations-v1")).results,
    ),
    {},
  );
  pass("Last lesson is accessible and completion works with no assessment");
  await page
    .getByRole("navigation", { name: "فهرست درس‌ها" })
    .getByRole("button", { name: /معنای جریان/ })
    .click();
  await page.getByRole("button", { name: "۲٫۸ متر", exact: true }).click();
  await expect(page.locator(".ics-answer")).toContainText("یک بار دیگر");
  await page.getByRole("button", { name: "۲٫۵ متر", exact: true }).click();
  await expect(page.locator(".ics-answer")).toContainText("درست است");
  await page.locator(".ics-reading summary").first().click();
  await expect(page.locator(".ics-reading details[open]")).toContainText(
    "physical",
  );
  pass("Optional knowledge check gives feedback and source reading opens");
  await nav("مخزن و کنترل");
  await page.getByLabel("سناریو", { exact: true }).selectOption("sensor");
  await page
    .getByRole("button", { name: "اجرای شبیه‌سازی", exact: true })
    .click();
  await expect(
    page.locator(".ics-readouts").getByText("۱٬۲۰۰ s", { exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await expect(page.locator(".ics-readouts")).toContainText("۳٫۸۰ m");
  await expect(page.locator(".ics-readouts")).toContainText("۰ s");
  let download = page.waitForEvent("download");
  await page.getByRole("button", { name: /دریافت دادهٔ شبیه/ }).click();
  let downloaded = await download;
  await downloaded.saveAs(path.join(out, "tank.csv"));
  assert.equal(
    (await readFile(path.join(out, "tank.csv"), "utf8")).trim().split("\n")
      .length,
    1202,
  );
  await page.screenshot({
    path: path.join(out, "02-tank.png"),
    fullPage: true,
  });
  pass(
    "Frozen sensor separates physical state and fresh wrong display; exports 1201 data rows",
  );
  await page.getByLabel("سناریو", { exact: true }).selectOption("hmi");
  await page
    .getByRole("button", { name: "اجرای شبیه‌سازی", exact: true })
    .click();
  await expect(
    page.locator(".ics-readouts").getByText("۹۰۰ s", { exact: true }),
  ).toBeVisible({ timeout: 20000 });
  pass("Stale HMI preserves old samples while sample age grows");
  await nav("سیگنال و رنج");
  await setSlider(/جریان ورودی/, 14);
  await expect(page.getByTestId("scaling-result")).toContainText("۲٫۵۰");
  await setSlider(/جریان ورودی/, 0);
  await expect(page.getByTestId("scaling-result")).toContainText(
    "خارج از بازه",
  );
  await expect(page.getByTestId("mismatch-result")).toContainText("۱٫۰۰");
  await setSlider(/حد بالای PLC/, 8);
  await expect(page.getByTestId("mismatch-result")).toContainText("۲٫۰۰");
  await setSlider(/مقاومت کل مسیر/, 700);
  await expect(page.getByTestId("loop-result")).toContainText("کافی نیست");
  pass(
    "Signal scaling, invalid input, range correction and insufficient loop budget respond correctly",
  );
  await nav("میز شواهد");
  await page
    .getByRole("button", { name: "تفسیر و محدودیت شاهد" })
    .first()
    .click();
  await expect(
    page.getByText(
      "توافق این دو مستقل نیست؛ هر دو یک تبدیل PLC را مصرف می‌کنند.",
    ),
  ).toBeVisible();
  await page
    .getByLabel("یادداشت پرونده")
    .fill("مالک شواهد: مهندسی؛ زمان تغییر رنج هنوز نامعلوم است.");
  await page
    .getByRole("button", { name: "ذخیرهٔ یادداشت", exact: true })
    .click();
  await page.reload();
  await nav("میز شواهد");
  await expect(page.getByLabel("یادداشت پرونده")).toHaveValue(
    "مالک شواهد: مهندسی؛ زمان تغییر رنج هنوز نامعلوم است.",
  );
  download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "گزارش یادگیری", exact: true })
    .click();
  downloaded = await download;
  await downloaded.saveAs(path.join(out, "learning.json"));
  const report = JSON.parse(await readFile(path.join(out, "learning.json")));
  assert.equal(report.results.scaling.correct, true);
  assert.deepEqual(report.progress.completed, ["evidence"]);
  pass(
    "Evidence notebook and optional answers persist; exported report matches actual progress",
  );
  await nav("اطلس تجهیزات");
  await expect(page.locator(".ics-device-list button")).toHaveCount(12);
  await page.getByLabel("جست‌وجوی تجهیزات").fill("DVC6200");
  await expect(page.locator(".ics-device-list button")).toHaveCount(1);
  await page.locator(".ics-device-list button").click();
  await expect(page.locator(".ics-device-detail")).toContainText("پوزیشنر");
  await page.screenshot({
    path: path.join(out, "03-atlas.png"),
    fullPage: true,
  });
  await nav("واژه‌نامه");
  await expect(page.locator(".ics-glossary>div")).toHaveCount(102);
  await page.getByLabel("جست‌وجوی واژه‌نامه").fill("Calibration");
  await expect(page.locator(".ics-glossary>div")).toHaveCount(1);
  pass(
    "All twelve equipment profiles and 102 source glossary entries are searchable",
  );
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    for (const tab of [
      "آکادمی",
      "درس‌ها",
      "مخزن و کنترل",
      "سیگنال و رنج",
      "میز شواهد",
      "اطلس تجهیزات",
      "واژه‌نامه",
      "مسیر دوره",
      "منابع",
    ]) {
      await nav(tab);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
        `${tab} overflows ${viewport.width}`,
      );
    }
    await nav("آکادمی");
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await page.screenshot({
      path: path.join(out, `04-mobile-${viewport.width}.png`),
      fullPage: true,
    });
  }
  pass("Every ICS view fits mobile portrait and landscape");
  assert.deepEqual(apiRequests, []);
  assert.deepEqual(errors, []);
  pass(
    "Static demo makes no account API requests and has no missing assets/runtime errors",
  );
  const privatePage = await browser.newPage();
  await privatePage.addInitScript(() => {
    Storage.prototype.getItem = function () {
      throw Error("blocked");
    };
    Storage.prototype.setItem = function () {
      throw Error("blocked");
    };
  });
  await privatePage.goto(demo);
  await expect(
    privatePage.getByRole("heading", { name: "سیستم را بفهم. بعد تحلیل کن." }),
  ).toBeVisible();
  await privatePage
    .getByRole("button", { name: "شروع یادگیری", exact: true })
    .click();
  await expect(privatePage.locator(".ics-lesson")).toBeVisible();
  await privatePage.close();
  pass("Unavailable browser storage does not prevent learning");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(product);
  await page.getByLabel("نام شما", { exact: true }).fill("دانشجوی صنعتی");
  await page
    .getByLabel("ایمیل", { exact: true })
    .fill("ics-browser@example.com");
  await page
    .getByLabel("گذرواژه", { exact: true })
    .fill("industrial browser testing");
  await page.getByRole("button", { name: "ساخت حساب و شروع یادگیری" }).click();
  await page.getByRole("link", { name: "شروع آکادمی صنعتی" }).click();
  await expect(
    page.getByRole("heading", { name: "سیستم را بفهم. بعد تحلیل کن." }),
  ).toBeVisible();
  await nav("درس‌ها");
  await page
    .getByRole("button", { name: "این درس را خواندم", exact: true })
    .click();
  await expect(page.locator(".ics-sidebar-progress")).toContainText(
    "در حساب شما ذخیره شد",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/ics/progress", (r) => r.abort());
  await page.getByRole("button", { name: "درس بعد", exact: true }).click();
  await expect(
    page
      .locator(".ics-mobile-progress")
      .getByRole("button", { name: "تلاش دوباره برای ذخیره" }),
  ).toBeVisible();
  await page.unroute("**/api/ics/progress");
  await page
    .locator(".ics-mobile-progress")
    .getByRole("button", { name: "تلاش دوباره برای ذخیره" })
    .click();
  await expect(page.locator(".ics-mobile-progress")).toContainText(
    "در حساب شما ذخیره شد",
  );
  await page.reload();
  await nav("درس‌ها");
  await expect(page.locator(".ics-lesson>h2")).toHaveText("از حسگر تا عملگر");
  pass(
    "Authenticated progress saves without F5 enrollment, retries on mobile and restores after reload",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("link", { name: "حساب من", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "دانشجوی صنعتی، آمادهٔ قدم بعدی؟" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "ثبت‌نام و شروع دوره", exact: true })
    .click();
  await expect(page.locator(".academy-chapters button")).toHaveCount(6);
  pass("Existing F5 course remains available alongside the ICS academy");
  assert.deepEqual(errors, []);
  await writeFile(
    path.join(out, "results.json"),
    JSON.stringify({ results, errors }, null, 2),
  );
  console.log(`${results.length} ICS browser scenarios passed.`);
} catch (e) {
  await page
    ?.screenshot({ path: path.join(out, "failure.png"), fullPage: true })
    .catch(() => {});
  throw e;
} finally {
  await browser?.close();
  server.kill();
  await app.close();
  await rm(dir, { recursive: true, force: true });
}
