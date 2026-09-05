import assert from 'node:assert/strict';
import {
  ONLINE_WORKSPACE_ID,
  createOnlineSeedState,
  validateExperienceState,
} from '../apps/api/src/state.js';

const clone = (value) => JSON.parse(JSON.stringify(value));

const seed = createOnlineSeedState(ONLINE_WORKSPACE_ID);
assert.deepEqual(validateExperienceState(seed), [], 'Online seed must pass API validation');

const wrongWorkspace = clone(seed);
wrongWorkspace.workspaceId = 'other';
assert.ok(
  validateExperienceState(wrongWorkspace).some((error) => error.includes('workspaceId')),
  'API must reject a mismatched Workspace envelope',
);

const wrongBaseRevision = clone(seed);
wrongBaseRevision.draft.baseRevisionId = 'revision.atlas.999';
assert.ok(
  validateExperienceState(wrongBaseRevision).some((error) => error.includes('baseRevisionId')),
  'Draft must remain based on the current Published Revision',
);

const wrongDraftLayoutTarget = clone(seed);
wrongDraftLayoutTarget.draft.layout.target = { kind: 'revision', id: seed.published.revisionId };
assert.ok(
  validateExperienceState(wrongDraftLayoutTarget).some((error) => error.includes('Draft layout')),
  'Draft layout must target the active Draft',
);

const invalidGraph = clone(seed);
invalidGraph.draft.model.units.find((unit) => unit.id === 'atlas.web').parent_id = 'missing.parent';
assert.ok(
  validateExperienceState(invalidGraph).some((error) => error.includes('does not exist')),
  'API validation must reuse Domain graph invariants',
);

assert.throws(
  () => createOnlineSeedState('other'),
  /Unsupported Workspace/,
  'V0.3 online seed must not pretend unsupported Workspace persistence exists',
);

console.log('Online Experience V0.3 validation passed.');
