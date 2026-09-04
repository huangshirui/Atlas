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
- 画布拖动只改变布局，不隐式改变架构语义。
- 定义性数据（Definition）进入草稿 / 修订版本；运行性数据（Runtime State）和工作性数据（Work State）进入当前状态 / 事件 / 时间线。
- AI 默认读取最新草稿，不强制加载完整变更日志（Change Log）；需要追溯时再主动查询。
- 发布（Publish）必须来自用户明确指令；AI 不得自行决定发布。

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
  v0.1/         V0.1 机器可读 Schema（待定义）
docs/
  requirements-v0.1.md
  domain-model-v0.1.md
  versioning-and-layout-v0.1.md
  mcp-tool-surface-v0.1.md
  architecture.md
```

## 文档基线

- [V0.1 需求基线](docs/requirements-v0.1.md)
- [V0.1 领域模型](docs/domain-model-v0.1.md)
- [版本与布局规则](docs/versioning-and-layout-v0.1.md)
- [MCP / Tool 能力边界](docs/mcp-tool-surface-v0.1.md)
- [系统架构边界](docs/architecture.md)

## 当前阶段

当前处于 **V0.1 领域 Schema（Domain Schema）设计前的基线阶段**。下一步应先用真实 AISR 架构验证 Workspace / Unit / Containment / Relationship / Facet / Draft / Revision / Layout 等模型，再进入 Web 与 API 实现。
