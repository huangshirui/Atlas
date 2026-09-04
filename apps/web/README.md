# apps/web

面向人的 AISR Atlas Web 客户端。

当前 **Usable Vertical Slice V0.1（可用垂直切片 V0.1）** 已提供第一版可运行体验：

- Atlas 自身公开结构的 Canvas（画布）；
- Unit（单元）层级与 Relationship（关系）连线；
- Draft / Published（草稿 / 已发布）切换；
- Canvas 拖动只修改 Working Layout（工作布局）；
- Unit Inspector（单元检查器）显式修改名称、类型与 Parent（父级）；
- 在 Draft 中新增 Unit；
- Published ↔ Draft Diff（差异）；
- 用户显式 Publish（发布）形成新 Revision（修订版本）；
- 浏览器 Local Storage Adapter（本地存储适配器）保存体验数据；
- Reset（重置）恢复合成的 Atlas 自描述样例。

## 本地运行

在仓库根目录：

```bash
npm install
npm run dev
```

默认打开 `http://localhost:5173`。

## 当前刻意限制

Local Storage Adapter 仅用于尽快验证产品交互，不是最终事实存储。后续接入 `apps/api` + Cloudflare D1（控制面 API + 数据库）时，应保持 Domain（领域）与 Web 交互语义不变。

Web 只负责呈现和交互，不得通过 XY 坐标推导或隐式修改 Canonical Model（规范模型）。
