import type { CoachScheduleDraft } from "./coachAdapter";

export function cloneScheduleDraft(draft: CoachScheduleDraft): CoachScheduleDraft {
  return { ...draft };
}

export function isScheduleDraftDirty(draft: CoachScheduleDraft, baseline: CoachScheduleDraft): boolean {
  return draft.id !== baseline.id
    || draft.title !== baseline.title
    || draft.date !== baseline.date
    || draft.start !== baseline.start
    || draft.end !== baseline.end
    || draft.kind !== baseline.kind
    || draft.reason !== baseline.reason
    || draft.evidenceRequired !== baseline.evidenceRequired;
}
