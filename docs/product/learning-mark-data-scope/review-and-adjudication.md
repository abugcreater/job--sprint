# 评审与裁决

## 产品判断

学习重点会影响用户后续学习与题卡筛选。它不是正式求职证据，但仍属于个人行为偏好，不应因为共用浏览器而跨账号展示。

## 技术判断

- `storageOwner` 已提供 `dataScope` 与登录名，适合用于浏览器键分桶。
- 未知归属的旧全局 key 无法安全迁移；认证用户直接忽略是唯一不猜测归属的策略。
- 新键只保存知识卡 ID 数组，不包含学习笔记、账号密码、Cookie 或服务器地址。

## 团队路由与裁决

- entrypoint：`manager-dispatch`。
- 当前线程处于 quarantine，`max_agents=0`、`agent_lifecycle_budget=0`；未发现、派发、等待或关闭专家 agent。
- Team Lead 在主线程完成产品范围、实现与测试。Product、Tech、UI、Implementation、QA 角色均因当前线程隔离而未派发；通过适配器和页面回归测试补足可验证证据。

采用按数据域分桶、旧 key 不迁移的方案 B。
