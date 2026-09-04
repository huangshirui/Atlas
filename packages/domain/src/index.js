export const SCHEMA_VERSION = '0.1';

export const CORE_UNIT_TYPES = [
  'system',
  'project',
  'application',
  'service',
  'component',
  'agent',
  'workflow',
  'runtime',
  'datastore',
  'external-system',
];

export const CORE_RELATIONSHIP_TYPES = [
  'depends_on',
  'calls',
  'reads',
  'writes',
  'publishes',
  'subscribes',
  'authenticates_with',
  'delegates_to',
  'deployed_on',
  'observed_by',
];

export const CORE_FACET_TYPES = [
  'architecture',
  'development',
  'runtime',
  'health',
  'deployment',
  'work',
];

const clone = (value) => JSON.parse(JSON.stringify(value));

const unit = (id, name, type, parentId, description) => ({
  schema_version: SCHEMA_VERSION,
  id,
  name,
  type,
  parent_id: parentId,
  ...(description ? { description } : {}),
});

const relationship = (id, from, to, type, description) => ({
  schema_version: SCHEMA_VERSION,
  id,
  from_unit_id: from,
  to_unit_id: to,
  type,
  ...(description ? { description } : {}),
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

const runtimeState = (unitId, status = 'unknown') => ({
  schema_version: SCHEMA_VERSION,
  workspace_id: 'atlas',
  unit_id: unitId,
  observed_at: '2026-09-04T00:00:00Z',
  status,
  source: { kind: 'system', ref: 'local-experience-seed' },
  metrics: {},
  facets: [
    facet(
      `facet.${unitId}.runtime`,
      unitId,
      'runtime',
      'runtime',
      { connected: false, note: 'No live runtime adapter is connected in the local experience.' },
    ),
  ],
});

const workState = (unitId) => ({
  schema_version: SCHEMA_VERSION,
  workspace_id: 'atlas',
  unit_id: unitId,
  observed_at: '2026-09-04T00:00:00Z',
  status: 'unknown',
  summary: 'No live work-state adapter is connected in the local experience.',
  actors: [],
  references: [],
  source: { kind: 'system', ref: 'local-experience-seed' },
  facets: [
    facet(
      `facet.${unitId}.work`,
      unitId,
      'work',
      'work',
      { connected: false },
    ),
  ],
});

export function createSeedModel() {
  return {
    schema_version: SCHEMA_VERSION,
    workspace_id: 'atlas',
    root_unit_id: 'atlas',
    custom_types: { units: [], relationships: [], facets: [] },
    units: [
      unit('atlas', 'Atlas', 'system', null, 'System atlas and collaboration control plane.'),
      unit('atlas.web', 'Atlas Web', 'application', 'atlas', 'Human-facing canvas and views.'),
      unit('atlas.web.canvas', 'Canvas', 'component', 'atlas.web', 'Interactive structural canvas.'),
      unit('atlas.web.inspector', 'Inspector', 'component', 'atlas.web', 'Contextual unit, relationship and facet inspector.'),
      unit('atlas.api', 'Atlas API', 'service', 'atlas', 'Control-plane API boundary.'),
      unit('atlas.api.revision', 'Revision Service', 'component', 'atlas.api', 'Draft, diff and publish lifecycle boundary.'),
      unit('atlas.api.layout', 'Layout Service', 'component', 'atlas.api', 'Default and personal layout boundary.'),
      unit('atlas.api.state', 'State Service', 'component', 'atlas.api', 'Runtime and work state boundary.'),
      unit('atlas.domain', 'Atlas Domain', 'component', 'atlas', 'Shared domain rules and validation.'),
      unit('atlas.domain.graph', 'Workspace / Unit Graph', 'component', 'atlas.domain', 'Workspace, Unit, containment and Relationship invariants.'),
      unit('atlas.domain.lifecycle', 'Draft / Revision / Diff', 'component', 'atlas.domain', 'Definition lifecycle rules.'),
      unit('atlas.domain.state-boundaries', 'State Boundaries', 'component', 'atlas.domain', 'Definition, Runtime State and Work State separation.'),
      unit('atlas.mcp', 'Atlas MCP', 'component', 'atlas', 'AI-facing MCP / Tool surface.'),
      unit('atlas.adapters', 'Atlas Adapters', 'component', 'atlas', 'External fact-source adapter boundary.'),
      unit('atlas.schemas', 'Atlas Schemas', 'component', 'atlas', 'Versioned machine-readable contracts.'),
    ],
    relationships: [
      relationship('rel.atlas.web.api', 'atlas.web', 'atlas.api', 'calls'),
      relationship('rel.atlas.mcp.api', 'atlas.mcp', 'atlas.api', 'calls'),
      relationship('rel.atlas.api.domain', 'atlas.api', 'atlas.domain', 'depends_on'),
    ],
    facets: [
      facet('facet.atlas.architecture', 'atlas', 'architecture', 'definition', {
        role: 'System atlas and collaboration control plane',
        independence: 'Observed systems are not required for Atlas to operate',
      }),
      facet('facet.atlas.web.architecture', 'atlas.web', 'architecture', 'definition', {
        repository_path: 'apps/web',
        responsibility: 'Human-facing canvas and views',
        implementation: 'React + React Flow',
      }),
      facet('facet.atlas.api.architecture', 'atlas.api', 'architecture', 'definition', {
        repository_path: 'apps/api',
        responsibility: 'Control-plane backend',
        initial_runtime_direction: 'Cloudflare Worker',
      }),
      facet('facet.atlas.domain.architecture', 'atlas.domain', 'architecture', 'definition', {
        repository_path: 'packages/domain',
        responsibility: 'Domain invariants, revision, layout and state boundaries',
      }),
      facet('facet.atlas.mcp.architecture', 'atlas.mcp', 'architecture', 'definition', {
        repository_path: 'packages/mcp',
        responsibility: 'AI-facing MCP / Tool surface',
      }),
      facet('facet.atlas.adapters.architecture', 'atlas.adapters', 'architecture', 'definition', {
        repository_path: 'packages/adapters',
        responsibility: 'External fact-source adapters',
      }),
      facet('facet.atlas.schemas.architecture', 'atlas.schemas', 'architecture', 'definition', {
        repository_path: 'schemas',
        responsibility: 'Versioned machine-readable contracts',
      }),
    ],
  };
}

export function createSeedLayout({ targetKind = 'revision', targetId = 'revision.atlas.1' } = {}) {
  return {
    schema_version: SCHEMA_VERSION,
    id: `layout.atlas.${targetKind}.${targetId.replaceAll('.', '_')}`,
    workspace_id: 'atlas',
    target: { kind: targetKind, id: targetId },
    kind: 'personal',
    owner: { kind: 'human', id: 'local-user' },
    nodes: [
      layoutNode('atlas', 40, 30, 1540, 980),
      layoutNode('atlas.web', 40, 90, 440, 310),
      layoutNode('atlas.web.canvas', 30, 90, 180, 92),
      layoutNode('atlas.web.inspector', 230, 90, 180, 92),
      layoutNode('atlas.api', 510, 90, 520, 310),
      layoutNode('atlas.api.revision', 30, 90, 140, 92),
      layoutNode('atlas.api.layout', 190, 90, 140, 92),
      layoutNode('atlas.api.state', 350, 90, 140, 92),
      layoutNode('atlas.domain', 1060, 90, 440, 360),
      layoutNode('atlas.domain.graph', 30, 90, 180, 92),
      layoutNode('atlas.domain.lifecycle', 230, 90, 180, 92),
      layoutNode('atlas.domain.state-boundaries', 30, 205, 380, 92),
      layoutNode('atlas.mcp', 40, 500, 220, 104),
      layoutNode('atlas.adapters', 290, 500, 220, 104),
      layoutNode('atlas.schemas', 540, 500, 220, 104),
    ],
    viewport: { x: 0, y: 0, zoom: 0.78 },
    updated_at: '2026-09-04T00:00:00Z',
  };
}

export function createSeedRuntimeStates() {
  return [
    runtimeState('atlas'),
    runtimeState('atlas.web'),
    runtimeState('atlas.api'),
    runtimeState('atlas.domain'),
    runtimeState('atlas.mcp'),
    runtimeState('atlas.adapters'),
  ];
}

export function createSeedWorkStates() {
  return [
    workState('atlas'),
    workState('atlas.web'),
    workState('atlas.api'),
    workState('atlas.domain'),
  ];
}

export function createInitialExperienceState() {
  const publishedModel = createSeedModel();
  const publishedLayout = createSeedLayout({ targetKind: 'revision', targetId: 'revision.atlas.1' });
  const draftLayout = createSeedLayout({ targetKind: 'draft', targetId: 'draft.atlas.current' });

  return {
    schemaVersion: SCHEMA_VERSION,
    workspaceId: 'atlas',
    workspace: { id: 'atlas', name: 'Atlas' },
    revisionNumber: 1,
    published: {
      revisionId: 'revision.atlas.1',
      publishedAt: '2026-09-04T00:00:00Z',
      model: clone(publishedModel),
      layout: publishedLayout,
    },
    draft: {
      draftId: 'draft.atlas.current',
      baseRevisionId: 'revision.atlas.1',
      changeSequence: 0,
      model: clone(publishedModel),
      layout: draftLayout,
    },
    runtimeStates: createSeedRuntimeStates(),
    workStates: createSeedWorkStates(),
  };
}

const byId = (items) => new Map(items.map((item) => [item.id, item]));

export function validateModel(model) {
  const errors = [];
  const unitIds = new Set();

  for (const current of model.units) {
    if (unitIds.has(current.id)) errors.push(`Duplicate Unit ID: ${current.id}`);
    unitIds.add(current.id);
  }

  const roots = model.units.filter((current) => current.parent_id === null);
  if (roots.length !== 1) errors.push(`Workspace must have exactly one Root Unit; found ${roots.length}.`);
  if (roots[0] && roots[0].id !== model.root_unit_id) {
    errors.push(`root_unit_id must reference the only Root Unit (${roots[0].id}).`);
  }

  for (const current of model.units) {
    if (current.parent_id !== null && !unitIds.has(current.parent_id)) {
      errors.push(`Parent ${current.parent_id} for ${current.id} does not exist.`);
    }
  }

  for (const current of model.units) {
    const seen = new Set([current.id]);
    let cursor = current;
    while (cursor.parent_id !== null) {
      if (seen.has(cursor.parent_id)) {
        errors.push(`Containment cycle detected at ${current.id}.`);
        break;
      }
      seen.add(cursor.parent_id);
      cursor = model.units.find((candidate) => candidate.id === cursor.parent_id);
      if (!cursor) break;
    }
  }

  const relationshipIds = new Set();
  for (const current of model.relationships) {
    if (relationshipIds.has(current.id)) errors.push(`Duplicate Relationship ID: ${current.id}`);
    relationshipIds.add(current.id);
    if (!unitIds.has(current.from_unit_id)) errors.push(`Relationship ${current.id} has missing source ${current.from_unit_id}.`);
    if (!unitIds.has(current.to_unit_id)) errors.push(`Relationship ${current.id} has missing target ${current.to_unit_id}.`);
  }

  const facetIds = new Set();
  for (const current of model.facets) {
    if (facetIds.has(current.id)) errors.push(`Duplicate Facet ID: ${current.id}`);
    facetIds.add(current.id);
    if (!unitIds.has(current.unit_id)) errors.push(`Facet ${current.id} has missing Unit ${current.unit_id}.`);
    if (current.state_class !== 'definition') errors.push(`Canonical Model Facet ${current.id} must use state_class definition.`);
  }

  return errors;
}

export function validateStateReferences(model, runtimeStates = [], workStates = []) {
  const errors = [];
  const unitIds = new Set(model.units.map((current) => current.id));
  for (const current of runtimeStates) {
    if (!unitIds.has(current.unit_id)) errors.push(`Runtime State references missing Unit ${current.unit_id}.`);
    for (const currentFacet of current.facets ?? []) {
      if (currentFacet.unit_id !== current.unit_id) errors.push(`Runtime Facet ${currentFacet.id} must reference ${current.unit_id}.`);
      if (currentFacet.state_class !== 'runtime') errors.push(`Runtime Facet ${currentFacet.id} must use state_class runtime.`);
    }
  }
  for (const current of workStates) {
    if (!unitIds.has(current.unit_id)) errors.push(`Work State references missing Unit ${current.unit_id}.`);
    for (const currentFacet of current.facets ?? []) {
      if (currentFacet.unit_id !== current.unit_id) errors.push(`Work Facet ${currentFacet.id} must reference ${current.unit_id}.`);
      if (currentFacet.state_class !== 'work') errors.push(`Work Facet ${currentFacet.id} must use state_class work.`);
    }
  }
  return errors;
}

export function updateUnit(model, unitId, patch) {
  const next = clone(model);
  const index = next.units.findIndex((current) => current.id === unitId);
  if (index < 0) throw new Error(`Unit not found: ${unitId}`);

  next.units[index] = {
    ...next.units[index],
    ...patch,
    id: next.units[index].id,
    schema_version: SCHEMA_VERSION,
  };
  return next;
}

export function addUnit(model, input) {
  const next = clone(model);
  if (next.units.some((current) => current.id === input.id)) {
    throw new Error(`Unit ID already exists: ${input.id}`);
  }
  next.units.push(unit(input.id, input.name, input.type, input.parent_id, input.description));
  return next;
}

export function addRelationship(model, input) {
  const next = clone(model);
  if (next.relationships.some((current) => current.id === input.id)) {
    throw new Error(`Relationship ID already exists: ${input.id}`);
  }
  next.relationships.push(relationship(
    input.id,
    input.from_unit_id,
    input.to_unit_id,
    input.type,
    input.description,
  ));
  return next;
}

export function updateRelationship(model, relationshipId, patch) {
  const next = clone(model);
  const index = next.relationships.findIndex((current) => current.id === relationshipId);
  if (index < 0) throw new Error(`Relationship not found: ${relationshipId}`);
  next.relationships[index] = {
    ...next.relationships[index],
    ...patch,
    id: next.relationships[index].id,
    schema_version: SCHEMA_VERSION,
  };
  return next;
}

export function removeRelationship(model, relationshipId) {
  const next = clone(model);
  const index = next.relationships.findIndex((current) => current.id === relationshipId);
  if (index < 0) throw new Error(`Relationship not found: ${relationshipId}`);
  next.relationships.splice(index, 1);
  return next;
}

export function suggestRelationshipId(model, fromUnitId, toUnitId, type = 'calls') {
  const base = `rel.${fromUnitId}.${toUnitId}.${type}`;
  if (!model.relationships.some((current) => current.id === base)) return base;
  let suffix = 2;
  while (model.relationships.some((current) => current.id === `${base}.${suffix}`)) suffix += 1;
  return `${base}.${suffix}`;
}

function diffEntityCollection(changes, entity, publishedItems, draftItems, label) {
  const publishedById = byId(publishedItems);
  const draftById = byId(draftItems);
  const allIds = new Set([...publishedById.keys(), ...draftById.keys()]);

  for (const id of [...allIds].sort()) {
    const before = publishedById.get(id);
    const after = draftById.get(id);
    if (!before && after) {
      changes.push({ id: `${entity}:add:${id}`, kind: 'add', target: id, entity, summary: `Added ${label} ${id}`, before: null, after });
    } else if (before && !after) {
      changes.push({ id: `${entity}:remove:${id}`, kind: 'remove', target: id, entity, summary: `Removed ${label} ${id}`, before, after: null });
    } else if (before && after && JSON.stringify(before) !== JSON.stringify(after)) {
      changes.push({ id: `${entity}:update:${id}`, kind: 'update', target: id, entity, summary: `Updated ${label} ${id}`, before, after });
    }
  }
}

export function diffModels(published, draft) {
  const changes = [];
  const publishedUnits = byId(published.units);
  const draftUnits = byId(draft.units);
  const allUnitIds = new Set([...publishedUnits.keys(), ...draftUnits.keys()]);

  for (const id of [...allUnitIds].sort()) {
    const before = publishedUnits.get(id);
    const after = draftUnits.get(id);
    if (!before && after) {
      changes.push({ id: `unit:add:${id}`, kind: 'add', target: id, entity: 'unit', summary: `Added Unit ${after.name}`, before: null, after });
      continue;
    }
    if (before && !after) {
      changes.push({ id: `unit:remove:${id}`, kind: 'remove', target: id, entity: 'unit', summary: `Removed Unit ${before.name}`, before, after: null });
      continue;
    }

    for (const field of ['name', 'type', 'parent_id', 'description']) {
      const beforeValue = before?.[field] ?? null;
      const afterValue = after?.[field] ?? null;
      if (beforeValue !== afterValue) {
        changes.push({
          id: `unit:update:${id}:${field}`,
          kind: 'update',
          target: id,
          entity: 'unit',
          field,
          summary: `${id}.${field}: ${String(beforeValue)} → ${String(afterValue)}`,
          before: beforeValue,
          after: afterValue,
        });
      }
    }
  }

  diffEntityCollection(changes, 'relationship', published.relationships, draft.relationships, 'Relationship');
  diffEntityCollection(changes, 'facet', published.facets, draft.facets, 'Facet');
  return changes;
}

export function publishExperienceState(state) {
  const errors = [
    ...validateModel(state.draft.model),
    ...validateStateReferences(state.draft.model, state.runtimeStates, state.workStates),
  ];
  if (errors.length) throw new Error(errors[0]);

  const revisionNumber = state.revisionNumber + 1;
  const revisionId = `revision.atlas.${revisionNumber}`;
  const now = new Date().toISOString();
  const publishedLayout = clone(state.draft.layout);
  publishedLayout.id = `layout.atlas.revision.${revisionNumber}`;
  publishedLayout.target = { kind: 'revision', id: revisionId };
  publishedLayout.updated_at = now;

  const nextDraftLayout = clone(publishedLayout);
  nextDraftLayout.id = 'layout.atlas.draft.current';
  nextDraftLayout.target = { kind: 'draft', id: state.draft.draftId };

  return {
    ...state,
    revisionNumber,
    published: {
      revisionId,
      publishedAt: now,
      model: clone(state.draft.model),
      layout: publishedLayout,
    },
    draft: {
      ...state.draft,
      baseRevisionId: revisionId,
      changeSequence: 0,
      model: clone(state.draft.model),
      layout: nextDraftLayout,
    },
  };
}

export function syncDraftLayoutFromPublished(state) {
  if (diffModels(state.published.model, state.draft.model).length > 0) return state;
  const next = clone(state);
  next.draft.layout = clone(state.published.layout);
  next.draft.layout.id = 'layout.atlas.draft.current';
  next.draft.layout.target = { kind: 'draft', id: state.draft.draftId };
  next.draft.layout.updated_at = new Date().toISOString();
  return next;
}

export function layoutEntry(layout, unitId) {
  return layout.nodes.find((entry) => entry.unit_id === unitId);
}

export function updateLayoutNode(layout, unitId, patch) {
  const next = clone(layout);
  const current = next.nodes.find((entry) => entry.unit_id === unitId);
  if (current) Object.assign(current, patch);
  else next.nodes.push(layoutNode(unitId, patch.x ?? 32, patch.y ?? 80, patch.width, patch.height, patch.collapsed));
  next.updated_at = new Date().toISOString();
  return next;
}

export function addLayoutNode(layout, unitId, parentId, ordinal = 0) {
  let next = updateLayoutNode(layout, unitId, {
    x: 36 + (ordinal % 2) * 240,
    y: 84 + Math.floor(ordinal / 2) * 130,
    width: 220,
    height: 104,
    collapsed: false,
  });

  if (parentId) next = fitAncestorsToLayout(next, null, unitId, 28, parentId);
  return next;
}

export function fitAncestorsToLayout(layout, model, unitId, padding = 28, explicitParentId = null) {
  let next = clone(layout);
  let childId = unitId;
  let parentId = explicitParentId ?? model?.units.find((current) => current.id === childId)?.parent_id ?? null;
  const visited = new Set();

  while (parentId) {
    if (visited.has(parentId)) break;
    visited.add(parentId);
    const child = layoutEntry(next, childId);
    const parent = layoutEntry(next, parentId);
    if (!child || !parent) break;

    const requiredWidth = Math.max(parent.width, child.x + child.width + padding);
    const requiredHeight = Math.max(parent.height, child.y + child.height + padding);
    next = updateLayoutNode(next, parentId, { width: requiredWidth, height: requiredHeight });

    childId = parentId;
    parentId = model?.units.find((current) => current.id === childId)?.parent_id ?? null;
  }

  return next;
}

export function toggleLayoutCollapsed(layout, unitId) {
  const current = layoutEntry(layout, unitId);
  if (!current) throw new Error(`Layout node not found: ${unitId}`);
  return updateLayoutNode(layout, unitId, { collapsed: !current.collapsed });
}

export function definitionFacetsForUnit(model, unitId) {
  return model.facets.filter((current) => current.unit_id === unitId && current.state_class === 'definition');
}

export function runtimeStateForUnit(runtimeStates, unitId) {
  return runtimeStates.find((current) => current.unit_id === unitId) ?? null;
}

export function workStateForUnit(workStates, unitId) {
  return workStates.find((current) => current.unit_id === unitId) ?? null;
}
