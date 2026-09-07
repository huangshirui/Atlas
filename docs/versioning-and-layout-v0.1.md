# V0.1 版本、草稿与布局规则

## 1. 三层分离

AISR Atlas V0.1 必须严格区分三类数据：

### 1.1 规范模型（Canonical Model）

回答：**系统是什么？**

包括 Unit、Type、Containment、Relationship 以及定义性 Facet / 属性。

### 1.2 视图 / 布局状态（View / Layout State）

回答：**当前怎么看、画在哪里？**

包括：

- `x / y`
- `width / height`
- `collapsed`
- `viewport`
- 其他纯展示状态

### 1.3 动态 / 工作状态（Dynamic / Work State）

回答：**系统现在怎么样、谁正在做什么？**

包括 Runtime、Health、Deployment、Alert、Incident、Issue、PR、Human / AI Work Session 等高频变化。

## 2. 三条硬规则

> **Model answers what the system is.**  
> 模型（Model）决定系统是什么。

> **Layout answers where it is drawn.**  
> 布局（Layout）决定画在哪里。

> **View answers what the user wants to see.**  
> 视图（View）决定当前看什么。

以及：

> **Position is not semantics.**  
> 位置不是语义。

## 3. Canvas 拖动与 Layout 编辑规则

Canvas 的浏览状态与 Layout 编辑必须显式区分。

默认状态为 **Layout Locked（布局锁定）**：

- Unit 不可拖动、Resize 或 Collapse / Expand；
- 主按钮拖动用于平移 Canvas，以查看当前图谱的不同区域；
- 浏览过程中的临时 Viewport 移动不应被误认为 Unit Layout 修改。

只有用户显式执行 **Unlock Layout（解锁布局）** 后，才进入 Layout 编辑态：

- 拖动 Unit、调整尺寸、展开 / 折叠只修改 Layout；
- 这些操作不得改变 Parent、Type、Containment、Relationship 或其他 Canonical Model 数据；
- Layout 编辑态中的变化先进入当前 Web 会话的未保存 Working Copy（工作副本），不得因为拖动完成就自动持久化；
- 用户显式执行 `Save Layout` 后，才覆盖当前 Model Target 已保存的唯一 Layout，并将该版本作为继续编辑时新的恢复基线；
- 用户执行 `Restore` 时，丢弃自最近一次 `Save Layout` 以来尚未保存的 Layout 变化，恢复到最近一次保存的 Layout；
- 如果用户在存在未保存 Layout 变化时重新锁定，应显式确认是否丢弃，而不是静默保存。

Layout 的 Lock / Unlock、Save、Restore 属于 Canvas 操作，应与 Zoom / Fit View 放在 Canvas Controls，而不是持续占用 Workspace Header。

不得因为以下行为隐式改变 Canonical Model：

- 把 Unit 拖进另一个大框；
- 把两个 Unit 拖近；
- 调整 Unit 大小；
- 展开 / 折叠；
- 改变 Zoom / Viewport。

如果要修改 Parent / Containment、Relationship、Type 或定义性属性，必须走显式语义修改操作。

## 4. Parent 与视觉容器

虽然“视觉位置不决定语义”，但为了避免图看起来与模型矛盾，V0.1 约束：

- Child Unit 只能在 Parent 的视觉容器内移动；
- Child 超出可用空间时，Parent 视觉容器自动扩展；
- 移动 Parent 时，Child 作为整体随 Parent 移动；
- Child 的位置优先保存为相对 Parent 的坐标。

## 5. Draft 模型

每个 Workspace 同时只有：

```text
Published Revision N
        │
        ▼
Current Draft
```

Draft 是一个可变工作副本。

人或 AI 可以多次修改 Draft：

```text
Published Revision 18
        │
        ▼
Draft
  change A
  change B
  change C
        │
        ▼
Publish
        │
        ▼
Published Revision 19
```

`change A/B/C` 不分别产生正式 Revision。

## 6. Change Log 与 AI 上下文

Draft 持续记录 Change Log（变更日志），但 **Change Log 不属于 AI 每次读取 Draft 时的默认负载**。

默认读取：

```text
Workspace
Current Draft（最新完整状态）
```

按需读取：

```text
Draft Change Log
Published ↔ Draft Diff
Revision A ↔ Revision B Diff
```

这样既保留可追溯性，也避免历史变更持续占用 AI 上下文。

## 7. Publish 规则

V0.1 不做复杂审批流。

Publish 的唯一硬要求：**必须来自用户明确指令。**

允许：

- 用户在 Web 点击“发布”；
- 用户在 ChatGPT / 其他 AI 中明确说“发布当前草稿”，AI 再调用 MCP / Tool 执行 Publish。

不允许：

- AI 根据自己的判断自动发布；
- Adapter / Automation 在没有用户明确授权的情况下发布定义性模型。

## 8. Revision

Published Revision 是不可静默覆盖的正式系统版本。

至少应保留：

```yaml
revision_id:
parent_revision:
actor:
timestamp:
source:
rationale:
change_set:
```

支持比较：

- Published Revision A ↔ Published Revision B；
- Published Revision ↔ Current Draft。

## 9. 单一 Layout（Single Layout）

V0.1 每个可查看的 Model Target 只维护 **一份持久化 Layout**：

```text
Model Target
└── Layout
```

不再区分 Default Layout / Personal Layout，也不在 Layout 上保存 `kind: default | personal` 或个人 `owner`。

这样做的原因是当前真实使用中尚未出现“同一个 Model Target 必须同时维护共享默认 XY 与每用户独立 XY”的需求。提前保留两套 Layout 会增加保存、恢复、发布和 Tool 契约复杂度，却没有产生对应价值。

初始 Layout 可以由 AI、Human 或导入过程生成；一旦保存，它就是该 Model Target 当前唯一 Layout。将来若真实多用户场景证明需要个人覆盖，可以在后续版本新增可选 Personal Override，而不是在 V0.1 预设两套布局。

## 10. Draft Working Layout 与 Revision Layout

Layout 必须显式绑定一个 Model Target：

```text
Published Revision 18 ── Layout 18
Active Draft          ── Working Layout
```

### Draft Working Layout（草稿工作布局）

Active Draft 必须允许持久化 Working Layout，否则新增 Unit 在 Publish 前无法完成位置调整和 Review。Draft Working Layout 与当前 Draft 一起变化，但仍与 Canonical Model 分离；拖动只改 Layout，不改 Parent / Relationship / Type。

Web 解锁后的未保存 Layout Working Copy 只是交互缓冲，不是第二份领域 Layout。只有显式 `Save Layout` 后，它才覆盖 Active Draft 当前保存的 Working Layout。

### Publish 时固化布局

Publish 形成新 Revision 时，将当前 Draft 已保存的 Working Layout 固化为新 Revision 的 Layout 起点。这个动作属于 Draft → Revision 的同一次发布生命周期。

### 不做跨 Published Revision 自动迁移

V0.1 仍不实现两个 Published Revision 之间的自动 Layout Migration（布局迁移）：

```text
Revision 18 / Layout 18
Revision 19 / Layout 19
```

系统不要求在 Revision 19 生成后，再智能推断如何把 Revision 18 的布局迁移过去。新 Revision 的布局来自发布前已经与 Draft 对齐的 Working Layout，从而保持行为明确、可预测。

## 11. Viewport 与未来个性化

Pan / Zoom 等浏览位置首先属于当前 View / Session 体验，不要求因此复制整份结构 XY Layout。

如果未来多用户真实需求主要是“每个人看不同区域、Zoom 不同、展开信息不同”，应优先通过 View / Session 状态解决，而不是默认复制整份 Unit Layout。

## 12. Dynamic / Work State

以下变化不产生 Definition Revision：

- CPU / 延迟 / 错误率变化；
- Running → Degraded → Running；
- Alert / Incident；
- 部署状态；
- 开发进度；
- Issue / PR 状态；
- AI 开始或结束 Work Session。

使用 Event（事件）、Snapshot（快照）、Timeline（时间线）保存历史。
