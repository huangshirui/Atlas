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
assert.equal(Object.hasOwn(seed.published.layout, 'kind'), false, 'Published layout must not expose default/personal kind');
assert.equal(Object.hasOwn(seed.published.layout, 'owner'), false, 'Published layout must not expose a personal owner');
assert.equal(Object.hasOwn(seed.draft.layout, 'kind'), false, 'Draft layout must use the same single-layout shape');
assert.equal(Object.hasOwn(seed.draft.layout, 'owner'), false, 'Draft layout must not expose a personal owner');
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

const legacyLayoutVariant = clone(seed);
legacyLayoutVariant.draft.layout.kind = 'personal';
legacyLayoutVariant.draft.layout.owner = { kind: 'human', id: 'legacy-user' };
assert.ok(
  validateExperienceState(legacyLayoutVariant).some((error) => error.includes('single-layout shape')),
  'API must reject the removed Default/Personal layout variant',
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
assert.match(appSource, /ControlButton/, 'Layout actions must be implemented as React Flow canvas controls');
assert.match(appSource, /const \[layoutUnlocked, setLayoutUnlocked\] = useState\(false\)/, 'Layout must start locked');
assert.match(appSource, /nodesDraggable=\{layoutUnlocked\}/, 'Unit dragging must require explicit layout unlock');
assert.match(appSource, /panOnDrag=\{!layoutUnlocked\}/, 'Locked pointer dragging must pan the canvas');
assert.match(appSource, /if \(layoutUnlocked\) return;/, 'Unsaved layout editing must bypass automatic persistence');
assert.match(appSource, /const currentState = stateRef\.current/, 'Explicit Save Layout must read the latest working-copy state');
assert.match(appSource, /skipNextLockedPersistenceRef\.current = true/, 'Discarding dirty layout changes while locking must prevent a stale auto-persistence pass');
assert.match(appSource, /saveExperienceState\(restored\)/, 'Discarding dirty layout changes while locking must persist the restored saved baseline, not the dirty working copy');
assert.match(appSource, /title=\{layoutUnlocked \? 'Lock layout' : 'Unlock layout'\}/, 'Canvas controls must expose lock/unlock');
assert.match(appSource, /title="Restore last saved layout"/, 'Unlocked canvas controls must expose Restore');
assert.match(appSource, /title=\{layoutDirty \? 'Save layout' : 'Layout is saved'\}/, 'Unlocked canvas controls must expose Save Layout');
assert.doesNotMatch(appSource, />Unlock Layout<\//, 'Header must not keep the old Unlock Layout button');
assert.doesNotMatch(appSource, />Save Layout<\//, 'Header must not keep the old Save Layout button');
assert.match(unitNodeSource, /isVisible=\{layoutUnlocked && selected && !collapsed\}/, 'Resize handles must stay hidden while layout is locked');
assert.match(unitNodeSource, /hasChildren && !isRoot && layoutUnlocked/, 'Collapse and expand must be layout-edit actions');

console.log('Online Experience V0.3 validation passed: locked canvas, explicit save/restore, canvas controls, and single-layout state.');
