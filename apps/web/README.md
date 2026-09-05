# apps/web

面向人的 AISR Atlas Web 客户端。

当前进入 **Online Experience V0.3（在线体验 V0.3）**。Workbench V0.2（工作台 V0.2）已经验证的 Canvas / Draft / Diff / Publish 交互保持不变，本阶段重点是把状态从浏览器本地存储接到 Atlas API + Cloudflare D1。

当前体验包括：

- Header（顶部栏）中的 Workspace（工作区）选择与 Published / Draft 状态；
- Header 以下全部空间由 Canvas（画布）占用；
- Published Revision（已发布修订版本）作为默认查看态；
- Unit（单元）拖动、Resize（调整大小）、Collapse / Expand（折叠 / 展开）只修改 Personal Layout（个人布局）；
- 多层 Containment（包含关系）与 Relationship（关系）连线；
- Unit Inspector（单元检查器）按 Definition / Runtime / Work（三类状态）展示 Facet（侧面）；
- Draft 中新增 Unit，并通过拖线创建 Relationship；
- Relationship Inspector（关系检查器）支持查看、编辑与删除；
- Published ↔ Draft Diff（差异）；
- 用户显式 Publish（发布）形成新 Revision（修订版本）；
- Local Storage Adapter（本地存储适配器）用于普通本地开发；
- Remote API Adapter（远程 API 适配器）用于在线部署；
- 在线模式通过 API Storage Version（存储版本）避免不同浏览器会话静默覆盖新状态；
- Reset（重置）恢复 Atlas 的多层 Synthetic Seed（合成种子）。

## 本地运行

在仓库根目录：

```bash
npm install
npm run dev
```

默认打开 `http://localhost:5173`，使用 Local Storage Adapter，不需要 Cloudflare 资源。

## 在线模式

在线构建显式启用 Remote API Adapter：

```bash
VITE_ATLAS_PERSISTENCE=remote npm run build
```

默认请求同源：

```text
/api/v1/workspaces/atlas/state
```

如果确实需要把 Web 与 API 分开运行，可以在构建时额外设置公开的 `VITE_ATLAS_API_BASE_URL`；V0.3 推荐同一个 Cloudflare Worker 承载 API 与 Static Assets，从而避免不必要的 CORS 和双部署复杂度。

Remote 模式启动时必须先成功读取在线状态。API 不可用时页面会明确显示初始化失败，不会静默切回 Local Storage 并制造第二份事实源。

## 数据边界

Web 只负责呈现和交互，不拥有 Canonical Model（规范模型）的最终校验权。在线写入会再次经过 `apps/api`，并复用 `packages/domain` 的领域校验。

Header 已预留 Workspace Selector（工作区选择器），但 V0.3 在线体验仍只提供 `Atlas` 一个 Workspace。Web 不得通过 XY 坐标、尺寸或折叠状态推导或隐式修改 Canonical Model。
