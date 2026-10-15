import type { CourseProgress } from "../education/f5-course";
export type User = { id: string; name: string; email: string };
export type Course = {
  id: string;
  progress: CourseProgress;
  score: number;
  bestCorrect: number;
  enrolledAt: string;
  updatedAt: string;
  attempts: {
    id: string;
    kind: string;
    caseId: string | null;
    correct: number;
    total: number;
    createdAt: string;
  }[];
};
export type LabSubmission = {
  caseId: string;
  evidence: number[];
  diagnosis: number;
  action: number;
};
export class RequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  const response = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    headers:
      method === "GET"
        ? {}
        : { "Content-Type": "application/json", "X-Soovers-Request": "1" },
    body: method === "GET" ? undefined : JSON.stringify(data ?? {}),
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("پاسخ سامانه دریافت نشد. اتصال را بررسی کنید.");
  }
  if (!response.ok)
    throw new RequestError(
      response.status,
      typeof result === "object" &&
      result !== null &&
      "error" in result &&
      typeof result.error === "string"
        ? result.error
        : "درخواست انجام نشد.",
    );
  return result as T;
}
