"use client";
import { useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { devices } from "@/lib/ics/devices";
import book from "@/lib/ics/book.json";
const fa = (n: number) => n.toLocaleString("fa-IR");
export const reading: Record<string, string[]> = {
  process: ["1.1", "1.2"],
  chain: ["1.3", "1.6", "1.9", "1.11", "1.12"],
  scaling: ["1.4", "1.5", "1.15"],
  feedback: ["1.7", "1.8", "1.16"],
  truth: ["1.10", "1.13", "1.14"],
  electricity: ["2.1", "2.2", "2.3", "2.4", "2.14"],
  io: ["2.5", "2.6", "2.11"],
  mismatch: ["2.7", "2.8", "2.9", "2.10", "2.12", "2.15"],
  asset: ["2.16", "E13", "E14"],
  evidence: ["1.17", "1.18", "1.19", "2.13", "2.17", "2.18"],
};
export function BookReading({ ids }: { ids: string[] }) {
  return (
    <div className="ics-reading">
      <h3>مطالعهٔ عمیق از کتاب دانشجو</h3>
      <p>
        متن انگلیسی سند ارسالی، با شمارهٔ بخش اصلی. تصاویر و فایل‌های آزمایشگاهِ
        ارجاع‌شده در متن، همراه این خوانش نیستند؛ تمرین‌های تعاملی این صفحه
        پیاده‌سازی مستقل آموزشی‌اند.
      </p>
      {ids.map((id) => {
        const section = book.sections[id as keyof typeof book.sections];
        return section ? (
          <details key={id}>
            <summary dir="ltr">{section.title}</summary>
            <div lang="en" dir="ltr" className="ics-book-text">
              {section.blocks.map((block, i) =>
                block.type === "table" && "rows" in block ? (
                  <div className="ics-table-scroll" key={i}>
                    <table>
                      <tbody>
                        {block.rows?.map((row, j) => (
                          <tr key={j}>
                            {row.map((cell, k) =>
                              j === 0 ? (
                                <th scope="col" key={k}>
                                  {cell}
                                </th>
                              ) : (
                                <td key={k}>{cell}</td>
                              ),
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : "text" in block ? (
                  <p key={i}>{block.text}</p>
                ) : null,
              )}
            </div>
          </details>
        ) : null;
      })}
    </div>
  );
}
export function Atlas({ openLesson }: { openLesson: (id: string) => void }) {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("همه"),
    [selected, setSelected] = useState(devices[0].id);
  const filtered = devices.filter(
    (d) =>
      (category === "همه" || d.category === category) &&
      (d.name + " " + d.role).toLowerCase().includes(query.toLowerCase()),
  );
  const device = devices.find((d) => d.id === selected) ?? devices[0];
  return (
    <section>
      <div className="ics-section-head">
        <div>
          <h2>تجهیز را از نقشش بشناس</h2>
          <p>
            ۱۲ نمونهٔ واقعی؛ نقش، مسیر اتصال، خطاهای محتمل و شواهد موردنیاز.
          </p>
        </div>
      </div>
      <div className="ics-filters">
        <label>
          <Search size={16} />
          <input
            placeholder="جست‌وجوی مدل یا نقش…"
            aria-label="جست‌وجوی تجهیزات"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="گروه تجهیزات"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {[
            "همه",
            "کنترلر و I/O",
            "ابزار دقیق و عملگر",
            "نمایش، شبکه و برق",
          ].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="ics-atlas">
        <div className="ics-device-list">
          {filtered.map((d) => (
            <button
              aria-pressed={d.id === selected}
              key={d.id}
              onClick={() => setSelected(d.id)}
            >
              <span>{d.category}</span>
              <b dir="ltr">{d.name}</b>
            </button>
          ))}
          {!filtered.length && (
            <p>تجهیزی پیدا نشد. عبارت یا گروه را تغییر بده.</p>
          )}
        </div>
        <article className="ics-device-detail">
          <span className="ics-tag">{device.category}</span>
          <h3 dir="ltr">{device.name}</h3>
          {[
            ["نقش در سیستم", device.role],
            ["کاربرد آموزشی", device.use],
            ["اتصال‌ها", device.connections],
            ["شناسنامهٔ دقیق", device.identity],
            ["اشتباه رایج در تشخیص", device.failure],
            ["شواهد قابل بررسی", device.evidence],
          ].map(([title, text]) => (
            <section key={title}>
              <h4>{title}</h4>
              <p>{text}</p>
            </section>
          ))}
          <div className="ics-actions">
            <a
              className="ics-primary"
              href={device.source}
              target="_blank"
              rel="noreferrer"
            >
              صفحهٔ سازنده و تصاویر مرجع ↗
            </a>
            <button onClick={() => openLesson(device.lesson)}>
              درس مرتبط
              <ArrowLeft size={15} />
            </button>
          </div>
          <BookReading ids={["E" + (devices.indexOf(device) + 1)]} />
        </article>
      </div>
    </section>
  );
}
export function Glossary() {
  const [query, setQuery] = useState("");
  const entries = book.glossary.filter((row) =>
    row.join(" ").toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section>
      <h2>زبان مشترک IT و OT</h2>
      <p>
        ۱۰۲ اصطلاح از واژه‌نامهٔ کتاب دانشجو؛ معادل فارسی و تعریف اصلی انگلیسی.
      </p>
      <label className="ics-glossary-search">
        <Search size={18} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="مثلاً PLC، کالیبراسیون، فشار…"
          aria-label="جست‌وجوی واژه‌نامه"
        />
      </label>
      <p>{fa(entries.length)} اصطلاح</p>
      <dl className="ics-glossary">
        {entries.map(([en, faText, meaning]) => (
          <div key={en}>
            <dt>
              <b dir="ltr">{en}</b>
              <span>{faText}</span>
            </dt>
            <dd lang="en" dir="ltr">
              {meaning}
            </dd>
          </div>
        ))}
      </dl>
      {!entries.length && <p>واژه‌ای پیدا نشد؛ عبارت کوتاه‌تری بنویس.</p>}
    </section>
  );
}
