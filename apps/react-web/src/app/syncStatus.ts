import type { SyncState } from "../types/sprint";

export function syncStateLabel(syncState: SyncState): string {
  return {
    online: "服务端在线",
    local_fallback: "本地模式，可继续记录",
    syncing: "同步中",
    failed: "同步失败，可本地记录",
    conflict: "待合并，先保留本地"
  }[syncState];
}
