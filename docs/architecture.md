# AISR Atlas 系统架构边界

## 1. 独立项目

AISR Atlas 是独立项目，不以 LifeSpace 作为基础底座（Foundation）。

原因：Atlas 是观察和协调整个系统族的元系统 / 控制面（Meta-system / Control Plane），而 LifeSpace 本身也是 Atlas 的被观察对象之一。

关键原则：

> **The system being observed must not be required for the observability / control plane to operate.**  
> 被观察系统不能成为观察 / 控制面运行的必需依赖。

因此：

- LifeSpace 故障时，Atlas 仍应能够打开并展示其状态；
- ALOHA、HomeMew、Relay、n8n 等也不应成为 Atlas 的启动前置条件；
- 反过来，业务系统也不应把 Atlas 放进核心运行请求链路。

## 2. V0.1 逻辑结构

```text
Human / AI Clients
       │
       ├── Web
       └── MCP / Tool
              │
              ▼
        AISR Atlas API
              │
      ┌───────┼────────┐
      ▼       ▼        ▼
   Domain   Layout   State
   Model    Model    Model
      │
      ▼
Workspace / Unit Graph
Draft / Revision / Diff
```

## 3. 仓库模块边界

### `apps/web`

面向人的 Canvas（画布）与 View（视图）。负责可视化与交互，不拥有 Canonical Model 的业务规则。

### `apps/api`

Atlas API / 后端控制面。负责持久化、领域操作、Revision、Layout、State 等服务入口。

Online Experience V0.3（在线体验 V0.3）先在这里实现最小 Cloudflare Worker + D1 持久化边界。V0.3 可以暂时保存经过领域校验的 Workspace Experience Snapshot（工作区体验快照），但这只是在线闭环的存储形态，不得被误认为最终领域数据库已经定型。

### `packages/domain`

最核心模块。负责：

- Workspace / Unit / Relationship / Facet 等领域类型；
- V0.1 Invariants（不变量）；
- Draft / Publish / Diff 规则；
- Definition / Runtime / Work 三类数据边界；
- Schema 校验。

UI 和 MCP 都不应绕过 Domain Rule 直接改变模型语义。Online Experience V0.3 的 API 写入同样必须复用这里的校验，而不能仅依赖 Web 校验。

### `packages/mcp`

面向 ChatGPT、其他 AI / Agent 的 MCP / Tool 接口。

原则：AI 直接读取结构化 Model，不通过视觉识别理解架构。

### `packages/adapters`

GitHub、Cloudflare、n8n、Observability 等外部事实源适配器。

V0.1 只留边界，不要求自动接入完成。

### `schemas`

对外稳定的机器可读 Schema。Schema 版本与应用代码版本解耦管理。

## 4. Online Experience V0.3 部署方向

当前实现方向：

- Web：React + React Flow；
- API：Cloudflare Worker；
- 持久化：Cloudflare D1；
- Static Assets（静态资源）：与 API 由同一个 Worker 部署；
- 访问保护：优先 Cloudflare Access；
- AI 接入：MCP / Tool 在后续阶段正式落地。

推荐拓扑：

```text
Browser
  │
  ▼
Cloudflare Access
  │
  ▼
Atlas Worker
  ├── /api/*  ──> Worker code ──> D1
  └── /*      ──> Static Assets
```

使用同一个 Worker 承载 API 与 Web 是 V0.3 的部署简化，不是领域耦合：Web 与 API 在代码结构上仍保持 `apps/web` / `apps/api` 分离。未来如果出现独立扩缩容、跨客户端 API 或其他部署需要，可以在不改变 Domain Model 的前提下重新拆分部署单元。

Cloudflare Access 是部署入口的访问保护层，不属于 Canonical System Model 的用户 / 权限语义。V0.3 不复制 Access Policy、Session 或 Cloudflare 资源标识到领域模型。

公开仓库不得保存真实 `database_id`、Account / Resource ID、Token、Access 配置或其他私有基础设施信息。仓库只保留安全的部署模板。

这些实现选择不得反向污染领域模型。例如 Unit 不应包含 React Flow 的 Shape 配置，D1 的表结构也不应定义领域语义本身。

## 5. 事实所有权

Atlas 拥有：

- Canonical System Graph（规范系统图谱）；
- Draft / Published Revision；
- Diff / Change Log；
- Layout；
- Unit 与外部事实源的映射；
- Atlas 自身的 Runtime / Work State 投影。

外部系统继续拥有各自事实：

- GitHub：代码、Issue、PR、CI；
- Notion：文档、计划、决策；
- Cloudflare / Runtime：部署和运行事实；
- n8n：工作流运行事实；
- 其他监控系统：Metrics / Logs / Alerts / Incidents。

Atlas 连接和投影这些事实，而不是复制并取代所有外部系统。
