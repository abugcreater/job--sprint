import { getLegacySnapshot } from "../data/legacyAdapters";
import { buildTodaySprint, getScheduleData } from "../data/scheduleAdapter";
import type { CoachScheduleEvent, DailySprint, ReviewEvidence, SyncState, UserProfile } from "../types/sprint";

export function createSprint(
  completed: Record<string, boolean>,
  evidenceByTaskId: Record<string, ReviewEvidence[]>,
  syncState: SyncState,
  coachScheduleEvents: CoachScheduleEvent[] = [],
  now: Date = new Date(),
  userProfiles: UserProfile[] = []
): DailySprint {
  return buildTodaySprint(getScheduleData(), now, {
    completed,
    evidenceByTaskId,
    syncState,
    coachScheduleEvents,
    activeProfileId: getActiveProfileId(userProfiles)
  }, getLegacySnapshot());
}

export function currentSprintTime(sprint: DailySprint): Date {
  const generatedAt = new Date(sprint.generatedAt);
  return Number.isFinite(generatedAt.getTime()) ? generatedAt : new Date();
}

function getActiveProfileId(profiles: UserProfile[]): string | undefined {
  return profiles.find((profile) => profile.active)?.id ?? profiles[0]?.id;
}
