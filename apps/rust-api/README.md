# Job Sprint Rust API

Rust 后端最小可运行切片，用 SQLite 持久化 Job Sprint runtime 数据，目标替代现有 Node runtime API 的核心合同。

## 已覆盖 API

- `GET /api/health`
- `GET /api/auth/session`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET|POST /api/runtime`
- `GET|POST /api/progress`
- `GET|POST /api/reviews`
- `GET|POST /api/applications`
- `PUT|DELETE /api/applications/{id}`
- `GET|POST /api/interview-mistakes`
- `DELETE /api/interview-mistakes/{id}`

同时支持 `/job-sprint/api/...` 前缀、session cookie、Bearer token、`kai/guest` 这类多用户 `dataScope` 隔离，以及 viewer 只读权限。

## 本地运行

从仓库根目录运行：

```bash
HOST=127.0.0.1 \
PORT=8000 \
JOB_SPRINT_DB_PATH=apps/rust-api/data/runtime.sqlite \
JOB_SPRINT_AUTH_USER=kai \
JOB_SPRINT_AUTH_PASSWORD=change-me \
JOB_SPRINT_SESSION_SECRET=please-use-at-least-32-characters \
cargo run --manifest-path apps/rust-api/Cargo.toml
```

从 `apps/rust-api` 目录运行：

```bash
cargo run
```

SQLite 路径优先级：

1. `DATABASE_URL`，例如 `sqlite:///tmp/job-sprint-runtime.sqlite`
2. `JOB_SPRINT_RUNTIME_DB_PATH`
3. `JOB_SPRINT_DB_PATH`
4. `RUNTIME_DB_PATH`
5. `apps/rust-api/data/runtime.sqlite`

Schema 说明：

- 当前服务启动时通过 `init_db()` 幂等创建 `users` 与 `runtime_items` 两张表。
- `migrations/001_init.sql` 与运行时 schema 保持镜像，供外部初始化、审计和后续接入正式迁移器时复用。

认证配置兼容：

- 单用户：`JOB_SPRINT_AUTH_USER` + `JOB_SPRINT_AUTH_PASSWORD` 或 `JOB_SPRINT_AUTH_PASSWORD_SHA256`
- 多用户：`JOB_SPRINT_USERS_JSON` 或 `JOB_SPRINT_USERS_FILE`
- Bearer：`JOB_SPRINT_BEARER_TOKENS_JSON` 或 `JOB_SPRINT_BEARER_TOKENS_FILE`
- 本地免登录：`JOB_SPRINT_AUTH_DISABLED=true`

## 验证

```bash
cargo fmt --manifest-path apps/rust-api/Cargo.toml -- --check
cargo clippy --manifest-path apps/rust-api/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path apps/rust-api/Cargo.toml
cargo build --release --manifest-path apps/rust-api/Cargo.toml
```

本地 coach runtime 的最小诊断 smoke（临时端口与临时 SQLite，不读取真实账号或 provider 配置）：

```bash
npm run test:rust-coach-runtime
```

该命令只证明 Rust API、`/api/coach/artifacts` 的 fallback schema 和 `llm_runs` 临时读回可用；`provider_not_configured` 是预期诊断，不代表真实模型已配置或远端 AI 调用通过。
