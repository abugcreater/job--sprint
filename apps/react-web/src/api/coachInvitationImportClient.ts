import { appPath, canUseServerRuntime } from "./runtimeClient";
import type { CoachInvitationDraft, CoachInvitationResponse, CoachInvitationStatus } from "./coachInvitationClient";

export type CoachInvitationImportRecord = Partial<CoachInvitationDraft> & {
  username: string;
};

export interface CoachInvitationImportParseResult {
  records: CoachInvitationImportRecord[];
  rejectedRows: Array<{ row: number; reason: string }>;
}

export async function importCoachInvitations(
  records: CoachInvitationImportRecord[]
): Promise<CoachInvitationResponse | null> {
  if (!canUseServerRuntime()) return null;
  const response = await fetch(appPath("/api/coach/invitations"), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ operation: "bulk-import", records })
  });
  if ([401, 403, 503].includes(response.status)) return null;
  if (!response.ok) {
    const data = await readJson(response);
    throw new Error(data?.importAction?.message || data?.message || `coach_invitation_import_failed:${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data?.invitations) && data?.summary ? data as CoachInvitationResponse : null;
}

export function parseCoachInvitationImport(
  raw: string,
  defaults: Partial<CoachInvitationDraft> = {}
): CoachInvitationImportParseResult {
  const text = raw.trim();
  if (!text) return { records: [], rejectedRows: [{ row: 0, reason: "empty_import" }] };
  const jsonRecords = parseJsonImport(text, defaults);
  if (jsonRecords) return jsonRecords;
  return parseDelimitedImport(text, defaults);
}

function parseJsonImport(raw: string, defaults: Partial<CoachInvitationDraft>): CoachInvitationImportParseResult | null {
  if (!raw.startsWith("[") && !raw.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(raw);
    const source = Array.isArray(parsed) ? parsed : Array.isArray(parsed.records) ? parsed.records : Array.isArray(parsed.invitations) ? parsed.invitations : null;
    if (!source) return { records: [], rejectedRows: [{ row: 1, reason: "json_array_required" }] };
    return normalizeImportRows(source, defaults);
  } catch (_) {
    return { records: [], rejectedRows: [{ row: 1, reason: "invalid_json" }] };
  }
}

function parseDelimitedImport(raw: string, defaults: Partial<CoachInvitationDraft>): CoachInvitationImportParseResult {
  const rows = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (rows.length === 0) return { records: [], rejectedRows: [{ row: 0, reason: "empty_import" }] };
  const delimiter = rows.some((line) => line.includes("\t")) ? "\t" : ",";
  const firstCells = splitDelimitedRow(rows[0], delimiter);
  const hasHeader = firstCells.some((cell) => ["username", "登录名", "displayName", "显示名"].includes(cell));
  const headers = hasHeader ? firstCells : ["username", "displayName", "roleFamily", "targetRole", "inviteBatch", "dataScope", "templateVersion", "status", "note"];
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const source = dataRows.map((row) => {
    const cells = splitDelimitedRow(row, delimiter);
    return headers.reduce<Record<string, string>>((record, header, index) => {
      const field = importHeaderToField(header);
      if (field) record[field] = cells[index] || "";
      return record;
    }, {});
  });
  return normalizeImportRows(source, defaults, hasHeader ? 2 : 1);
}

function normalizeImportRows(
  source: unknown[],
  defaults: Partial<CoachInvitationDraft>,
  firstRowNumber = 1
): CoachInvitationImportParseResult {
  const rejectedRows: Array<{ row: number; reason: string }> = [];
  const byUsername = new Map<string, CoachInvitationImportRecord>();
  source.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      rejectedRows.push({ row: firstRowNumber + index, reason: "row_object_required" });
      return;
    }
    const row = item as Record<string, unknown>;
    const username = textValue(row.username);
    if (!username) {
      rejectedRows.push({ row: firstRowNumber + index, reason: "username_required" });
      return;
    }
    byUsername.set(username, {
      username,
      displayName: textValue(row.displayName) || username,
      dataScope: textValue(row.dataScope) || username,
      inviteBatch: textValue(row.inviteBatch) || defaults.inviteBatch || "2026-07-beta",
      templateVersion: textValue(row.templateVersion) || defaults.templateVersion || "role-family-v1",
      roleFamily: textValue(row.roleFamily) || defaults.roleFamily || "other_it",
      targetRole: textValue(row.targetRole) || defaults.targetRole || "",
      status: normalizeStatus(textValue(row.status) || defaults.status),
      note: textValue(row.note) || defaults.note || "",
      provisionAccount: false,
      accountRole: "coach",
      password: ""
    });
  });
  return { records: [...byUsername.values()], rejectedRows };
}

function splitDelimitedRow(row: string, delimiter: string) {
  return row.split(delimiter).map((cell) => cell.trim());
}

function importHeaderToField(header: string) {
  const mapping: Record<string, string> = {
    username: "username",
    "登录名": "username",
    displayName: "displayName",
    "显示名": "displayName",
    dataScope: "dataScope",
    "数据域": "dataScope",
    inviteBatch: "inviteBatch",
    "批次": "inviteBatch",
    templateVersion: "templateVersion",
    "模板": "templateVersion",
    roleFamily: "roleFamily",
    "角色族": "roleFamily",
    targetRole: "targetRole",
    "目标岗位": "targetRole",
    status: "status",
    "状态": "status",
    note: "note",
    "备注": "note"
  };
  return mapping[header.trim()] || "";
}

function normalizeStatus(value: unknown): CoachInvitationStatus {
  return value === "draft" || value === "invited" || value === "active" || value === "paused" ? value : "invited";
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function readJson(response: Response) {
  try {
    return await response.json();
  } catch (_) {
    return null;
  }
}
