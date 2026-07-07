# 两周求职冲刺日程页面

这个页面用于把 2026-07-01 到 2026-07-14 的全职求职冲刺计划变成每天可执行的工作台。它不是普通日历，核心是提醒你当前该做什么、今天必须产出什么、要会答哪些面试问题，以及如何把 AI/RAG/Agent 项目映射成高级 Java 后端能力证据。

当前版本已经改成“LLM 初学爬坡版”：前 3 天以低压概念复述、最小演示和 Java 后端映射为主，不会一开始就按深水区 RAG/Agent 面试强度追问。

## 文件结构

| 文件 | 作用 |
|---|---|
| `schedule.html` | 本地日程页面入口 |
| `assets/schedule.css` | 页面样式 |
| `assets/schedule.js` | 当前任务计算、渲染、localStorage、导出逻辑 |
| `apps/server/app.js` | 静态页面服务、AI 评分 API 代理、运行态 JSON API |
| `data/schedule.json` | 两周优化日程数据 |
| `data/interview_context.json` | 简历/JD/面经信号与面试题库 |
| `data/interview_kb.json` | 脱敏本地面试知识库 |
| `dist/public-safe/` | 脱敏公网安全包，运行 `npm run build:public-safe` 后生成 |
| `tests/api_runtime_test.js` | 服务端运行态 API 测试 |
| `tests/page_smoke_test.js` | 页面与静态资源 smoke test |
| `docs/core/01-project-background.md` | 项目背景和定位 |
| `docs/core/02-project-plan.md` | 当前规划和路线图 |
| `docs/core/03-technical-architecture.md` | 技术架构、Android 和发布边界 |
| `docs/core/04-acceptance-and-risk.md` | 验收命令、结论和风险 |
| `tests/schedule_logic_test.js` | Node.js 当前任务逻辑测试 |

## 如何打开

推荐用 Node 服务打开，这样可以同时使用 AI 评分接口：

```bash
cd /path/to/job-sprint-coach
npm start
```

然后访问：

```text
http://localhost:8000/schedule.html
```

也可以只用 Python 静态服务打开，但 AI 评分会退化为本地规则评分：

```bash
cd /path/to/job-sprint-coach
python3 -m http.server 8000
```

然后访问：

```text
http://localhost:8000/schedule.html
```

部分浏览器直接双击 `schedule.html` 会因为 `file://` 安全限制无法读取 `data/schedule.json`。如果页面提示无法加载 JSON，就按上面的 HTTP server 方式打开。

## 如何接入 AI 评分 API

页面不会把 token 放进前端。评分 API 由 `apps/server/app.js` 读取环境变量后代理调用。

启动前在本地 shell 配置：

```bash
export ANTHROPIC_BASE_URL="http://your-anthropic-compatible-host"
export ANTHROPIC_AUTH_TOKEN="replace-with-your-token"
export ANTHROPIC_MODEL="claude-3-5-sonnet-20241022"
export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
npm start
```

检查：

```bash
curl http://127.0.0.1:8000/api/health
```

如果 `apiConfigured` 是 `true`，说明后端已接入。不要把真实 token 写入 Git 或前端文件。

## 如何使用语音回答

在“口述面试助手”里点击“开始语音”。安卓 Chrome 通常支持浏览器语音识别。

注意：

- 本地 `localhost` 可以使用语音。
- 部署到腾讯云后需要 HTTPS，否则手机浏览器可能禁用麦克风。
- 如果浏览器不支持语音识别，可以直接手打回答再提交评分。

## 如何处理突发延期

在“突发延期与补做”里填写开始时间、结束时间和原因，然后点击“登记并顺延未完成任务”。

规则：

- 已完成任务不再顺延。
- 未完成且位于中断开始后的任务会整体后移。
- 任务 ID 保持不变，完成状态不会丢。
- 14 天总览会按顺延后的有效日程展示，必要时会出现额外补做日期。

## 存储模式

页面优先使用 Node 服务端 JSON 存储：

- 完成状态：`/api/progress`
- 每日复盘：`/api/reviews`
- 投递记录：`/api/applications`
- 面试错题：`/api/interview-mistakes`

默认数据文件为 `apps/server/data/runtime.json`，该目录不提交 Git。页面右上角会显示当前存储模式。

如果直接静态打开、离线 APK fallback、或 API 不可达，页面会自动回退浏览器 `localStorage`。

当 Node API 恢复可用时，页面会把本地 fallback 数据和服务端 JSON 合并，再回写服务端，避免离线期间补做的完成状态、复盘、投递记录或错题被覆盖。

## 如何勾选任务

在“当前任务卡片”点击“标记完成”，或在“今日时间线”中勾选对应任务。完成状态会优先同步服务端 JSON，失败时保存在浏览器 `localStorage`，刷新页面不会丢失。

## 如何写每日复盘

页面底部“每日复盘”有六个固定问题：

1. 今天能讲的一个项目点是什么？
2. 今天能回答的两个面试题是什么？
3. 今天补强的一个 Java 后端知识点是什么？
4. 今天发现了哪些路径问题？
5. 今天哪些回答还容易被面试官追问穿？
6. 明天最优先补什么？

输入后会自动保存，也可以点击“保存复盘”。复盘按日期保存。

## 如何记录投递

在“投递记录”区填写日期、公司、岗位、城市、JD 关键词、命中的 Java/Spring/MQ/RAG/Agent/稳定性治理、简历版本、状态和备注，然后点击“新增记录”。

这部分用于提前做低风险投递和 JD 样本校准，避免到 7/13 才第一次看到市场反馈。

## 如何导出 JSON

页面提供这些导出按钮：

- 导出完成状态 JSON
- 导出每日复盘 JSON
- 导出投递记录 JSON
- 导出延期 JSON
- 导出路径审计 JSON
- 导出面试错题 JSON

导出的文件可以作为下一轮复盘、简历迭代或面试错题整理的输入。

## 如何修改日程

编辑 `data/schedule.json`。每个任务块至少需要保留这些字段：

```json
{
  "id": "2026-07-01-0930-project",
  "start": "09:30",
  "end": "11:30",
  "category": "project",
  "title": "任务标题",
  "description": "任务描述",
  "deliverables": ["必须产出"],
  "interviewQuestions": ["必须会答的问题"],
  "javaMapping": "Java 后端映射",
  "acceptance": "验收标准"
}
```

修改后建议运行：

```bash
python3 -m json.tool data/schedule.json >/tmp/schedule.json.ok
npm test
```

路径校验可以单独运行：

```bash
node tools/validate_schedule_paths.js
```

生成公网安全包：

```bash
npm run build:public-safe
npm run scan:public-safe
```

该命令会同步更新 Android WebView fallback 资产：

```text
apps/android/app/src/main/assets/web/
```

## 当前任务如何计算

页面使用 `Asia/Singapore` 时区。`assets/schedule.js` 会把每个 block 的日期和时间转换为 `+08:00` 时间点，然后用当前时间判断：

- 当前时间早于第一个任务：`计划尚未开始`
- 当前时间落在某个 block 的 `[start, end)`：`任务进行中`
- 当前时间不在 block 内但当天还有后续任务：`等待下一个任务`
- 当天任务已过但计划未结束：`今日任务已结束`
- 当前时间晚于最后一个任务：`计划已结束`

页面每 30 秒刷新一次当前时间和倒计时。

## 安卓端和腾讯云

当前安卓端已生成原生 WebView 工程骨架，但本机缺 Android SDK，无法直接产出 APK。WebView 内置 fallback 已改为 public-safe 脱敏版本。最快可用方式仍是 PWA：部署后用 Android Chrome 打开页面，再选择“添加到主屏幕”。部署和 Android 边界见：

```text
docs/core/03-technical-architecture.md
docs/core/04-acceptance-and-risk.md
```

如果后续安装 Android SDK，可以进入 `apps/android/` 执行 `gradle :app:assembleDebug` 构建 debug APK。若要多人账号体系或强一致多端同步，需要再补登录、数据库、权限隔离和并发写治理。

## 后续扩展

可以继续扩展这些能力：

1. 增加错题清单区，把每天压力模拟的问题沉淀出来。
2. 增加简历版本管理，把投递记录和简历版本关联。
3. 增加 JD 关键词统计，自动看哪些技术词最常出现。
4. 增加项目证据表，把命令、截图、接口、回答稿统一管理。
5. 增加面试录音链接字段，辅助复盘口述质量。
