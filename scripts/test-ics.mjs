import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { lessons, roadmap } from "../lib/ics/content.ts";
import { devices } from "../lib/ics/devices.ts";
import {
  currentToLevel,
  levelToCurrent,
  loopMargin,
  initialTank,
  advanceTank,
  parseProgress,
  gradeAnswer,
} from "../lib/ics/model.ts";
const near = (a, b, tolerance = 1e-8) =>
  assert.ok(Math.abs(a - b) <= tolerance, `${a} differs from ${b}`);
test("engineering scaling distinguishes nominal validity, endpoints and range mismatch", () => {
  near(currentToLevel(4).value, 0);
  near(currentToLevel(20).value, 4);
  near(currentToLevel(10).value, 1.5);
  near(currentToLevel(14).value, 2.5);
  assert.equal(currentToLevel(0).valid, false);
  assert.equal(currentToLevel(22).valid, false);
  near(levelToCurrent(2, 0, 8), 8);
  near(currentToLevel(8, 0, 4).value, 1);
  near(currentToLevel(12, -50, 150).value, 50);
  assert.throws(() => currentToLevel(8, 4, 4));
  assert.throws(() => levelToCurrent(NaN));
});
test("loop budget handles units and high-current constraints", () => {
  near(loopMargin(24, 250, 12).margin, 7);
  near(loopMargin(24, 700, 12).margin, -2);
  assert.ok(loopMargin(20, 500, 12, 4).margin > 0);
  assert.ok(loopMargin(20, 500, 12, 20).margin < 0);
  assert.throws(() => loopMargin(24, -1, 12));
});
test("tank conserves volume, predicts P offset and separates frozen measurement from stale display", () => {
  const normal = advanceTank([initialTank()], "normal", "P", 1200);
  assert.equal(normal.length, 1201);
  near(normal.at(-1).level, 2);
  const proportional = advanceTank([initialTank()], "disturbance", "P", 1200);
  near(proportional.at(-1).level, 2.25, 0.001);
  for (let i = 1; i < proportional.length; i++) {
    const p = proportional[i];
    near(p.level - proportional[i - 1].level, (p.inflow - p.outflow) / 2000);
  }
  const frozen = advanceTank([initialTank()], "sensor", "PI", 1200).at(-1);
  near(frozen.level, 3.8);
  near(frozen.pv, 2);
  assert.equal(frozen.age, 0);
  const stale = advanceTank([initialTank()], "hmi", "PI", 1200).at(-1);
  assert.equal(stale.age, 900);
  near(stale.display, 2);
  assert.ok(Math.abs(stale.pv - stale.display) > 0.001);
  assert.ok(Math.abs(stale.level - 2) < 0.1);
  assert.equal(advanceTank(normal, "normal", "P", 60).length, 1201);
});
test("content links are complete; roadmap totals are plans, and assessments are not prerequisites", async () => {
  assert.equal(lessons.length, 42);
  assert.equal(new Set(lessons.map((l) => l.id)).size, 42);
  assert.equal(devices.length, 12);
  assert.equal(
    roadmap.reduce((s, r) => s + r[2], 0),
    816,
  );
  for (const d of devices) {
    assert.ok(lessons.some((l) => l.id === d.lesson));
    assert.match(d.source, /^https:\/\//);
  }
  for (const l of lessons)
    assert.equal(gradeAnswer(l.id, l.question.answer).correct, true);
  assert.throws(() => gradeAnswer("process", 99));
  assert.throws(() => gradeAnswer("unknown", 0));
  assert.deepEqual(
    parseProgress({
      lesson: "evidence",
      completed: lessons.map((l) => l.id),
      notes: "",
    }).completed,
    lessons.map((l) => l.id),
  );
  const book = JSON.parse(
    await readFile(new URL("../lib/ics/book.json", import.meta.url)),
  );
  assert.equal(Object.keys(book.sections).length, 51);
  assert.equal(book.glossary.length, 102);
  assert.ok(book.sections["2.15"].blocks.length > 0);
});

// Every advertised chapter has original teaching, worked reasoning and a usable exercise.
test("all 34 chapters have substantive teaching and contextual exercises", () => {
  assert.deepEqual(
    [...new Set(lessons.map((l) => l.chapter))],
    Array.from({ length: 34 }, (_, i) => i + 1),
  );
  for (const l of lessons.filter((l) => l.chapter > 2)) {
    assert.ok(l.sections.length >= 5, l.id);
    assert.ok(
      l.sections
        .map((s) => s.text)
        .join(" ")
        .split(/\s+/).length >= 350,
      l.id + " too thin",
    );
    assert.ok(l.example.text.length > 80);
    assert.equal(l.activity, "case");
    assert.equal(l.practice.steps.length, 2);
    assert.ok(l.practice.evidence.length >= 2);
    for (const q of [l.question, ...l.practice.steps]) {
      assert.equal(q.options.length, 3);
      assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 3);
      assert.ok(q.explanation.length > 50);
    }
    assert.ok(l.sources.length > 0);
    for (const s of l.sources) assert.match(s.url, /^https:\/\//);
  }
  const legacy = parseProgress({
    lesson: "mismatch",
    completed: ["process", "scaling"],
    notes: "legacy",
  });
  assert.equal(legacy.lesson, "mismatch");
  assert.deepEqual(legacy.completed, ["process", "scaling"]);
});
