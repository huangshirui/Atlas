# AISR Atlas

AISR Atlas 是面向人类（Human）与 AI 共同使用的系统地图 / 协作控制面（System Atlas / Collaboration Control Plane）。

它统一描述和呈现一个工作区（Workspace）中的：

- 架构（Architecture）
- 开发（Development）
- 部署（Deployment）
- 运行（Runtime）
- 运维（Operations）
- 人机协作（Human-AI Collaboration）

> **One shared system model, readable and operable by humans and AI.**  
> 人与 AI 共享同一份系统模型；人通过画布理解和操作，AI 通过结构化模型与 MCP / Tool（模型上下文协议 / 工具）理解和更新。

## V0.1 核心目标

V0.1 不追求成为完整的研发、监控或白板平台，而是先验证最关键的闭环：

**工作区（Workspace） → 单元图谱（Unit Graph） → 草稿（Draft） → 视图 / 布局（View / Layout） → 差异（Diff） → 发布（Publish） → 修订版本（Revision）**

核心原则：

- Atlas 的核心不是“画图”，而是维护规范系统图谱（Canonical System Graph）。
- 模型（Model）决定“系统是什么”；视图（View）决定“当前看什么”；布局（Layout）决定“画在哪里”。
- 画布拖动、调整大小和折叠只改变布局，不隐式改变架构语义。
- 定义性数据（Definition）进入草稿 / 修订版本；运行性数据（Runtime State）和工作性数据（Work State）进入当前状态 / 事件 / 时间线。
- AI 默认读取最新草稿，不强制加载完整变更日志（Change Log）；需要追溯时再主动查询。
- 发布（Publish）必须来自用户明确指令；AI 不得自行决定发布。

## 立即体验

当前正式进入 **Online Experience V0.3（在线体验 V0.3）**。Workbench V0.2（工作台 V0.2）已经完成 Canvas-first（画布优先）的核心交互，本阶段开始把浏览器本地体验接到真实的 Atlas API + Cloudflare D1 持久化链路。

```bash
npm install
npm run dev
```

普通本地开发继续使用 Local Storage Adapter（本地存储适配器），不依赖 Cloudflare。在线构建显式启用 Remote API Adapter（远程 API 适配器）：

```bash
VITE_ATLAS_PERSISTENCE=remote npm run build
```

当前体验包含：

- Header（顶部栏）中的 Workspace（工作区）选择与 Published / Draft 状态；
- 全宽 Canvas（画布）与真实多层 Atlas 自描述结构；
- Unit（单元）拖动、Resize（调整大小）、Collapse / Expand（折叠 / 展开），均只修改 Personal Layout（个人布局）；
- Unit Inspector（单元检查器）中的 Definition / Runtime / Work（三类状态）与 Facet（侧面）展示；
- Draft 中新增 Unit，并通过拖线创建 Relationship（关系）；
- Relationship Inspector（关系检查器）查看、编辑与删除关系；
- Published ↔ Draft Diff（差异）与用户显式 Publish（发布）；
- Local Storage Adapter 用于无需云资源的本地开发；
- Remote API Adapter + Atlas API + D1 用于在线持久化体验；
- Storage Version（存储版本）乐观并发控制，防止不同浏览器会话静默覆盖更新；
- Domain behavior validation（领域行为验证）继续覆盖图不变量、布局语义、关系、Facet、Draft 同步与 Publish 生命周期，并增加 Online Experience 状态边界校验。

Online Experience V0.3 当前先使用经过 Domain 校验的 Workspace Experience Snapshot（工作区体验快照）建立在线闭环；它不是最终领域数据库结构。后续会按实际使用逐步拆分 Draft、Revision、Layout、State、Change Log 等存储和 API 边界，而不改变已经验证的产品语义。

## 仓库结构

```text
apps/
  web/          面向人的画布与视图
  api/          Atlas API / 控制面后端
packages/
  domain/       领域模型、校验与核心规则
  mcp/          面向 AI 的 MCP / Tool 能力
  adapters/     外部事实源适配器（V0.1 后逐步接入）
schemas/
  v0.1/         V0.1 机器可读 Schema
docs/
  requirements-v0.1.md
  domain-model-v0.1.md
  versioning-and-layout-v0.1.md
  mcp-tool-surface-v0.1.md
  architecture.md
  online-experience-v0.3.md
  github-hardening.md
```

## 文档基线

- [V0.1 需求基线](docs/requirements-v0.1.md)
- [V0.1 领域模型](docs/domain-model-v0.1.md)
- [版本与布局规则](docs/versioning-and-layout-v0.1.md)
- [MCP / Tool 能力边界](docs/mcp-tool-surface-v0.1.md)
- [系统架构边界](docs/architecture.md)
- [Online Experience V0.3](docs/online-experience-v0.3.md)
- [GitHub 公开仓库加固基线](docs/github-hardening.md)
- [V0.1 Machine-readable Schema（机器可读模式）](schemas/v0.1/README.md)

## 开源许可（License）

AISR Atlas 采用 **GNU Affero General Public License v3.0 or later（GNU Affero 通用公共许可证第 3 版或更高版本）**，SPDX 标识为 `AGPL-3.0-or-later`。

Copyright (C) 2026 Shirui Huang.

完整许可文本见 [`LICENSE`](LICENSE)。如引入第三方代码或资产，请先确认其许可与 Attribution（署名）要求与本项目兼容。

## 安全（Security）

这是一个 Public Repository（公开仓库）。仓库只保存适合永久公开的源代码、公开文档和 Synthetic Data（合成数据）。不得提交真实用户数据、Secret / Credential（密钥 / 凭据）、生产日志、数据库导出、私有 Connector 输出或不应公开的线上基础设施信息。

Online Experience V0.3 的真实 Cloudflare D1 `database_id`、Account / Resource ID、Token 与部署专用配置同样不得进入 Git 历史；仓库只跟踪安全的示例配置。

敏感漏洞不要通过公开 Issue / PR 披露，详见 [`SECURITY.md`](SECURITY.md)。Human / AI Contributor（人类 / AI 贡献者）的完整安全规则见 [`AGENTS.md`](AGENTS.md)。

## 参与贡献（Contributing）

提交改动前请阅读 [`AGENTS.md`](AGENTS.md) 和 [`CONTRIBUTING.md`](CONTRIBUTING.md)。领域语义变更应保持 Domain-first（领域优先），同步维护相关 Baseline Doc / Schema / Test（基线文档 / 模式 / 测试）。

默认分支 `main` 的目标保护策略是 Pull Request + Required CI + Resolved Review Conversation + Squash Merge（拉取请求 + 必需持续集成 + 解决评审讨论 + 压缩合并）。仓库侧设置基线见 [`docs/github-hardening.md`](docs/github-hardening.md)。

## 当前阶段

当前正式进入 **Online Experience V0.3（在线体验 V0.3）**。Domain Schema V0.1（领域数据模式 V0.1）继续作为机器契约基线，Workbench V0.2 的 Canvas / Layout / Relationship / Facet / Definition-Runtime-Work 交互语义保持稳定；V0.3 聚焦 Atlas API、D1 持久化、同源 Worker 部署与真实在线使用闭环。
