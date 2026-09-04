# apps/web

面向人的 AISR Atlas Web 客户端。

当前 **Workbench V0.2（工作台 V0.2）** 已提供更接近日常使用的 Canvas-first（画布优先）体验：

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
- 浏览器 Local Storage Adapter（本地存储适配器）保存体验数据；
- Reset（重置）恢复 Atlas 的多层自描述样例。

## 本地运行

在仓库根目录：

```bash
npm install
npm run dev
```

默认打开 `http://localhost:5173`。

## 当前刻意限制

Local Storage Adapter 仅用于尽快验证产品交互，不是最终事实存储。后续接入 `apps/api` + Cloudflare D1（控制面 API + 数据库）时，应保持 Domain（领域）与 Web 交互语义不变。

当前 Header 已预留 Workspace Selector（工作区选择器），但本地体验种子目前只提供 `Atlas` 一个 Workspace。Web 只负责呈现和交互，不得通过 XY 坐标、尺寸或折叠状态推导或隐式修改 Canonical Model（规范模型）。
