# apps/api

AISR Atlas API / 控制面后端（Control Plane Backend）。

Online Experience V0.3（在线体验 V0.3）开始把本目录从占位边界推进为可运行的 Cloudflare Worker + D1 后端。

## V0.3 职责

- 为 Web 提供当前 Workspace Experience State（工作区体验状态）的在线持久化入口；
- 首次读取时使用 `packages/domain` 的 Synthetic Seed（合成种子）初始化；
- 写入前复用 Domain Validation（领域校验），不信任客户端提交的任意状态；
- 使用独立 Storage Version（存储版本）进行 Optimistic Concurrency（乐观并发控制）；
- 为在线体验提供显式 Reset（重置）；
- 与 Web Static Assets（静态资源）由同一个 Worker 同源部署。

V0.3 仍然不是最终 API / MCP Contract（契约）。当前先持久化受校验的 Workspace Experience Snapshot（工作区体验快照），后续再按 Draft / Revision / Layout / State / Change Log 的领域边界逐步正规化。

## API

```text
GET    /api/v1/health
GET    /api/v1/workspaces/atlas/state
PUT    /api/v1/workspaces/atlas/state
POST   /api/v1/workspaces/atlas/reset
```

在线状态响应包含：

```json
{
  "workspace_id": "atlas",
  "version": 1,
  "state": {}
}
```

`version` 是存储并发版本，不是 Published Revision Number（已发布修订号）。更新时必须带回客户端读取到的版本；版本冲突返回 `409 Conflict`，禁止静默覆盖。

## D1

迁移文件：

```text
migrations/0001_workspace_experience_state.sql
```

V0.3 只建立一个最小 `workspace_experience_state` 表。它用于验证在线产品闭环，不代表最终领域数据库已经定型。

## Worker 配置

公开仓库只跟踪：

```text
wrangler.example.toml
```

真实部署时在本地复制为：

```text
wrangler.toml
```

该文件已被 `.gitignore` 忽略。必须在私有配置中填入真实 D1 `database_id`，不得把 Cloudflare Account / Resource ID、Token、Secret 或其他私有基础设施值提交进 Git 历史。

Worker 配置使用：

- `DB`：D1 binding；
- `ASSETS`：`apps/web/dist` Static Assets binding；
- `/api/*`：优先进入 Worker；
- 其他路径：SPA Static Assets。

Cloudflare 当前 Workers Static Assets 支持 `not_found_handling = "single-page-application"` 和 `run_worker_first = ["/api/*"]`，因此 V0.3 不需要拆成独立 Pages + API Worker。

## 迁移与部署方向

远端 D1 migration 可通过 Wrangler 的 `d1 migrations apply <binding-or-database> --remote` 执行。部署前 Web 应以 Remote API Adapter（远程 API 适配器）构建：

```bash
VITE_ATLAS_PERSISTENCE=remote npm run build
```

然后从 `apps/api` 的私有 Wrangler 配置部署 Worker。

访问保护优先在 Cloudflare Access 层完成；V0.3 不把 Access Policy / Session 复制进 Atlas Domain Model。
