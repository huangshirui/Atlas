# Online Experience V0.3（在线体验 V0.3）

> 状态：In Progress

## 1. 目标

Online Experience V0.3 把 Workbench V0.2 从“浏览器本地试玩”推进为“可在线长期使用的最小闭环”。

本阶段不重新设计 Domain Schema V0.1，也不继续扩大 Canvas 功能面。重点是建立 Web → Atlas API → D1 的真实持久化链路，同时保持已经验证的领域语义不变。

目标闭环：

```text
Human Browser
    │
    ▼
Atlas Web
    │ same-origin /api
    ▼
Atlas API (Cloudflare Worker)
    │
    ▼
Cloudflare D1
```

Web 与 API 可以由同一个 Cloudflare Worker 部署：Worker 处理 `/api/*`，Static Assets（静态资源）承载 Vite 构建后的 Web。部署访问保护优先使用 Cloudflare Access，但 Access 不进入 Atlas Domain Model。

## 2. V0.3 验收目标

V0.3 至少应完成：

1. Atlas API 可以读取当前 Workspace 的在线体验状态；
2. D1 在首次访问时可以安全初始化 Synthetic Seed（合成种子数据）；
3. Web 可以从 API 加载 Published / Draft / Layout / Runtime State / Work State；
4. Web 的现有编辑、布局和 Publish 行为可以持久化到 D1；
5. 页面刷新、关闭浏览器后重新打开，状态仍然存在；
6. API 在写入前复用 `packages/domain` 的领域校验，而不是信任 Web；
7. 写入带 Optimistic Concurrency（乐观并发控制），避免不同标签页静默覆盖较新的在线状态；
8. 本地开发仍可使用 Local Storage Adapter（本地存储适配器），在线部署显式切换为 Remote API Adapter（远程 API 适配器）；
9. API 与 Web 保持同源部署能力，避免为 V0.3 引入额外 CORS 和独立前端托管复杂度；
10. 所有公开仓库中的部署配置只包含安全占位符，不提交 Cloudflare Account / Resource ID、Token 或其他线上基础设施敏感信息。

## 3. V0.3 明确不做

- 多用户账号体系；
- Atlas 自建认证；
- Workspace 权限矩阵；
- 多个并行 Draft；
- 产品内审批流；
- MCP / Tool 正式上线；
- GitHub / Cloudflare / n8n 等 Adapter 自动同步；
- Runtime / Work State 的自动采集；
- 完整 Revision 历史浏览 UI；
- 把 D1 表结构一次性正规化为最终领域数据库。

V0.3 先以受校验的 Workspace Experience Snapshot（工作区体验快照）建立在线持久化闭环。后续 API / MCP 能力扩展时，再按照 Domain Boundary（领域边界）逐步拆分为独立的 Draft、Revision、Layout、State、Change Log 存储模型，而不要求 Web 再次改变产品语义。

## 4. 持久化边界

### 4.1 Canonical source while online（在线事实源）

当 Web 运行在 Remote API Adapter 模式时：

- D1 中的 Atlas API 状态是当前在线体验的事实源；
- Browser Local Storage 不作为在线状态的第二事实源；
- API 不可用时，Web 应明确显示失败，而不是静默切回本地并形成分叉状态。

### 4.2 Local development（本地开发）

普通 `npm run dev` 继续使用 Local Storage Adapter，便于无需 Cloudflare 资源即可开发 UI / Domain。

Remote API Adapter 必须显式启用，避免开发环境误写线上数据。

## 5. Online state envelope（在线状态信封）

V0.3 API 对 Web 返回：

```json
{
  "workspace_id": "atlas",
  "version": 1,
  "state": {}
}
```

其中：

- `state` 使用 Domain 当前的 Experience State 结构；
- `version` 是存储层乐观并发版本，不等于 Published Revision Number；
- 客户端更新时携带它读取到的 `version`；
- 如果服务器版本已经变化，API 返回 `409 Conflict`，客户端必须重新读取，不允许静默覆盖。

## 6. API 表面

V0.3 最小 API：

```text
GET    /api/v1/health
GET    /api/v1/workspaces/:workspaceId/state
PUT    /api/v1/workspaces/:workspaceId/state
POST   /api/v1/workspaces/:workspaceId/reset
```

`reset` 仅用于当前体验阶段恢复 Synthetic Seed；Web 必须在调用前取得用户明确确认。

这些 Endpoint（端点）是 Online Experience V0.3 的持久化表面，不等同于最终 MCP / Tool Contract（工具契约）。后续仍应按 `docs/mcp-tool-surface-v0.1.md` 的 Query / Mutation 语义逐步演进。

## 7. 部署边界

推荐一个 Worker 承载：

```text
Atlas Worker
├── /api/*  → Worker code
└── /*      → Static Assets (apps/web/dist)

Binding
└── DB      → Cloudflare D1
```

Cloudflare Access 作为部署入口的访问保护层。Atlas V0.3 不把 Access identity、policy 或 session 复制到 Domain Model 中。

仓库只提供可公开的 `wrangler.example.toml`。真实 `database_id` 等部署值必须通过私有部署配置或 CI Secret 注入，不得进入 Git 历史。

## 8. 后续判断点

Online Experience V0.3 完成并实际使用后，再根据使用体验决定下一阶段优先级：

- API Domain Mutation（领域变更 API）正规化；
- MCP / Tool；
- Revision / Change Log 历史查询；
- GitHub / Cloudflare 等 Adapter；
- Runtime / Work State 自动投影；
- 多用户 / Workspace 授权。
