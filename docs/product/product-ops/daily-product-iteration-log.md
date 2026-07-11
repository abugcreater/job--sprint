# 每日主动产品迭代日志

本日志从 GitFlow 基线启用后开始记录。`codex/open-source-deploy-release` 中的历史日志仍属于待迁移的旧发布候选，不作为当前 `main` 的交付证据。

## 2026-07-10 GitFlow 基线

- 分支：`codex/chore/gitflow-governance -> develop`
- 选择：初始化 `develop`，将 GitFlow 规范、测试、PR 模板和 CI 迁移到当前集成基线。
- 验证：以 GitFlow 策略测试、产品迭代门禁、敏感信息扫描和 PR CI 为准。
- 限制：旧发布候选与当前 `main` 存在实质差异，必须在独立迁移分支中审阅，不能直接删除或合并。

## 2026-07-10 产品级 UI 基线

- 分支：`codex/feature/product-ui-foundation`，当前堆叠在待合并的 GitFlow 治理分支上。
- 选择：首轮只改全局产品壳和 Today 工作台，Web 与 Android 使用同一 React 信息顺序；不一次重做所有业务页。
- 交付：深色分组侧栏、移动单行头部、三步建档脊柱、单任务工作面、真实状态带、上下文 rail、Evidence 焦点恢复、Android 状态栏/inset 修复。
- 验证：React 95 条测试、类型检查、生产构建、Android assets 零差异、正式签名 release、覆盖安装、真机全功能流与杀进程读回均通过。
- 限制：未做远端部署；其它业务页内部构图仍待后续逐条用户旅程迁移。

## 2026-07-10 准备工作台与 Android 可达性

- 分支：`codex/feature/product-ui-foundation`。
- 选择：采用阶段驱动求职闭环，将旧 Coach 超长页拆为画像、知识边界、今日计划、AI 建议 4 个单渲染阶段；移动主导航改为今日、准备、机会、面试、复盘。
- 交付：真实 `0/4` 进度、阶段上下文、阶段焦点、sticky header 偏移、IME 打开隐藏底栏、Android `adjustResize`。
- 验证：React 28 个文件、95 条测试通过；Android 画像阶段从 11171px 降为 2680px，3 次真实上滑到底；阶段顶部与键盘恢复均通过 CDP + ADB 量测。
- 限制：当前终端缺少正式 release signing 环境变量；本轮用独立 debug applicationId 真机验证，不覆盖或卸载现有正式包。

## 2026-07-10 机会工作台

- 分支：`codex/feature/product-ui-foundation`。
- 选择：采用事实型主从工作台；桌面清单 + 详情/两项对照，移动列表 → 详情 → 全屏编辑；拒绝 Kanban、伪匹配分和自动排序。
- 交付：URL 驱动详情/编辑、最多两项对照、移动 A/B 逐字段布局、可恢复返回键、删除确认、真实导出失败反馈、Evidence Gate 保存回执。
- 验证：React 28 个文件、96 条测试通过；Web 与 Android `384px` 无横向溢出；Android IME `792→487px`、底栏 `1→0`；返回键按“键盘 → 编辑 → 详情”退栈。
- 限制：当前记录仍是 sprint 最近记录，对照不跨刷新保存，未保存修改确认留待统一表单协议。

## 2026-07-10 学习、面试与复盘闭环

- 分支：`codex/feature/product-ui-foundation`。
- 选择：三页不再扩功能，改为当前学习任务、单题练习会话和今日闭环复盘；保存后用明确出口串联下一站。
- 交付：学习双视图、面试主操作前置、复盘三视图、可选细节折叠、删除确认、规则自检/规则整理真实性文案、事实型周复盘。
- 验证：P3 页面与 adapter 29 条定向测试；Web 完整跨页真实保存；Android `384px` 三页无横向溢出，IME 下回答框与主操作可达。
- 限制：本地 store 暂无可注入失败合同，不制造假 loading；统一草稿恢复仍待 P1。

## 2026-07-10 统计与数据设置收口

- 选择：统计明细按需展开；我的数据改为账号、备份、更多入口三层设置视图。
- 验证：384px 默认高度 Stats `3307→958px`，More `2534→1378px`，无横向溢出。
- 限制：Vite 单 chunk 超过 500 kB，等待真实冷启动指标后拆包。

## 2026-07-11 HTTPS 生产交付

- 分支：`codex/feature/product-ui-foundation`。
- 选择：备案和证书生效后，Web、服务器与 Android 统一使用仓库外私有 env 注入的正式 HTTPS 域名；Android 禁止远端 HTTP 和 cleartext。
- 交付：同步最新 React/Rust、重启 `job-sprint.service`、生成正式签名 APK并安装到 OnePlus 8 Pro。
- 验证：公网 TLS/证书、HTTP 308、Web 登录/session/写入读回、server manifest、进程 binary hash、Android authenticated session、业务保存和杀进程读回均通过。
- 限制：工作树未提交；P8 架构目标仍保留理论性 `PASS_WITH_LIMITS`；Vite 单 chunk 告警待真实冷启动指标决策。

## 2026-07-11 Android 文件与纯文本导入兼容性

- 问题：Android WebView 点击“上传简历文本”不打开文件选择器；套用建档模板会把说明文字写入“导入素材”的真实值。
- 根因：原生 `WebChromeClient` 缺少 `onShowFileChooser` 和 Activity result 回传；React 模板动作错误地修改了 `sourceText`。
- 修复：新增独立 `AndroidFileChooserController`，覆盖打开、返回、取消和销毁生命周期；模板只填写岗位画像字段，素材框保持空白。
- 验证：OnePlus 8 Pro 正式 APK 成功打开系统 DocumentsUI；React 96 条测试、Android Java 编译、完整 release gate、服务器同步、HTTPS 远端读写和 Android remote 重启读回通过。
- 防回归：Web/Rust 本地功能测试显式隔离真实 AI provider，避免最终 runner 的私有 DeepSeek 环境污染确定性用例。
