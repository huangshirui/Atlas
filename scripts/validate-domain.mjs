import assert from 'node:assert/strict';
import {
  addRelationship,
  createInitialExperienceState,
  diffModels,
  fitAncestorsToLayout,
  layoutEntry,
  publishExperienceState,
  removeRelationship,
  syncDraftLayoutFromPublished,
  toggleLayoutCollapsed,
  updateLayoutNode,
  updateRelationship,
  updateUnit,
  validateModel,
  validateStateReferences,
} from '../packages/domain/src/index.js';

const initial = createInitialExperienceState();
assert.deepEqual(validateModel(initial.published.model), [], 'seed model must satisfy graph invariants');
assert.deepEqual(
  validateStateReferences(initial.published.model, initial.runtimeStates, initial.workStates),
  [],
  'runtime/work state must reference valid Units and state classes',
);
assert.equal(diffModels(initial.published.model, initial.draft.model).length, 0, 'fresh Draft must match Published');
assert.equal(Object.hasOwn(initial.published.layout, 'kind'), false, 'V0.1 Layout must not carry default/personal kind');
assert.equal(Object.hasOwn(initial.published.layout, 'owner'), false, 'V0.1 Layout must not carry a personal owner');
assert.equal(Object.hasOwn(initial.draft.layout, 'kind'), false, 'Draft Working Layout must use the same single-layout shape');
assert.equal(Object.hasOwn(initial.draft.layout, 'owner'), false, 'Draft Working Layout must not carry a personal owner');

const nested = initial.published.model.units.find((unit) => unit.id === 'atlas.web.canvas');
assert.equal(nested.parent_id, 'atlas.web', 'seed must contain real multi-level containment');
assert.equal(
  initial.published.model.units.find((unit) => unit.id === nested.parent_id)?.parent_id,
  'atlas',
  'seed must reach at least three containment levels',
);

let layout = updateLayoutNode(initial.published.layout, 'atlas.web.canvas', { width: 390, height: 160 });
layout = fitAncestorsToLayout(layout, initial.published.model, 'atlas.web.canvas');
assert.ok(layoutEntry(layout, 'atlas.web').width >= 448, 'parent must expand to fit resized child');
assert.equal(diffModels(initial.published.model, initial.draft.model).length, 0, 'layout resize must not create semantic diff');

const collapsed = toggleLayoutCollapsed(layout, 'atlas.web');
assert.equal(layoutEntry(collapsed, 'atlas.web').collapsed, true, 'collapse is stored in Layout');
assert.equal(diffModels(initial.published.model, initial.draft.model).length, 0, 'collapse must not create semantic diff');

let relationModel = addRelationship(initial.draft.model, {
  id: 'rel.atlas.web.domain.test',
  from_unit_id: 'atlas.web',
  to_unit_id: 'atlas.domain',
  type: 'depends_on',
  description: 'Domain validation test relationship.',
});
assert.deepEqual(validateModel(relationModel), [], 'created Relationship must validate');
assert.ok(diffModels(initial.published.model, relationModel).some((change) => change.entity === 'relationship' && change.kind === 'add'));
relationModel = updateRelationship(relationModel, 'rel.atlas.web.domain.test', { type: 'calls' });
assert.equal(relationModel.relationships.find((rel) => rel.id === 'rel.atlas.web.domain.test').type, 'calls');
relationModel = removeRelationship(relationModel, 'rel.atlas.web.domain.test');
assert.equal(relationModel.relationships.some((rel) => rel.id === 'rel.atlas.web.domain.test'), false);

const cyclic = updateUnit(initial.draft.model, 'atlas.web', { parent_id: 'atlas.web.canvas' });
assert.ok(validateModel(cyclic).some((error) => error.includes('Containment cycle')), 'containment cycle must be rejected');

const invalidFacetModel = structuredClone(initial.draft.model);
invalidFacetModel.facets[0].state_class = 'runtime';
assert.ok(validateModel(invalidFacetModel).some((error) => error.includes('state_class definition')), 'canonical Facets must stay Definition-only');

const movedPublished = structuredClone(initial);
movedPublished.published.layout = updateLayoutNode(movedPublished.published.layout, 'atlas.web', { x: 88, y: 126 });
const synced = syncDraftLayoutFromPublished(movedPublished);
assert.equal(layoutEntry(synced.draft.layout, 'atlas.web').x, 88, 'explicit Draft layout sync should inherit the current Published layout');

const edited = structuredClone(initial);
edited.draft.model = updateUnit(edited.draft.model, 'atlas.web', { name: 'Atlas Web Updated' });
const published = publishExperienceState(edited);
assert.equal(published.published.revisionId, 'revision.atlas.2');
assert.equal(diffModels(published.published.model, published.draft.model).length, 0, 'Publish must leave a clean Draft based on the new Revision');
assert.equal(Object.hasOwn(published.published.layout, 'kind'), false, 'Published Layout after Publish must remain single-layout shape');
assert.equal(Object.hasOwn(published.published.layout, 'owner'), false, 'Published Layout after Publish must remain ownerless');

console.log('Domain validation passed: graph, state references, single-layout operations, relationships, facets, Draft sync, and Publish lifecycle.');
