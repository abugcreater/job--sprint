import {
  buildCoachLoginEntry,
  buildCoachInvitationExport,
  createCoachInvitationDraft,
  type CoachInvitationResponse
} from "../api/coachInvitationClient";
import { parseCoachInvitationImport } from "../api/coachInvitationImportClient";

describe("coachInvitationClient", () => {
  it("keeps new invitation drafts tied to a versioned onboarding template", () => {
    expect(createCoachInvitationDraft()).toMatchObject({
      inviteBatch: "2026-07-beta",
      templateVersion: "role-family-v1",
      status: "draft"
    });
  });

  it("exports invitation reports by selected batch without leaking unrelated trial users", () => {
    const response: CoachInvitationResponse = {
      ok: true,
      storage: "sqlite",
      invitations: [
        {
          id: "invite-mia",
          username: "mia",
          displayName: "Mia",
          dataScope: "mia",
          inviteBatch: "2026-07-beta",
          templateVersion: "jd-focus-v1",
          roleFamily: "qa",
          targetRole: "测试开发工程师",
          status: "active",
          note: "首批试用",
          createdAt: "2026-07-07T10:00:00.000Z",
          updatedAt: "2026-07-07T10:00:00.000Z"
        },
        {
          id: "invite-lee",
          username: "lee",
          displayName: "Lee",
          dataScope: "lee",
          inviteBatch: "2026-07-gamma",
          templateVersion: "role-family-v1",
          roleFamily: "frontend",
          targetRole: "前端工程师",
          status: "invited",
          note: "第二批试用",
          createdAt: "2026-07-07T10:00:00.000Z",
          updatedAt: "2026-07-07T10:00:00.000Z"
        }
      ],
      configuredUsers: [
        { username: "mia", displayName: "Mia", dataScope: "mia", inviteBatch: "2026-07-beta", role: "coach", disabled: false, canLogin: true },
        { username: "lee", displayName: "Lee", dataScope: "lee", inviteBatch: "2026-07-gamma", role: "coach", disabled: true, canLogin: false }
      ],
      summary: {
        totalInvitations: 2,
        batchCount: 2,
        templateVersionCount: 2,
        draftCount: 0,
        invitedCount: 1,
        activeCount: 1,
        pausedCount: 0,
        nextActionLabel: "继续跟进首登。"
      }
    };

    const exported = JSON.parse(buildCoachInvitationExport(response, "2026-07-beta"));

    expect(exported).toMatchObject({
      schemaVersion: "coach-invitations-export-v1",
      inviteBatch: "2026-07-beta",
      invitationCount: 1,
      configuredUserCount: 1
    });
    expect(exported.invitations[0]).toMatchObject({
      username: "mia",
      templateVersion: "jd-focus-v1"
    });
    expect(JSON.stringify(exported)).not.toContain("lee");
  });

  it("builds a copyable login entry without passwords", () => {
    const entry = JSON.parse(buildCoachLoginEntry({
      username: "mia",
      displayName: "Mia",
      dataScope: "mia",
      inviteBatch: "2026-07-beta",
      role: "coach",
      disabled: false,
      canLogin: true
    }, "https://example.test"));

    expect(entry).toMatchObject({
      schemaVersion: "coach-login-entry-v1",
      username: "mia",
      loginUrl: "https://example.test/job-sprint/react/index.html",
      accountStatus: "enabled"
    });
    expect(JSON.stringify(entry)).not.toContain("password");
  });

  it("parses pasted invitation rows for batch import", () => {
    const parsed = parseCoachInvitationImport([
      "登录名,显示名,角色族,目标岗位,批次",
      "nora,Nora,data,数据分析师,2026-07-import",
      "dev,Dev,frontend,前端工程师,2026-07-import"
    ].join("\n"), {
      templateVersion: "jd-focus-v1"
    });

    expect(parsed.rejectedRows).toEqual([]);
    expect(parsed.records).toHaveLength(2);
    expect(parsed.records[0]).toMatchObject({
      username: "nora",
      roleFamily: "data",
      targetRole: "数据分析师",
      inviteBatch: "2026-07-import",
      templateVersion: "jd-focus-v1",
      status: "invited",
      provisionAccount: false
    });
  });

  it("rejects batch import rows without usernames before calling the server", () => {
    const parsed = parseCoachInvitationImport("显示名,角色族\nNoName,qa");

    expect(parsed.records).toEqual([]);
    expect(parsed.rejectedRows).toEqual([{ row: 2, reason: "username_required" }]);
  });
});
