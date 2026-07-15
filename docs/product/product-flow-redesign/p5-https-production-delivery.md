# P5：HTTPS 生产交付

日期：2026-07-11

结论：`PASS_WITH_LIMITS`

## 当前生产入口

- Web：仓库外私有交付 env 中的正式 HTTPS 入口
- React：同一正式域名下的 `/job-sprint/react/index.html`
- Android：正式 APK 在构建时注入同一 React HTTPS 地址，远端地址只允许 `https`，并关闭明文 HTTP。

## 根因与修复

此前失败不是 React 或 Rust API 的业务逻辑问题，而是备案完成前正式域名的公网 SNI 链路不可用，同时仓库和私有交付配置仍保留占位域名、IP HTTP 地址与明文回退。备案和证书生效后，本轮完成了以下收口：

1. Android 生产配置改为构建时从仓库外私有交付 env 注入 HTTPS URL，公开仓库只保留安全占位值。
2. `RemoteUrlPolicy` 拒绝远端 HTTP，Manifest 设置 `usesCleartextTraffic=false`。
3. 服务器同步最新 Linux x86_64 Rust ELF 与 React production build，并重启 `job-sprint.service`，避免磁盘已更新但旧进程继续响应。
4. 远端验收统一走正式域名，覆盖 HTTP 308、HTTPS 登录、session、写入、读回和 Sub2API base path。

## 验收证据

| 验收项 | 结果 |
|---|---|
| 公网 HTTPS 与证书 | PASS；证书 SAN 与私有交付 env 的正式域名一致，HTTP 自动 308 到 HTTPS。 |
| 服务器同步 | PASS；本地与远端 manifest SHA-256 均为 `f735e41a99c893ba033f007cd78afec06ff5579527c5c07f6ea574848ac6e142`。 |
| 服务重启 | PASS；运行进程不再指向 deleted binary，进程、磁盘与本地 ELF hash 一致。 |
| Web 生产读写 | PASS；登录/session、`/api/progress` 保存与读回均通过。 |
| 正式 APK | PASS；APK SHA-256 为 `8dabb6902de7ae136e7f9e81336fd8ffa080bb79a1072ba6fd17843aa2141b09`，v2/v3 验签通过。 |
| APK HTTPS 配置 | PASS；`usesCleartextTraffic=false`，`remote_schedule_url` 为私有交付 env 注入的正式 HTTPS React URL。 |
| Android 真机远端流 | PASS；OnePlus 8 Pro 完成 HTTPS 登录、保存、AI 草稿接受/拒绝和杀进程重启读回，所有快照保持正式 HTTPS URL。 |
| Android 文件导入 | PASS；`WebChromeClient.onShowFileChooser` 打开系统 DocumentsUI，Activity result 回传 WebView，取消或销毁时释放 pending callback。 |
| 纯文本导入 | PASS；套用岗位模板不再向“导入素材”写入说明文字，用户可直接粘贴纯文本。 |
| 最终交付 runner | `PASS_WITH_LIMITS`；服务器、Web、Android remote、formal APK 和 post validation 均 PASS。 |

证据文件：

- `docs/evidence/server-sync/sync.json`
- `docs/evidence/server-remote/service-restart.json`
- `docs/evidence/server-remote/acceptance.json`
- `docs/evidence/android-remote-functional/android-webview-functional-persistence-report.json`
- `docs/evidence/android-release/formal-release.json`
- `docs/evidence/final-delivery/final-delivery.json`

部署前备份：`/opt/job-sprint-backups/job-sprint-20260710-235949.tar.gz`，SHA-256 为 `da1eabab33a41972777f20823d103f7de77e59d1a80d850a9c1fb98274dfd611`。

## 剩余限制

- 工作树仍未提交，因此最终门禁使用 `--allow-dirty`，不能把本轮部署表述为已合并或已发布 Git tag。
- P8 架构目标仍按门禁定义保留理论性 `PASS_WITH_LIMITS`；它不影响本轮 HTTPS、服务器或 Android 生产链路。
- Vite production build 仍有单 chunk 超过 500 kB 告警，应由真实冷启动数据决定拆包优先级。
