# AGENTS.md

This repository is an open-source project. Human and AI contributors must follow the rules below.

## 1. Project intent

AISR Atlas is a human-and-AI-readable system atlas / collaboration control plane.

The V0.1 baseline is defined in:

- `docs/requirements-v0.1.md`
- `docs/domain-model-v0.1.md`
- `docs/versioning-and-layout-v0.1.md`
- `docs/mcp-tool-surface-v0.1.md`
- `docs/architecture.md`

Before changing domain behavior, read these documents first.

## 2. Language and terminology

For architecture and domain documentation, important technical concepts should use **中文（English）** or **English（中文）** pairs when practical, especially on first use. Avoid unexplained English-only terminology in user-facing or design-facing documentation.

## 3. Security and privacy

This is a public repository.

Never commit:

- API tokens, access tokens, cookies, passwords, private keys or credentials;
- Cloudflare account IDs or infrastructure secrets unless explicitly public and safe;
- private URLs containing credentials or signed query parameters;
- personal data, private family data, production user data or chat transcripts;
- internal hostnames / IPs / database connection strings that should not be public;
- copied `.env` files or local secret configuration.

Use placeholders in examples, such as `example.com`, `workspace-id`, `unit-id`, `YOUR_TOKEN`.

Do not log secrets or full authentication payloads in tests, examples, CI, telemetry, issues or PRs.

## 4. Core V0.1 invariants

Do not violate these rules without explicitly updating the baseline documents first:

1. Atlas supports multiple Workspace（工作区） instances from V0.1.
2. V0.1 does not support cross-Workspace Relationship（跨工作区关系）.
3. Every Workspace has exactly one Root Unit（根单元）.
4. Unit（单元） is the common semantic object for systems, projects, services, components, agents, workflows, datastores, etc.
5. Type（类型） is semantics; Shape（图形） is presentation.
6. Containment（包含关系） and Relationship（关系） are different concepts.
7. Model（模型）, View（视图）, and Layout（布局） are separate layers.
8. Canvas dragging changes Layout only. It must never implicitly change Parent, Type, Containment, Relationship or other semantic data.
9. Each Workspace has one active Draft（草稿） and one current Published Revision（已发布修订版本）.
10. Draft is mutable; individual edits do not each create a Published Revision.
11. Change Log（变更日志） is queryable but is not part of the default AI read payload.
12. Publish（发布） requires explicit user intent. AI must not autonomously publish.
13. Definition（定义性数据）, Runtime State（运行性数据）, and Work State（工作性数据） are separate categories.
14. Runtime / Work changes must not create Definition Revision（定义修订版本）.
15. Each Revision owns its Default Layout（默认布局） and Personal Layout（个人布局）.
16. V0.1 does not migrate Layout across Revisions.
17. Child Unit visual placement remains inside its Parent container; moving Parent moves children as a visual group.

## 5. Domain-first implementation

Prefer this dependency direction:

```text
apps/web ───────┐
                ├──> packages/domain
packages/mcp ───┤
apps/api ───────┘

packages/adapters --> apps/api / domain ports
```

UI-specific fields such as React Flow node shapes, colors, handles, or coordinates must not leak into the Canonical System Model（规范系统模型）.

## 6. Change discipline

When a change affects domain semantics:

1. identify which baseline rule changes;
2. update the relevant doc before or together with code;
3. add / update schema and validation tests;
4. preserve stable IDs and backward compatibility where required;
5. document migration implications explicitly.

For V0.1, avoid speculative abstractions that are not needed by the baseline.

## 7. Scope discipline

V0.1 is not a replacement for GitHub, Notion, CI/CD, observability systems or general-purpose whiteboards.

Do not add broad platform capabilities unless they support the V0.1 core loop:

`Workspace → Unit Graph → Draft → View/Layout → Diff → Publish → Revision`

## 8. Generated and external data

Do not treat generated Canvas layout as architecture truth.

Do not infer semantic Parent / Relationship from XY positions.

When importing external facts, preserve source attribution and avoid silently converting observed runtime state into declared architecture definition.
