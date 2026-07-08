import type { CoachInvitationResponse, CoachInvitationStatus } from "../../../api/coachInvitationClient";

export const statusOptions: Array<{ value: CoachInvitationStatus; label: string }> = [
  { value: "draft", label: "草稿" },
  { value: "invited", label: "已邀请" },
  { value: "active", label: "已激活" },
  { value: "paused", label: "已暂停" }
];

export const roleFamilyOptions = [
  { value: "backend", label: "后端" },
  { value: "frontend", label: "前端" },
  { value: "qa", label: "测试" },
  { value: "data", label: "数据" },
  { value: "product", label: "产品" },
  { value: "ops", label: "运维" },
  { value: "other_it", label: "其他 IT" }
];

export const templateVersionOptions = [
  { value: "role-family-v1", label: "角色族建档模板 v1" },
  { value: "jd-focus-v1", label: "JD 焦点模板 v1" },
  { value: "manual-v1", label: "人工配置模板 v1" }
];

export function statusLabel(status: CoachInvitationStatus) {
  return statusOptions.find((option) => option.value === status)?.label ?? status;
}

export function accountProvisioningText(response: CoachInvitationResponse | null) {
  const state = response?.accountProvisioning;
  if (!state) return "读取服务端后显示账号开通能力。";
  if (state.enabled) return "已连接 users file，保存时可直接开通或重置密码。";
  return state.message || "当前服务端未开放账号开通。";
}
