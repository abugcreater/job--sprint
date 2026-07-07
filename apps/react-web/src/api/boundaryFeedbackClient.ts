import type { BoundarySuggestionFeedback } from "../types/sprint";
import type { BoundarySuggestionFeedbackSummary } from "../data/boundarySuggestionFeedbackAdapter";
import { appPath, canUseServerRuntime } from "./runtimeClient";

export type BoundaryFeedbackPayload = Omit<BoundarySuggestionFeedback, "id" | "createdAt"> & {
  id?: string;
  createdAt?: string;
};

export interface BoundaryFeedbackResponse {
  ok: boolean;
  storage?: string;
  readOnly?: boolean;
  feedback: BoundarySuggestionFeedback[];
  summary?: BoundarySuggestionFeedbackSummary & {
    revisionRate?: number;
    topTopics?: { topic: string; count: number }[];
  };
}

export async function submitBoundarySuggestionFeedback(payload: BoundaryFeedbackPayload): Promise<BoundarySuggestionFeedback | null> {
  if (!canUseServerRuntime()) return null;
  const response = await fetch(appPath("/api/coach/boundary-feedback"), {
    method: "POST",
    credentials: "include",
    keepalive: true,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if ([401, 403, 503].includes(response.status)) return null;
  if (!response.ok) throw new Error(`boundary_feedback_failed:${response.status}`);
  const data = await response.json();
  return data?.feedback ?? null;
}

export async function fetchBoundarySuggestionFeedback(): Promise<BoundaryFeedbackResponse | null> {
  if (!canUseServerRuntime()) return null;
  const response = await fetch(appPath("/api/coach/boundary-feedback"), {
    method: "GET",
    credentials: "include",
    cache: "no-store"
  });
  if ([401, 403, 503].includes(response.status)) return null;
  if (!response.ok) throw new Error(`boundary_feedback_load_failed:${response.status}`);
  const data = await response.json();
  return Array.isArray(data?.feedback) ? data as BoundaryFeedbackResponse : null;
}
