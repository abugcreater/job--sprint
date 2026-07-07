import type { CoachConfidence } from "../types/sprint";

export function cleanText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function optionalCleanText(value?: string): string | undefined {
  const cleaned = cleanText(value ?? "");
  return cleaned || undefined;
}

export function normalizeCoachConfidence(value?: CoachConfidence): CoachConfidence | undefined {
  return value && ["low", "medium", "high"].includes(value) ? value : undefined;
}

export function newEntityId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
