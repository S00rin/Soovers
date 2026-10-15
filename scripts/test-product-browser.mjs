import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createApplication } from "../server/app.mjs";
import { labCases, knowledgeCheck } from "../lib/education/f5-course.ts";
const output = path.resolve("test-results/product");
await mkdir(output, { recursive: true });
const directory = await mkdtemp(path.join(tmpdir(), "soovers-browser-"));
const base = "http://127.0.0.1:8095";
const app = await createApplication({
  database: path.join(directory, "academy.sqlite"),
  root: path.resolve("local-dist"),
  origin: base,
});
await new Promise((resolve) => app.server.listen(8095, "127.0.0.1", resolve));
let browser, page;
const results = [],
  errors = [];
const record = (name) => {
  results.push(name);
  console.log("PASS", name);
};
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    headless: true,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  page = await browser.newPage({
    viewport: { width: 1440, height: 1080 },
    reducedMotion: "reduce",
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base);
  await expect(
    page.getByRole("heading", { name: "مسیرت را شروع کن." }),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(output, "01-welcome.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: path.join(output, "02-welcome-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1080 });
  record("Persian RTL onboarding renders on desktop and mobile");
  const email = "learner@example.com",
    password = "a secure learning phrase!";
  await page.getByLabel("نام شما", { exact: true }).fill("دانشجوی سورین");
  await page.getByLabel("ایمیل", { exact: true }).fill(email);
  await page.getByLabel("گذرواژه", { exact: true }).fill(password);
  await page.getByRole("button", { name: "ساخت حساب و شروع یادگیری" }).click();
  await expect(
    page.getByRole("heading", { name: "دانشجوی سورین، آمادهٔ قدم بعدی؟" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "ثبت‌نام و شروع دوره", exact: true })
    .click();
  await expect(page.locator(".academy-chapters button")).toHaveCount(6);
  await expect(page.locator(".f5-render canvas")).toBeVisible();
  for (let i = 0; i < 6; i++)
    await page.locator(".academy-parts button").nth(i).click();
  await expect(page.locator(".product-sync-button")).toHaveText(
    "همگام با حساب شما",
  );
  record("Registration, enrollment and authenticated 3D learning");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/course/progress", (route) => route.abort());
  await page.locator(".academy-chapters button").nth(2).click();
  await expect(page.locator(".product-sync-button")).toHaveText(
    "ذخیره نشد؛ تلاش دوباره",
  );
  await page.unroute("**/api/course/progress");
  await expect(page.locator(".academy-mobile-sync")).toBeVisible();
  await page.locator(".academy-mobile-sync").click();
  await expect(page.locator(".product-sync-button")).toHaveText(
    "همگام با حساب شما",
  );
  await page.setViewportSize({ width: 1440, height: 1080 });
  record(
    "Failed autosave is visible on mobile and retry persists the pending change",
  );
  await page.locator(".academy-chapters button").nth(4).click();
  for (let i = 0; i < labCases.length; i++) {
    const scenario = labCases[i];
    await page.locator(".lab-selector>button").nth(i).click();
    const choices = page.locator(".lab-decisions .academy-options");
    await choices.nth(0).getByRole("button").nth(scenario.cause).click();
    await choices.nth(1).getByRole("button").nth(scenario.fix).click();
    await page
      .getByRole("button", { name: "اعمال تصمیم در شبیه‌سازی", exact: true })
      .click();
    await expect(page.locator(".lab-feedback")).toContainText("دو شاهد");
    await page.locator(".evidence-commands button").nth(0).click();
    await page.locator(".evidence-commands button").nth(1).click();
    await page
      .getByRole("button", { name: "اعمال تصمیم در شبیه‌سازی", exact: true })
      .click();
    await expect(page.locator(".lab-feedback")).toHaveClass(/success/);
    await expect(page.locator(".product-sync-button")).toHaveText(
      "همگام با حساب شما",
    );
  }
  record("All three labs are validated by the API with evidence requirements");
  await page.locator(".academy-chapters button").nth(5).click();
  for (let i = 0; i < knowledgeCheck.length; i++)
    await page
      .locator(".academy-question")
      .nth(i)
      .getByRole("button")
      .nth(knowledgeCheck[i].answer)
      .click();
  await expect(page.locator(".score-circle")).toHaveText("۷۱از ۱۰۰");
  await page
    .getByRole("button", { name: "ثبت ارزیابی و دریافت نتیجه" })
    .click();
  await expect(page.locator(".assessment-submit p")).toContainText(
    "۳ پاسخ درست",
  );
  await expect(page.locator(".score-circle")).toHaveText("۱۰۰از ۱۰۰");
  await expect(page.locator(".product-sync-button")).toHaveText(
    "همگام با حساب شما",
  );
  await page.reload();
  await expect(page.locator(".score-circle")).toHaveText("۱۰۰از ۱۰۰");
  record(
    "Assessment score changes only after server grading and survives reload",
  );
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "دریافت گزارش یادگیری", exact: true })
    .click();
  const download = await downloadPromise;
  await download.saveAs(path.join(output, "learning-report.json"));
  const report = JSON.parse(
    await readFile(path.join(output, "learning-report.json"), "utf8"),
  );
  assert.equal(report.course.score, 100);
  assert.equal(report.learner.email, email);
  assert.equal(report.course.progress.solved.length, 3);
  assert.equal(report.simulation, true);
  record("Downloaded learning report comes from the authenticated account");
  await page.getByRole("link", { name: "بازگشت به یادگیری من" }).click();
  await expect(page.locator(".learning-history li")).toHaveCount(7);
  await page.screenshot({
    path: path.join(output, "03-learning-home.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: path.join(output, "04-learning-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1080 });
  record(
    "Learner home shows course progress and seven persisted attempts without mobile overflow",
  );
  const secondContext = await browser.newContext();
  const second = await secondContext.newPage();
  await second.goto(base);
  await second
    .getByRole("button", { name: "ورود به حساب", exact: true })
    .click();
  await second.getByLabel("ایمیل", { exact: true }).fill(email);
  await second.getByLabel("گذرواژه", { exact: true }).fill(password);
  await second
    .getByRole("button", { name: "ورود به آکادمی", exact: true })
    .click();
  await expect(second.locator("#course-progress")).toHaveAttribute(
    "value",
    "100",
  );
  await secondContext.close();
  record("A separate browser session resumes the same account progress");
  await page.getByRole("link", { name: "حساب کاربری", exact: true }).click();
  await page.getByLabel("گذرواژهٔ فعلی", { exact: true }).fill(password);
  await page
    .getByLabel("گذرواژهٔ جدید", { exact: true })
    .fill(password + " new");
  await page
    .getByLabel("تکرار گذرواژهٔ جدید", { exact: true })
    .fill(password + " new");
  await page
    .getByRole("button", { name: "ذخیرهٔ گذرواژه", exact: true })
    .click();
  await expect(page.locator(".product-success")).toBeVisible();
  await page.getByRole("button", { name: "خروج از حساب", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "مسیرت را شروع کن." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "ورود به حساب", exact: true }).click();
  await page.getByLabel("ایمیل", { exact: true }).fill(email);
  await page.getByLabel("گذرواژه", { exact: true }).fill(password + " new");
  await page
    .getByRole("button", { name: "ورود به آکادمی", exact: true })
    .click();
  await expect(page.locator("#course-progress")).toHaveAttribute(
    "value",
    "100",
  );
  record("Password change, logout and sign-in preserve learning records");
  // A delayed response for the previous learner must not populate the next account.
  await page
    .getByRole("button", { name: "ادامهٔ یادگیری", exact: true })
    .click();
  await page.locator(".academy-chapters button").nth(4).click();
  await expect(page.locator(".product-sync-button")).toHaveText(
    "همگام با حساب شما",
  );
  const scenario = labCases[0];
  await page.locator(".evidence-commands button").nth(0).click();
  await page.locator(".evidence-commands button").nth(1).click();
  await page
    .locator(".lab-decisions .academy-options")
    .nth(0)
    .getByRole("button")
    .nth(scenario.cause)
    .click();
  await page
    .locator(".lab-decisions .academy-options")
    .nth(1)
    .getByRole("button")
    .nth(scenario.fix)
    .click();
  let release, started;
  const held = new Promise((resolve) => (release = resolve)),
    sent = new Promise((resolve) => (started = resolve));
  await page.route("**/api/course/labs", async (route) => {
    const response = await route.fetch();
    started();
    await held;
    await route.fulfill({ response });
  });
  await page
    .getByRole("button", { name: "اعمال تصمیم در شبیه‌سازی", exact: true })
    .click();
  await sent;
  await page.getByRole("link", { name: "بازگشت به یادگیری من" }).click();
  await page.getByRole("button", { name: "خروج از حساب", exact: true }).click();
  await page.getByLabel("نام شما", { exact: true }).fill("کاربر دوم");
  await page.getByLabel("ایمیل", { exact: true }).fill("another@example.com");
  await page.getByLabel("گذرواژه", { exact: true }).fill(password);
  await page.getByRole("button", { name: "ساخت حساب و شروع یادگیری" }).click();
  await expect(
    page.getByRole("button", { name: "ثبت‌نام و شروع دوره", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".learning-history li")).toHaveCount(0);
  record(
    "Another account on the same browser starts with its own empty learning record",
  );
  const lateResponse = page.waitForResponse((response) =>
    response.url().endsWith("/api/course/labs"),
  );
  release();
  await lateResponse;
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await expect(
    page.getByRole("button", { name: "ثبت‌نام و شروع دوره", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".learning-history li")).toHaveCount(0);
  record(
    "Delayed lab response cannot display the previous learner's record after account switching",
  );
  assert.deepEqual(errors, []);
  record("No browser runtime errors");
  await writeFile(
    path.join(output, "results.json"),
    JSON.stringify(
      { browser: await browser.version(), results, errors },
      null,
      2,
    ),
  );
} catch (error) {
  if (page) {
    await page
      .screenshot({ path: path.join(output, "failure.png"), fullPage: true })
      .catch(() => {});
    await writeFile(
      path.join(output, "failure.txt"),
      String(error) + "\n" + errors.join("\n"),
    );
  }
  throw error;
} finally {
  await browser?.close();
  await app.close();
  await rm(directory, { recursive: true, force: true });
}
