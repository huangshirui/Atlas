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

const clone = (value) => JSON.parse(JSON.stringify(value));

const unit = (id, name, type, parentId, description) => ({
  schema_version: SCHEMA_VERSION,
  id,
  name,
  type,
  parent_id: parentId,
  ...(description ? { description } : {}),
});

const relationship = (id, from, to, type) => ({
  schema_version: SCHEMA_VERSION,
  id,
  from_unit_id: from,
  to_unit_id: to,
  type,
});

export const createSeedModel = ({ includeSchemas = false } = {}) => {
  const units = [
    unit('atlas', 'AISR Atlas', 'system', null, 'System map and collaboration control plane.'),
    unit('atlas.web', 'Atlas Web', 'application', 'atlas', 'Human-facing canvas and inspector.'),
    unit('atlas.api', 'Atlas API', 'service', 'atlas', 'Control-plane API boundary.'),
    unit('atlas.domain', 'Atlas Domain', 'component', 'atlas', 'Shared domain rules and validation.'),
    unit('atlas.mcp', 'Atlas MCP', 'component', 'atlas', 'AI-facing MCP / Tool surface.'),
  ];

  if (includeSchemas) {
    units.push(
      unit('atlas.schemas', 'Atlas Schemas', 'component', 'atlas', 'Versioned machine-readable contracts.'),
    );
  }

  return {
    schema_version: SCHEMA_VERSION,
    workspace_id: 'atlas',
    root_unit_id: 'atlas',
    custom_types: { units: [], relationships: [], facets: [] },
    units,
    relationships: [
      relationship('rel.atlas.web.api', 'atlas.web', 'atlas.api', 'calls'),
      relationship('rel.atlas.api.domain', 'atlas.api', 'atlas.domain', 'depends_on'),
      relationship('rel.atlas.mcp.domain', 'atlas.mcp', 'atlas.domain', 'depends_on'),
    ],
    facets: [],
  };
};

const layoutNode = (unitId, x, y, width = 220, height = 104) => ({
  unit_id: unitId,
  x,
  y,
  width,
  height,
  collapsed: false,
});

export const createSeedLayout = ({ includeSchemas = false, targetKind = 'revision', targetId = 'revision.atlas.1' } = {}) => ({
  schema_version: SCHEMA_VERSION,
  id: `layout.atlas.${targetKind}.${targetId.replaceAll('.', '_')}`,
  workspace_id: 'atlas',
  target: { kind: targetKind, id: targetId },
  kind: 'personal',
  owner: { kind: 'human', id: 'local-user' },
  nodes: [
    layoutNode('atlas', 48, 36, 1080, 650),
    layoutNode('atlas.web', 56, 86),
    layoutNode('atlas.api', 318, 86),
    layoutNode('atlas.domain', 580, 86),
    layoutNode('atlas.mcp', 842, 86),
    ...(includeSchemas ? [layoutNode('atlas.schemas', 56, 250)] : []),
  ],
  viewport: { x: 0, y: 0, zoom: 0.9 },
  updated_at: '2026-01-01T00:00:00Z',
});

export const createInitialExperienceState = () => ({
  schemaVersion: SCHEMA_VERSION,
  workspaceId: 'atlas',
  revisionNumber: 1,
  published: {
    revisionId: 'revision.atlas.1',
    publishedAt: '2026-01-01T00:00:00Z',
    model: createSeedModel({ includeSchemas: false }),
    layout: createSeedLayout({ includeSchemas: false, targetKind: 'revision', targetId: 'revision.atlas.1' }),
  },
  draft: {
    draftId: 'draft.atlas.current',
    baseRevisionId: 'revision.atlas.1',
    changeSequence: 1,
    model: createSeedModel({ includeSchemas: true }),
    layout: createSeedLayout({ includeSchemas: true, targetKind: 'draft', targetId: 'draft.atlas.current' }),
  },
});

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

  const publishedRelationships = byId(published.relationships);
  const draftRelationships = byId(draft.relationships);
  const allRelationshipIds = new Set([...publishedRelationships.keys(), ...draftRelationships.keys()]);
  for (const id of [...allRelationshipIds].sort()) {
    const before = publishedRelationships.get(id);
    const after = draftRelationships.get(id);
    if (!before && after) changes.push({ id: `rel:add:${id}`, kind: 'add', target: id, entity: 'relationship', summary: `Added Relationship ${id}`, before: null, after });
    if (before && !after) changes.push({ id: `rel:remove:${id}`, kind: 'remove', target: id, entity: 'relationship', summary: `Removed Relationship ${id}`, before, after: null });
    if (before && after && JSON.stringify(before) !== JSON.stringify(after)) {
      changes.push({ id: `rel:update:${id}`, kind: 'update', target: id, entity: 'relationship', summary: `Updated Relationship ${id}`, before, after });
    }
  }

  return changes;
}

export function publishExperienceState(state) {
  const errors = validateModel(state.draft.model);
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

export function layoutEntry(layout, unitId) {
  return layout.nodes.find((entry) => entry.unit_id === unitId);
}

export function updateLayoutNode(layout, unitId, patch) {
  const next = clone(layout);
  const current = next.nodes.find((entry) => entry.unit_id === unitId);
  if (current) Object.assign(current, patch);
  else next.nodes.push(layoutNode(unitId, patch.x ?? 32, patch.y ?? 80, patch.width, patch.height));
  next.updated_at = new Date().toISOString();
  return next;
}

export function addLayoutNode(layout, unitId, parentId, ordinal = 0) {
  let next = updateLayoutNode(layout, unitId, {
    x: 56 + (ordinal % 3) * 260,
    y: 250 + Math.floor(ordinal / 3) * 150,
    width: 220,
    height: 104,
  });

  if (parentId) {
    const parent = layoutEntry(next, parentId);
    if (parent && parentId !== 'atlas') {
      next = updateLayoutNode(next, parentId, {
        width: Math.max(parent.width, 480),
        height: Math.max(parent.height, 300),
      });
      next = updateLayoutNode(next, unitId, { x: 36, y: 84 });
    }
  }
  return next;
}
