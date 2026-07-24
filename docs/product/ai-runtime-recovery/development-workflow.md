# AI 运行恢复提示开发与验证流程

日期：2026-07-24

## 实施顺序

1. 在 `runtimeClient` 中把公开失败状态收敛为有限诊断码。
2. 在 Coach 生成流程中将诊断码写入已有运行记录，并给出面向用户的即时反馈。
3. 在 `diagnoseLlmRun` 中维护单一映射，供 Coach 与 Stats 使用。
4. 添加 runtime client、诊断映射和 Coach 页面测试。
5. 运行 React 类型、定向 Vitest、现有 Node/Rust proxy diagnostics、浏览器渲染检查和产品治理门禁。

## 验收命令

```bash
npm --prefix apps/react-web run typecheck
npm --prefix apps/react-web test -- runtimeClient.test.ts CoachPage.test.tsx StatsPage.test.tsx
npm run test:coach-runtime-diagnostic
npm run test:rust-coach-runtime-proxy-auth
npm run validate:product-iteration -- --json
npm run scan:sensitive
```

## 不覆盖的验证

- 真实 provider 的限流、5xx、成本、重试和熔断。
- 远端服务器部署、Android 资源同步、APK 或 HTTPS 真机链路。
