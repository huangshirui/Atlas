# packages/domain

AISR Atlas 的核心领域模型（Domain Model）与规则层。

当前 **Workbench V0.2（工作台 V0.2）** 已开始承担 Web、后续 API 与 MCP 共用的实际领域行为。

当前实现包括：

- Core Unit / Relationship / Facet Types（核心单元 / 关系 / 侧面类型）；
- Atlas 多层自描述 Synthetic Seed（合成种子数据）；
- Root Unit（根单元）唯一性；
- Parent（父级）存在性；
- Containment Cycle（包含关系循环）校验；
- Relationship Endpoint（关系端点）与 Facet Unit Reference（侧面单元引用）校验；
- Canonical Model（规范模型）中的 Facet 只能属于 Definition（定义态）；
- Runtime State / Work State（运行态 / 工作态）引用与 state_class 校验；
- Unit 新增与显式修改；
- Relationship 创建、修改与删除；
- Published ↔ Draft Diff（差异），包括 Unit / Relationship / Definition Facet；
- Personal Layout（个人布局）的拖动、Resize（调整大小）、Collapse / Expand（折叠 / 展开）与父容器扩展；
- 空 Draft 进入编辑态时从当前 Published Personal Layout 同步工作布局；
- 显式 Publish（发布）并形成新 Revision（修订版本）。

`scripts/validate-domain.mjs` 对图不变量、三类状态引用、Layout-only 操作、Relationship 生命周期、Facet 边界、Draft Layout 同步和 Publish 生命周期进行行为验证。

任何 Web、API、MCP 或 Adapter 都不应绕过这里的领域规则直接修改系统语义。
