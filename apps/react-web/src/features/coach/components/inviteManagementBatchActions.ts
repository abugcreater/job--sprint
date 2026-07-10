import type { CoachAccountAction } from "../../../api/coachInvitationClient";

export function buildBatchActionHint({
  selectedBatch,
  filteredUserCount,
  saving
}: {
  selectedBatch: string;
  filteredUserCount: number;
  saving: boolean;
}) {
  if (saving) return "批量操作处理中：请等待当前保存完成。";
  if (selectedBatch === "all") return "批量操作未就绪：请先选择一个具体批次，避免误操作全部试用用户。";
  if (filteredUserCount === 0) return "当前批次没有可操作的登录账号：可先导入或开通账号；批次邀请状态仍可更新。";
  return `批量操作就绪：将处理 ${selectedBatch} 批次的 ${filteredUserCount} 个登录账号。`;
}

export function buildBatchAccountActionConfirmation({
  action,
  filteredUserCount,
  selectedBatch
}: {
  action: CoachAccountAction;
  filteredUserCount: number;
  selectedBatch: string;
}) {
  if (action === "delete") {
    return {
      confirmLabel: "确认批量删除",
      message: `确认批量删除 ${selectedBatch} 批次的 ${filteredUserCount} 个登录账号？删除后这些用户无法登录；数据域、邀请记录和历史求职数据不会自动删除。`,
      title: `确认批量删除 ${selectedBatch} ${filteredUserCount} 个账号`
    };
  }
  if (action === "enable") {
    return {
      confirmLabel: "确认批量恢复",
      message: `确认批量恢复 ${selectedBatch} 批次的 ${filteredUserCount} 个登录账号？恢复后这些用户可以再次登录自己的数据域。`,
      title: `确认批量恢复 ${selectedBatch} ${filteredUserCount} 个账号`
    };
  }
  return {
    confirmLabel: "确认批量禁用",
    message: `确认批量禁用 ${selectedBatch} 批次的 ${filteredUserCount} 个登录账号？禁用后这些用户无法登录；数据域、邀请记录和历史求职数据会保留，owner 可稍后恢复。`,
    title: `确认批量禁用 ${selectedBatch} ${filteredUserCount} 个账号`
  };
}
