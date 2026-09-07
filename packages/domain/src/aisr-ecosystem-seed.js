const SCHEMA_VERSION = '0.1';
const WORKSPACE_ID = 'aisr-ecosystem';
const OBSERVED_AT = '2026-09-06T09:00:00Z';

const unit = (id, name, type, parentId, description) => ({
  schema_version: SCHEMA_VERSION,
  id,
  name,
  type,
  parent_id: parentId,
  ...(description ? { description } : {}),
});

const relationship = (id, from, to, type, description, properties = undefined) => ({
  schema_version: SCHEMA_VERSION,
  id,
  from_unit_id: from,
  to_unit_id: to,
  type,
  ...(description ? { description } : {}),
  ...(properties ? { properties } : {}),
});

const facet = (id, unitId, type, stateClass, data) => ({
  schema_version: SCHEMA_VERSION,
  id,
  unit_id: unitId,
  type,
  state_class: stateClass,
  data,
});

const layoutNode = (unitId, x, y, width = 220, height = 104, collapsed = false) => ({
  unit_id: unitId,
  x,
  y,
  width,
  height,
  collapsed,
});

const runtimeState = (unitId, status, deployment = undefined) => ({
  schema_version: SCHEMA_VERSION,
  workspace_id: WORKSPACE_ID,
  unit_id: unitId,
  observed_at: OBSERVED_AT,
  status,
  source: { kind: 'import', ref: 'public-repository-architecture-experiment' },
  ...(deployment ? { deployment } : {}),
  metrics: {},
  facets: [
    facet(`facet.${unitId}.runtime`, unitId, 'runtime', 'runtime', {
      evidence: 'Architecture experiment only; no live runtime adapter connected.',
    }),
  ],
});

const workState = (unitId, status, summary) => ({
  schema_version: SCHEMA_VERSION,
  workspace_id: WORKSPACE_ID,
  unit_id: unitId,
  observed_at: OBSERVED_AT,
  status,
  summary,
  actors: [],
  references: [],
  source: { kind: 'import', ref: 'public-repository-architecture-experiment' },
  facets: [
    facet(`facet.${unitId}.work`, unitId, 'work', 'work', {
      source: 'public repository documentation',
    }),
  ],
});

export const AISR_ECOSYSTEM_WORKSPACE = {
  id: WORKSPACE_ID,
  name: 'AISR Ecosystem',
};

export function createAisrEcosystemModel() {
  return {
    schema_version: SCHEMA_VERSION,
    workspace_id: WORKSPACE_ID,
    root_unit_id: 'aisr.ecosystem',
    custom_types: {
      units: [],
      relationships: [
        { id: 'projects', label: 'Projects', description: 'Transforms canonical semantics into a consumer-specific representation.' },
        { id: 'consumes_contract', label: 'Consumes Contract', description: 'Consumes an explicit canonical or generated contract owned by another Unit.' },
        { id: 'provides_tool', label: 'Provides Tool', description: 'Exposes an executable Tool surface to an Agent or Runtime.' },
        { id: 'hosts', label: 'Hosts', description: 'Hosts or loads another logical Unit at runtime.' },
        { id: 'maps_identity', label: 'Maps Identity', description: 'Maps an application/provider identity to a canonical platform identity.' },
      ],
      facets: [],
    },
    units: [
      unit('aisr.ecosystem', 'AISR Ecosystem', 'system', null, 'Architecture experiment spanning LifeSpace, LifeSpace n8n Nodes, LifeSpace Adapters, ALOHA Assistant and HomeMew.'),

      unit('lifespace', 'LifeSpace', 'project', 'aisr.ecosystem', 'Shared life-data platform and authority source for Identity, Space/Grant, model semantics, contracts and reusable runtime capabilities.'),
      unit('lifespace.identity', 'Identity Service', 'service', 'lifespace', 'Global users, trusted applications, service principals, Agent identities, OAuth token runtime and introspection.'),
      unit('lifespace.identity.contract', 'Identity Application Contract', 'component', 'lifespace.identity', 'Versioned application-facing identity contract.'),
      unit('lifespace.identity.store', 'Identity D1', 'datastore', 'lifespace.identity', 'Identity-owned persistent data.'),
      unit('lifespace.core', 'Core Kernel', 'service', 'lifespace', 'Space authority, Runtime Discovery, model runtime, Eventing, Change and other Kernel surfaces.'),
      unit('lifespace.core.space', 'Space / Membership / Grants', 'component', 'lifespace.core', 'Stable Space boundary, membership and Data Grant authority.'),
      unit('lifespace.core.delegation', 'Agent Delegation', 'component', 'lifespace.core', 'Explicit bounded and revocable delegated Agent authority.'),
      unit('lifespace.core.change', 'Governed Change', 'component', 'lifespace.core', 'Mutation evidence and Principal / Actor / Application attribution.'),
      unit('lifespace.core.discovery', 'Runtime Discovery', 'component', 'lifespace.core', 'Current authorized projection of Spaces, models, fields, queries, Actions and capability metadata.'),
      unit('lifespace.core.relations', 'Relation Target Lookup', 'component', 'lifespace.core', 'Authorized lookup for supported relation targets such as Person references.'),
      unit('lifespace.core.eventing', 'Eventing', 'component', 'lifespace.core', 'Webhook Endpoints, Event Subscriptions and reference-only event delivery.'),
      unit('lifespace.core.creation-drafts', 'Creation Drafts', 'component', 'lifespace.core', 'Experimental registry-driven natural-language creation draft orchestration.'),
      unit('lifespace.core.model-system', 'Model System', 'component', 'lifespace.core', 'Canonical Model Definition / Registry ownership and generated model semantics.'),
      unit('lifespace.core.registry', 'Model Registry', 'component', 'lifespace.core.model-system', 'Published ordinary model definitions and semantic compatibility authority.'),
      unit('lifespace.core.runtime', 'Generic Runtime', 'runtime', 'lifespace.core.model-system', 'Metadata-driven validation, CRUD/query, actions, defaults, concurrency and Mutation Authority.'),
      unit('lifespace.core.contracts', 'Model Contract Revisions', 'component', 'lifespace.core.model-system', 'Immutable content-addressed generated OpenAPI / JSON Schema evidence (mct_*).'),
      unit('lifespace.core.capabilities', 'Reusable Capabilities', 'component', 'lifespace.core.model-system', 'Calendar, Temporal/Cycle, Workflow/Policy and other reusable model capabilities.'),
      unit('lifespace.core.store', 'Core D1', 'datastore', 'lifespace.core', 'Core-owned platform and typed ordinary-model persistence.'),
      unit('lifespace.console', 'LifeSpace Console', 'application', 'lifespace', 'Platform operator control plane for inspection and governed administration.'),
      unit('lifespace.client', 'LifeSpace Client / SDK', 'component', 'lifespace', 'Contract-pinned client surface for platform consumers.'),

      unit('aloha', 'ALOHA Assistant', 'project', 'aisr.ecosystem', 'Personal AI assistant product; owns first-party interaction, Gateway, Agent Control and runtime adaptation.'),
      unit('aloha.web', 'ALOHA PWA', 'application', 'aloha', 'First-party Vue PWA and personal interaction surface.'),
      unit('aloha.gateway', 'Gateway', 'service', 'aloha', 'Public ingress and ALOHA Interaction Protocol boundary.'),
      unit('aloha.agent-control', 'Agent Control', 'service', 'aloha', 'Conversation / Run product state, trusted identity resolution, context, policy and runtime selection.'),
      unit('aloha.agent-control.identity', 'Identity / Context / Policy', 'component', 'aloha.agent-control', 'Resolves trusted LifeSpace Principal / Actor / Application tuple and concrete Run context.'),
      unit('aloha.agent-control.run-store', 'Conversation / Run Durable State', 'datastore', 'aloha.agent-control', 'SQLite-backed Durable Object state for ALOHA Conversation / Run lifecycle.'),
      unit('aloha.contracts', 'ALOHA Contracts', 'component', 'aloha', 'Interaction Protocol, Capability contracts and Canonical Run Envelope v1.'),
      unit('aloha.capabilities', 'ALOHA-managed Capabilities', 'component', 'aloha', 'Capabilities mediated by ALOHA rather than directly owned by the Runtime.'),
      unit('aloha.runtime-n8n', 'n8n Runtime Adapter', 'component', 'aloha', 'Maps Canonical Run Envelope v1 to the controlled n8n Agent runtime.'),
      unit('aloha.n8n-agent', 'ALOHA n8n Agent Workflow', 'workflow', 'aloha.runtime-n8n', 'MVP Agent runtime workflow controlled by ALOHA.'),
      unit('aloha.lifespace-tool', 'LifeSpace Runtime Tool', 'component', 'aloha', 'Representative useful personal-assistant Tool provider; integration surface is intentionally adapter/runtime-facing.'),

      unit('homemew', 'HomeMew', 'project', 'aisr.ecosystem', 'Family affairs application built on LifeSpace; owns product UX and provider/BFF boundaries rather than a separate family business Core.'),
      unit('homemew.miniprogram', 'WeChat Mini Program', 'application', 'homemew', 'Family-facing WeChat client.'),
      unit('homemew.web', 'HomeMew Web', 'application', 'homemew', 'React Web application and same-origin front door.'),
      unit('homemew.web.bff', 'Web BFF / Session Gateway', 'component', 'homemew.web', 'Access assertion exchange, app session, CSRF/origin protection and LifeSpace proxy boundary.'),
      unit('homemew.backend', 'WeChat Provider Backend', 'service', 'homemew', 'Application-specific provider trust adapter for WeChat login.'),
      unit('homemew.backend.identity-map', 'openid → usr_* Mapping', 'datastore', 'homemew.backend', 'Application-owned provider identity mapping; canonical user identity remains in LifeSpace.'),
      unit('homemew.display', 'Family Display', 'application', 'homemew', 'Planned independent family dashboard / big-screen client.'),

      unit('lifespace-n8n', 'LifeSpace n8n Nodes', 'project', 'aisr.ecosystem', 'Official n8n community-node adapter driven by LifeSpace Runtime Discovery and Model Contracts.'),
      unit('lifespace-n8n.api-credential', 'LifeSpace API Credential', 'component', 'lifespace-n8n', 'Static secure API base and Service API Token configuration.'),
      unit('lifespace-n8n.signing-credential', 'Webhook Signing Credential', 'component', 'lifespace-n8n', 'Endpoint-scoped inbound HMAC verification secret configuration.'),
      unit('lifespace-n8n.node', 'LifeSpace Node', 'component', 'lifespace-n8n', 'Discovery-driven Record operations and advanced API Request surface.'),
      unit('lifespace-n8n.node.discovery', 'Discovery-backed UX', 'component', 'lifespace-n8n.node', 'Space, Record Type, field, sort, Action and relation metadata projection into n8n controls.'),
      unit('lifespace-n8n.node.records', 'Record CRUD / Query', 'component', 'lifespace-n8n.node', 'Create, Get, List/Query, Update and Delete over generated model routes.'),
      unit('lifespace-n8n.node.actions', 'Execute Action', 'component', 'lifespace-n8n.node', 'Action semantic inputs with Runtime-declared optimistic concurrency transport.'),
      unit('lifespace-n8n.node.relations', 'Relation Selector', 'component', 'lifespace-n8n.node', 'Authorized Person relation target lookup projected as native n8n selectors.'),
      unit('lifespace-n8n.trigger', 'LifeSpace Trigger', 'component', 'lifespace-n8n', 'Signed Domain Event webhook trigger for selected Record Types / event types.'),

      unit('lifespace-adapters', 'LifeSpace Adapters', 'project', 'aisr.ecosystem', 'Protocol adaptation layer that projects canonical LifeSpace contracts without owning domain semantics.'),
      unit('lifespace-adapters.mcp', 'MCP Adapter / Server', 'service', 'lifespace-adapters', 'First protocol adapter; projects authorized LifeSpace surfaces to MCP.'),
      unit('lifespace-adapters.shared', 'Adapter Shared Helpers', 'component', 'lifespace-adapters', 'Protocol-agnostic adapter helpers that deliberately remain outside domain semantics.'),
      unit('lifespace-adapters.future', 'Future Protocol Adapters', 'component', 'lifespace-adapters', 'Future OpenAI/API Tool, SDK or protocol-specific projections.'),

      unit('external.n8n', 'n8n Runtime', 'external-system', 'aisr.ecosystem', 'Workflow automation and Agent orchestration runtime consumed by ALOHA and extended by LifeSpace community nodes.'),
      unit('external.ai-clients', 'AI / MCP Clients', 'external-system', 'aisr.ecosystem', 'ChatGPT, Claude or other protocol clients consuming LifeSpace through adapters.'),
      unit('external.wechat', 'WeChat Platform', 'external-system', 'aisr.ecosystem', 'Provider identity and Mini Program platform owned outside HomeMew / LifeSpace.'),
      unit('external.cloudflare', 'Cloudflare Runtime', 'external-system', 'aisr.ecosystem', 'Workers / Durable Objects / D1 / Access deployment substrate; infrastructure, not domain authority.'),
    ],
    relationships: [
      relationship('rel.lifespace.core.identity', 'lifespace.core', 'lifespace.identity', 'authenticates_with', 'Core validates current principal/application authority through Identity introspection.'),
      relationship('rel.lifespace.core.store', 'lifespace.core', 'lifespace.core.store', 'writes'),
      relationship('rel.lifespace.identity.store', 'lifespace.identity', 'lifespace.identity.store', 'writes'),
      relationship('rel.lifespace.registry.contracts', 'lifespace.core.registry', 'lifespace.core.contracts', 'publishes', 'Published Model Definitions drive immutable generated Model Contract revisions.'),
      relationship('rel.lifespace.registry.runtime', 'lifespace.core.registry', 'lifespace.core.runtime', 'depends_on', 'Generic Runtime interprets published model semantics.'),
      relationship('rel.lifespace.discovery.registry', 'lifespace.core.discovery', 'lifespace.core.registry', 'reads'),
      relationship('rel.lifespace.discovery.delegation', 'lifespace.core.discovery', 'lifespace.core.delegation', 'reads'),
      relationship('rel.lifespace.console.core', 'lifespace.console', 'lifespace.core', 'calls'),
      relationship('rel.lifespace.console.identity', 'lifespace.console', 'lifespace.identity', 'calls'),

      relationship('rel.aloha.web.gateway', 'aloha.web', 'aloha.gateway', 'calls', 'ALOHA Interaction Protocol.'),
      relationship('rel.aloha.gateway.control', 'aloha.gateway', 'aloha.agent-control', 'calls'),
      relationship('rel.aloha.control.identity', 'aloha.agent-control.identity', 'lifespace.identity', 'authenticates_with', 'Server-side trusted LifeSpace User Principal + ALOHA Agent Actor + ALOHA Application resolution.'),
      relationship('rel.aloha.control.store', 'aloha.agent-control', 'aloha.agent-control.run-store', 'writes'),
      relationship('rel.aloha.control.contracts', 'aloha.agent-control', 'aloha.contracts', 'depends_on'),
      relationship('rel.aloha.control.runtime', 'aloha.agent-control', 'aloha.runtime-n8n', 'calls', 'Canonical Run Envelope v1.'),
      relationship('rel.aloha.runtime.n8n', 'aloha.runtime-n8n', 'external.n8n', 'calls', 'Runtime-specific transport to controlled n8n Agent workflow.'),
      relationship('rel.aloha.workflow.host', 'external.n8n', 'aloha.n8n-agent', 'hosts'),
      relationship('rel.aloha.tool.lifespace', 'aloha.lifespace-tool', 'lifespace.core', 'calls', 'LifeSpace remains a Runtime Tool provider rather than an Agent Control internal service.'),
      relationship('rel.aloha.tool.provider', 'aloha.lifespace-tool', 'aloha.n8n-agent', 'provides_tool'),

      relationship('rel.homemew.miniprogram.backend', 'homemew.miniprogram', 'homemew.backend', 'calls'),
      relationship('rel.homemew.backend.wechat', 'homemew.backend', 'external.wechat', 'authenticates_with', 'WeChat jscode2session/provider verification.'),
      relationship('rel.homemew.backend.identity-map', 'homemew.backend', 'homemew.backend.identity-map', 'maps_identity', 'Maps application-owned openid to canonical LifeSpace usr_*.'),
      relationship('rel.homemew.backend.identity', 'homemew.backend', 'lifespace.identity', 'authenticates_with', 'Trusted application exchange for short-lived user credentials.'),
      relationship('rel.homemew.backend.core', 'homemew.backend', 'lifespace.core', 'calls'),
      relationship('rel.homemew.web.bff', 'homemew.web', 'homemew.web.bff', 'calls'),
      relationship('rel.homemew.bff.identity', 'homemew.web.bff', 'lifespace.identity', 'authenticates_with', 'Cloudflare Access assertion is independently verified by LifeSpace Identity.'),
      relationship('rel.homemew.bff.core', 'homemew.web.bff', 'lifespace.core', 'calls'),
      relationship('rel.homemew.models', 'homemew', 'lifespace.core.model-system', 'consumes_contract', 'HomeMew family/event/task/day/wish behavior maps to LifeSpace Space and published model semantics.'),

      relationship('rel.n8n.host', 'external.n8n', 'lifespace-n8n', 'hosts', 'Community node package is loaded into n8n runtime.'),
      relationship('rel.n8n.discovery', 'lifespace-n8n.node.discovery', 'lifespace.core.discovery', 'calls'),
      relationship('rel.n8n.records', 'lifespace-n8n.node.records', 'lifespace.core.runtime', 'calls'),
      relationship('rel.n8n.actions', 'lifespace-n8n.node.actions', 'lifespace.core.runtime', 'calls'),
      relationship('rel.n8n.relations', 'lifespace-n8n.node.relations', 'lifespace.core.relations', 'calls'),
      relationship('rel.n8n.contracts', 'lifespace-n8n.node', 'lifespace.core.contracts', 'consumes_contract'),
      relationship('rel.n8n.auth', 'lifespace-n8n.api-credential', 'lifespace.identity', 'authenticates_with', 'Service API Token / service identity path.'),
      relationship('rel.n8n.trigger.eventing', 'lifespace-n8n.trigger', 'lifespace.core.eventing', 'subscribes'),

      relationship('rel.adapters.mcp.discovery', 'lifespace-adapters.mcp', 'lifespace.core.discovery', 'calls'),
      relationship('rel.adapters.mcp.contracts', 'lifespace-adapters.mcp', 'lifespace.core.contracts', 'consumes_contract'),
      relationship('rel.adapters.mcp.identity', 'lifespace-adapters.mcp', 'lifespace.identity', 'authenticates_with'),
      relationship('rel.adapters.project', 'lifespace-adapters.mcp', 'lifespace.core.model-system', 'projects', 'Protocol projection only; LifeSpace remains the semantic source.'),
      relationship('rel.ai.adapters', 'external.ai-clients', 'lifespace-adapters.mcp', 'calls'),

      relationship('rel.lifespace.cloudflare', 'lifespace', 'external.cloudflare', 'deployed_on'),
      relationship('rel.aloha.cloudflare', 'aloha', 'external.cloudflare', 'deployed_on'),
      relationship('rel.homemew.cloudflare', 'homemew', 'external.cloudflare', 'deployed_on'),
    ],
    facets: [
      facet('facet.aisr.architecture', 'aisr.ecosystem', 'architecture', 'definition', {
        purpose: 'Real architecture stress-test for Atlas V0.1',
        scope: 'LifeSpace + n8n nodes + protocol adapters + ALOHA + HomeMew',
        rule: 'Repository/project boundaries remain explicit Units; runtime dependencies are Relationships, not containment.',
      }),
      facet('facet.lifespace.architecture', 'lifespace', 'architecture', 'definition', {
        repository: 'huangshirui/LifeSpace',
        role: 'platform source of truth',
        semantic_authority: 'Identity, Space/Data Grant, Model Definition/Registry, Generic Runtime, contracts',
        current_core_contract: '0.25.0',
      }),
      facet('facet.lifespace.discovery.architecture', 'lifespace.core.discovery', 'architecture', 'definition', {
        maturity: 'candidate/public',
        direction: 'machine-readable current capability projection',
      }),
      facet('facet.lifespace.model.architecture', 'lifespace.core.model-system', 'architecture', 'definition', {
        maturity: 'stable semantic ownership; candidate generated representation',
      }),
      facet('facet.aloha.architecture', 'aloha', 'architecture', 'definition', {
        repository: 'huangshirui/aloha-assistant',
        role: 'personal AI assistant product',
        runtime_boundary: 'ALOHA contracts remain stable while n8n is an MVP runtime adapter target',
      }),
      facet('facet.homemew.architecture', 'homemew', 'architecture', 'definition', {
        repository: 'huangshirui/HomeMew',
        role: 'family affairs product on LifeSpace',
        business_core: 'LifeSpace is authoritative; legacy HomeMew Core retired from active tree',
      }),
      facet('facet.n8n.architecture', 'lifespace-n8n', 'architecture', 'definition', {
        repository: 'huangshirui/lifespace-n8n-nodes',
        role: 'n8n adapter / community-node package',
        semantic_rule: 'does not copy LifeSpace Model Definitions or authorization logic',
      }),
      facet('facet.adapters.architecture', 'lifespace-adapters', 'architecture', 'definition', {
        repository: 'huangshirui/lifespace-adapters',
        role: 'protocol adaptation layer',
        semantic_rule: 'projection layer, not semantic source',
      }),
    ],
  };
}

export function createAisrEcosystemLayout() {
  return {
    schema_version: SCHEMA_VERSION,
    id: 'layout.aisr-ecosystem.experiment',
    workspace_id: WORKSPACE_ID,
    target: { kind: 'revision', id: 'revision.aisr-ecosystem.experiment' },
    nodes: [
      layoutNode('aisr.ecosystem', 20, 20, 3100, 2060),

      layoutNode('lifespace', 40, 80, 1450, 930),
      layoutNode('lifespace.identity', 30, 80, 390, 300),
      layoutNode('lifespace.identity.contract', 25, 85, 160, 92),
      layoutNode('lifespace.identity.store', 205, 85, 155, 92),
      layoutNode('lifespace.core', 450, 80, 930, 690),
      layoutNode('lifespace.core.space', 25, 85, 190, 92),
      layoutNode('lifespace.core.delegation', 235, 85, 170, 92),
      layoutNode('lifespace.core.change', 425, 85, 170, 92),
      layoutNode('lifespace.core.discovery', 615, 85, 190, 92),
      layoutNode('lifespace.core.relations', 25, 200, 190, 92),
      layoutNode('lifespace.core.eventing', 235, 200, 170, 92),
      layoutNode('lifespace.core.creation-drafts', 425, 200, 170, 92),
      layoutNode('lifespace.core.model-system', 25, 330, 780, 285),
      layoutNode('lifespace.core.registry', 25, 85, 160, 92),
      layoutNode('lifespace.core.runtime', 205, 85, 160, 92),
      layoutNode('lifespace.core.contracts', 385, 85, 175, 92),
      layoutNode('lifespace.core.capabilities', 580, 85, 170, 92),
      layoutNode('lifespace.core.store', 825, 330, 80, 120),
      layoutNode('lifespace.console', 30, 420, 250, 130),
      layoutNode('lifespace.client', 300, 420, 250, 130),

      layoutNode('aloha', 1540, 80, 720, 930),
      layoutNode('aloha.web', 30, 80, 220, 130),
      layoutNode('aloha.gateway', 280, 80, 220, 130),
      layoutNode('aloha.agent-control', 30, 250, 600, 300),
      layoutNode('aloha.agent-control.identity', 25, 85, 250, 92),
      layoutNode('aloha.agent-control.run-store', 300, 85, 250, 92),
      layoutNode('aloha.contracts', 30, 590, 220, 120),
      layoutNode('aloha.capabilities', 280, 590, 220, 120),
      layoutNode('aloha.runtime-n8n', 30, 750, 600, 130),
      layoutNode('aloha.n8n-agent', 25, 85, 250, 92),
      layoutNode('aloha.lifespace-tool', 300, 85, 250, 92),

      layoutNode('homemew', 40, 1050, 900, 720),
      layoutNode('homemew.miniprogram', 30, 80, 220, 130),
      layoutNode('homemew.web', 280, 80, 300, 260),
      layoutNode('homemew.web.bff', 25, 90, 240, 92),
      layoutNode('homemew.backend', 610, 80, 240, 300),
      layoutNode('homemew.backend.identity-map', 25, 90, 190, 92),
      layoutNode('homemew.display', 30, 420, 220, 130),

      layoutNode('lifespace-n8n', 980, 1050, 780, 720),
      layoutNode('lifespace-n8n.api-credential', 30, 80, 220, 110),
      layoutNode('lifespace-n8n.signing-credential', 280, 80, 220, 110),
      layoutNode('lifespace-n8n.node', 30, 230, 690, 300),
      layoutNode('lifespace-n8n.node.discovery', 25, 85, 145, 92),
      layoutNode('lifespace-n8n.node.records', 190, 85, 145, 92),
      layoutNode('lifespace-n8n.node.actions', 355, 85, 145, 92),
      layoutNode('lifespace-n8n.node.relations', 520, 85, 145, 92),
      layoutNode('lifespace-n8n.trigger', 30, 570, 220, 110),

      layoutNode('lifespace-adapters', 1800, 1050, 660, 720),
      layoutNode('lifespace-adapters.mcp', 30, 80, 260, 150),
      layoutNode('lifespace-adapters.shared', 320, 80, 260, 150),
      layoutNode('lifespace-adapters.future', 30, 280, 550, 130),

      layoutNode('external.n8n', 2500, 80, 250, 130),
      layoutNode('external.ai-clients', 2780, 80, 250, 130),
      layoutNode('external.wechat', 2500, 260, 250, 130),
      layoutNode('external.cloudflare', 2780, 260, 250, 130),
    ],
    viewport: { x: 0, y: 0, zoom: 0.34 },
    updated_at: OBSERVED_AT,
  };
}

export function createAisrEcosystemRuntimeStates() {
  return [
    runtimeState('lifespace', 'running', { environment: 'production', version: 'Core 0.25.0 / Identity 0.6.0' }),
    runtimeState('aloha', 'running'),
    runtimeState('homemew', 'running'),
    runtimeState('lifespace-n8n', 'running', { version: '0.1.x community-node line' }),
    runtimeState('lifespace-adapters', 'not-deployed'),
  ];
}

export function createAisrEcosystemWorkStates() {
  return [
    workState('lifespace', 'active', 'Stable Spine is established; consumer projection surfaces such as Runtime Discovery continue to evolve.'),
    workState('aloha', 'active', 'MVP runtime remains n8n Agent; LifeSpace-backed personal-assistant Tool integration is the next useful domain slice.'),
    workState('homemew', 'active', 'Production business data is authoritative in LifeSpace; application work focuses on product/Web/provider boundaries.'),
    workState('lifespace-n8n', 'active', 'Discovery-driven n8n UX is implemented and follows current LifeSpace contract capabilities.'),
    workState('lifespace-adapters', 'planned', 'Repository boundary and contract-consumption rules are defined; MCP implementation/runtime deployment are not yet complete.'),
  ];
}

export function createAisrEcosystemSeed() {
  return {
    workspace: AISR_ECOSYSTEM_WORKSPACE,
    model: createAisrEcosystemModel(),
    layout: createAisrEcosystemLayout(),
    runtimeStates: createAisrEcosystemRuntimeStates(),
    workStates: createAisrEcosystemWorkStates(),
  };
}
