import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ONLINE_WORKSPACE_ID,
  createOnlineSeedState,
  validateExperienceState,
} from '../apps/api/src/state.js';

const clone = (value) => JSON.parse(JSON.stringify(value));

const seed = createOnlineSeedState(ONLINE_WORKSPACE_ID);
assert.deepEqual(validateExperienceState(seed), [], 'Online seed must pass API validation');
assert.equal(seed.workspace.name, 'AISR Ecosystem', 'Normal Workspace must use the real AISR ecosystem seed');
assert.equal(seed.published.model.root_unit_id, 'aisr.ecosystem', 'AISR Ecosystem must replace the old Atlas self-demo graph');
assert.ok(
  seed.workStates.some((current) => current.unit_id === 'lifespace.core.discovery' && current.status === 'active'),
  'LifeSpace work must be projected at the active sub-Unit instead of only at the project root',
);
assert.ok(
  !seed.workStates.some((current) => current.unit_id === 'lifespace'),
  'LifeSpace project root must not claim direct work when only descendants are changing',
);

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
invalidGraph.draft.model.units.find((unit) => unit.id === 'lifespace.core.discovery').parent_id = 'missing.parent';
assert.ok(
  validateExperienceState(invalidGraph).some((error) => error.includes('does not exist')),
  'API validation must reuse Domain graph invariants',
);

assert.throws(
  () => createOnlineSeedState('other'),
  /Unsupported Workspace/,
  'V0.3 online seed must not pretend unsupported Workspace persistence exists',
);

const appSource = readFileSync(new URL('../apps/web/src/App.jsx', import.meta.url), 'utf8');
const unitNodeSource = readFileSync(new URL('../apps/web/src/UnitNode.jsx', import.meta.url), 'utf8');
assert.match(appSource, /const \[layoutUnlocked, setLayoutUnlocked\] = useState\(false\)/, 'Layout must start locked');
assert.match(appSource, /nodesDraggable=\{layoutUnlocked\}/, 'Unit dragging must require explicit layout unlock');
assert.match(appSource, /panOnDrag=\{!layoutUnlocked\}/, 'Locked pointer dragging must pan the canvas');
assert.match(appSource, /if \(!layoutUnlocked\) saveExperienceState\(state\)/, 'Unsaved layout editing must bypass automatic persistence');
assert.match(appSource, />Save Layout<\//, 'Unlocked layout editing must expose an explicit Save Layout action');
assert.match(appSource, />Restore<\//, 'Unlocked layout editing must expose an explicit Restore action');
assert.match(unitNodeSource, /isVisible=\{layoutUnlocked && selected && !collapsed\}/, 'Resize handles must stay hidden while layout is locked');
assert.match(unitNodeSource, /hasChildren && !isRoot && layoutUnlocked/, 'Collapse and expand must be layout-edit actions');

console.log('Online Experience V0.3 validation passed.');
