# AISR Atlas

AISR Atlas is a human-and-AI-readable system atlas for architecture, development, runtime, operations, and collaboration.

> **One shared system model, readable and operable by humans and AI.**

The project is currently defining and validating the **V0.1 domain model and MVP baseline**. See [`docs/requirements-v0.1.md`](docs/requirements-v0.1.md) and [`docs/domain-model-v0.1.md`](docs/domain-model-v0.1.md).

## Repository layout

```text
apps/
  web/          Human-facing canvas and views
  api/          Atlas API / control plane backend
packages/
  domain/       Canonical domain model, schemas, validation
  mcp/          MCP / Tool interface for AI clients
  adapters/     External-system adapters (post-V0.1)
schemas/        Versioned machine-readable schemas
docs/           Product and architecture baselines
```

## V0.1 focus

V0.1 validates the core loop:

**Workspace → Unit Graph → Draft → Layout/View → Diff → Publish → Revision**

It intentionally does not attempt to replace GitHub, Notion, observability platforms, CI/CD systems, or general-purpose whiteboards.
