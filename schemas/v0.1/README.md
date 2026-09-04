# schemas/v0.1

AISR Atlas V0.1 的 Machine-readable Schema（机器可读模式）目录。

## Standard（标准）

全部 Schema 使用 **JSON Schema Draft 2020-12（JSON 模式 2020-12 草案）**。

## Files（文件）

- `common.schema.json`：稳定 ID、Actor（操作者）、Source（来源）、自定义类型定义等公共结构；
- `workspace.schema.json`：Workspace（工作区）生命周期元数据；
- `unit.schema.json`：Unit（单元）；
- `relationship.schema.json`：Relationship（关系），与 Containment（包含关系）分离；
- `facet.schema.json`：Facet（侧面）及其 `definition / runtime / work` 状态类别；
- `canonical-model.schema.json`：Canonical Model（规范模型）完整语义快照；
- `draft.schema.json`：Active Draft（活动草稿），不内嵌完整 Change Log（变更日志）；
- `revision.schema.json`：Published Revision（已发布修订版本）；
- `change-log-entry.schema.json`：单次可归因的定义性 Mutation（变更）；
- `layout.schema.json`：Default / Personal Layout（默认 / 个人布局）；
- `runtime-state.schema.json`：Runtime State（运行性当前状态）；
- `work-state.schema.json`：Work State（工作性当前状态）。

## Boundary（边界）

Schema 负责单文档的数据形状和可组合引用；以下 Graph Invariants（图级不变量）由 `packages/domain` 的统一 Validation（校验）负责，而不是伪装成 JSON Schema 已经保证：

- 每个 Workspace 恰好一个 Root Unit（根单元）；
- 除 Root 外每个 Unit 恰好一个有效 Parent（父级）；
- Containment（包含关系）无环；
- Relationship 两端 Unit 存在且属于同一 Workspace；
- 稳定 ID 在对应作用域唯一；
- Custom Type（自定义类型）必须先在 Canonical Model 的 `custom_types` 注册；
- Default / Personal Layout 的唯一性与 Owner（所有者）约束；
- Layout 中的 Unit 必须属于目标 Draft / Revision（草稿 / 修订版本）。

## Definition / Runtime / Work（三类数据）

`facet.schema.json` 使用 `state_class` 明确一个 Facet 属于：

- `definition`：进入 Draft / Revision；
- `runtime`：进入 Runtime State；
- `work`：进入 Work State。

`canonical-model.schema.json` 只接受 `definition` Facet；Runtime / Work Schema 分别只接受自己的状态类别。

## Draft Working Layout（草稿工作布局）

为了让新增 Unit、拖动和发布前 Review（评审）可持久化，`layout.schema.json` 的 `target` 可以指向：

- `draft`：Active Draft 的 Working Layout（工作布局）；
- `revision`：Published Revision 的正式 Layout（正式布局）。

Publish（发布）时将当前 Draft Working Layout 固化到新 Revision。V0.1 仍不进行两个 Published Revision 之间的自动 Layout Migration（布局迁移）。

## Examples（样例）

`examples/` 使用 Atlas 自身公开仓库结构作为最小 self-describing example（自描述样例）。示例时间、Actor ID 和工作条目均为 Synthetic Data（合成数据），不包含私人或线上基础设施信息。

## Validation（校验）

```bash
python scripts/validate-schemas.py
```

CI（持续集成）会校验全部 Schema 本身以及已提交样例。
