import { createAisrEcosystemSeed } from './aisr-ecosystem-seed.js';
import { createLifeSpaceGranularWorkStates } from './aisr-ecosystem-work-focus.js';

const SCHEMA_VERSION = '0.1';
const WORKSPACE_ID = 'atlas';
const PUBLISHED_REVISION_ID = 'revision.atlas.1';
const DRAFT_ID = 'draft.atlas.current';
const PUBLISHED_AT = '2026-09-06T10:30:00Z';

const clone = (value) => JSON.parse(JSON.stringify(value));

function rebindStateWorkspace(current) {
  return {
    ...clone(current),
    workspace_id: WORKSPACE_ID,
  };
}

function rebindLayout(baseLayout, target) {
  const {
    kind: _legacyKind,
    owner: _legacyOwner,
    ...layout
  } = clone(baseLayout);

  return {
    ...layout,
    id: `layout.atlas.${target.kind}.${target.id.replaceAll('.', '_')}`,
    workspace_id: WORKSPACE_ID,
    target,
  };
}

export function createAisrWorkspaceExperienceState() {
  const seed = createAisrEcosystemSeed();
  const model = clone(seed.model);
  model.workspace_id = WORKSPACE_ID;

  const runtimeStates = seed.runtimeStates.map(rebindStateWorkspace);
  const granularLifeSpaceWork = createLifeSpaceGranularWorkStates().map(rebindStateWorkspace);
  const otherProjectWork = seed.workStates
    .filter((current) => current.unit_id !== 'lifespace')
    .map(rebindStateWorkspace);
  const workStates = [...otherProjectWork, ...granularLifeSpaceWork];

  return {
    schemaVersion: SCHEMA_VERSION,
    workspaceId: WORKSPACE_ID,
    workspace: { id: WORKSPACE_ID, name: 'AISR Ecosystem' },
    revisionNumber: 1,
    published: {
      revisionId: PUBLISHED_REVISION_ID,
      publishedAt: PUBLISHED_AT,
      model: clone(model),
      layout: rebindLayout(seed.layout, { kind: 'revision', id: PUBLISHED_REVISION_ID }),
    },
    draft: {
      draftId: DRAFT_ID,
      baseRevisionId: PUBLISHED_REVISION_ID,
      changeSequence: 0,
      model: clone(model),
      layout: rebindLayout(seed.layout, { kind: 'draft', id: DRAFT_ID }),
    },
    runtimeStates,
    workStates,
  };
}
