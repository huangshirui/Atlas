# packages/domain

AISR Atlas 的核心领域模型（Domain Model）与规则层。

当前 **Usable Vertical Slice V0.1（可用垂直切片 V0.1）** 已开始承载真正被 Web 使用的领域行为，而不再只是目录占位。

首轮实现包括：

- Core Unit Types（核心单元类型）；
- Atlas 自描述 Synthetic Seed（合成种子数据）；
- Root Unit（根单元）唯一性；
- Parent（父级）存在性；
- Containment Cycle（包含关系循环）校验；
- Relationship Endpoint（关系端点）校验；
- Unit 新增与显式修改；
- Published ↔ Draft Diff（差异）；
- Working Layout（工作布局）更新；
- 显式 Publish（发布）并形成新 Revision（修订版本）。

当前实现服务于浏览器体验闭环，后续会继续向完整 `schemas/v0.1` 契约收敛，并成为 API / MCP / Web 共用的唯一 Domain Rule（领域规则）入口。

任何 Web、API、MCP 或 Adapter 都不应绕过这里的领域规则直接修改系统语义。
