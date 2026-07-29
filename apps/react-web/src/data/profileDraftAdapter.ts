import type { ProfileRoleFamily, UserProfile } from "../types/sprint";

export interface ProfileDraft {
  id?: string;
  name: string;
  roleFamily: ProfileRoleFamily;
  targetRole: string;
  targetLevel: string;
  cities: string;
  salaryTarget: string;
  companyTypes: string;
  experienceSummary: string;
  projectEvidence: string;
  nonClaims: string;
  dailyMinutes: string;
}

export function createProfileDraft(profile?: UserProfile): ProfileDraft {
  return {
    id: profile?.id,
    name: profile?.name ?? "我的求职画像",
    roleFamily: profile?.roleFamily ?? "backend",
    targetRole: profile?.targetRole ?? "",
    targetLevel: profile?.targetLevel ?? "",
    cities: profile?.cities ?? "",
    salaryTarget: profile?.salaryTarget ?? "",
    companyTypes: profile?.companyTypes ?? "",
    experienceSummary: profile?.experienceSummary ?? "",
    projectEvidence: profile?.projectEvidence ?? "",
    nonClaims: profile?.nonClaims ?? "",
    dailyMinutes: String(profile?.dailyMinutes ?? 60)
  };
}

export function cloneProfileDraft(draft: ProfileDraft): ProfileDraft {
  return { ...draft };
}

export function isProfileDraftDirty(draft: ProfileDraft, baseline: ProfileDraft): boolean {
  return draft.id !== baseline.id
    || draft.name !== baseline.name
    || draft.roleFamily !== baseline.roleFamily
    || draft.targetRole !== baseline.targetRole
    || draft.targetLevel !== baseline.targetLevel
    || draft.cities !== baseline.cities
    || draft.salaryTarget !== baseline.salaryTarget
    || draft.companyTypes !== baseline.companyTypes
    || draft.experienceSummary !== baseline.experienceSummary
    || draft.projectEvidence !== baseline.projectEvidence
    || draft.nonClaims !== baseline.nonClaims
    || draft.dailyMinutes !== baseline.dailyMinutes;
}
