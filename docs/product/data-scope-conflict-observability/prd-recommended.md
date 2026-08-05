# 推荐方案：历史数据域冲突检测合同

## API 合同

`GET /api/coach/invitations` 和所有成功后的邀请管理响应新增：

```json
{
  "dataScopeConflicts": [
    {
      "dataScope": "mia",
      "usernames": ["mia", "mia-shadow"]
    }
  ]
}
```

没有重复配置时返回空数组。按数据域和登录名稳定排序，避免 owner 每次刷新得到不同顺序。

## 恢复规则

1. owner 先核验每个登录账号对应的真实求职数据。
2. 需要保留的账号在邀请台账中设为独立 `dataScope`，并通过开通或重置操作写回 users file。
3. 系统不删除旧 runtime，也不把既有 runtime 复制到新 scope。

## 安全约束

- 冲突清单只由 owner 权限的接口返回。
- 不包含密码、hash、session、画像、知识、机会、面试或复盘内容。
- 停用账号同样会显示，避免其日后恢复时重新引入共享数据域。
