# UI 基线开发与验收流程

日期：2026-07-10

## 阶段 1：冻结基线

- 读取事实源、GitFlow 与当前 UI 代码。
- 保存 Web 1440px、390px 基线截图。
- 记录当前分支和堆叠依赖。

## 阶段 2：产品壳与今日页

- 先改全局 token 与产品壳，再改今日页构图。
- 不改变 store、API、数据隔离和业务动作语义。
- 新用户空状态与已有日历状态都要有测试。

## 阶段 3：Web 验收

```bash
npm --prefix apps/react-web test -- --run src/test/TodayPage.test.tsx
npm --prefix apps/react-web run typecheck
npm --prefix apps/react-web run build
```

随后保存 1440px 与 390px 候选截图，人工核对层级、密度、焦点和底部遮挡。

## 阶段 4：Android 验收

```bash
npm run sync:android-react
npm run test:android:functional
cd apps/android && ./gradlew assembleDebug
```

若设备或 WebView 调试不可用，必须标记为 `PARTIAL`，不能以 Web 移动截图替代 Android 结论。

## 阶段 5：收口

- 运行 `git diff --check`、产品迭代门禁、GitFlow 门禁和敏感扫描。
- 更新 completion audit、产品账本、已知问题和每日迭代日志。
- 只声明本轮覆盖“产品壳 + 今日工作台 + Android 同源表面”。
