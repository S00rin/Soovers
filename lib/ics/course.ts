import { lessons } from "./content.ts";
export const phases = [
  {
    title: "فرایند را بفهم",
    range: [1, 4],
    description: "از مخزن و سیگنال تا نقشه و کنترل بازخوردی.",
  },
  {
    title: "سیستم کنترل را بشناس",
    range: [5, 8],
    description: "برنامهٔ PLC، سامانهٔ نظارتی، حفاظت و شبکه.",
  },
  {
    title: "زبان تجهیزات را بخوان",
    range: [9, 14],
    description: "پروتکل‌های صنعتی؛ از یک رجیستر تا یک رویداد پست.",
  },
  {
    title: "معماری را به تجهیز وصل کن",
    range: [15, 22],
    description: "پتروشیمی، نیروگاه و پست؛ مقایسهٔ خانواده‌های واقعی.",
  },
  {
    title: "دفاع را با شواهد پیش ببر",
    range: [23, 31],
    description: "ریسک، دسترسی، تغییر، بازیابی، پایش و پاسخ.",
  },
  {
    title: "آموخته‌ها را به کار ببر",
    range: [32, 34],
    description: "دو پروژهٔ پایانی و تمرین آموزش دادن به دیگران.",
  },
] as const;
export const chapters = Array.from(new Set(lessons.map((l) => l.chapter))).map(
  (number) => ({
    number,
    title:
      number === 1
        ? "فرایند، مخزن و حلقهٔ کنترل"
        : number === 2
          ? "برق، سیگنال و شواهد"
          : lessons.find((l) => l.chapter === number)!.title,
    lessons: lessons.filter((l) => l.chapter === number),
  }),
);
export function routeFor(hash: string) {
  const parts = hash.split("/");
  return {
    view: parts[1] === "lesson" ? ("lesson" as const) : ("home" as const),
    id: parts[1] === "lesson" ? parts[2] : undefined,
  };
}
