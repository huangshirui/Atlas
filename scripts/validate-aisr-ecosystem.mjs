import {
  CORE_RELATIONSHIP_TYPES,
  validateModel,
  validateStateReferences,
} from '../packages/domain/src/index.js';
import { createAisrEcosystemSeed } from '../packages/domain/src/aisr-ecosystem-seed.js';
import {
  AISR_ECOSYSTEM_IN_PROGRESS_STATUSES,
  createLifeSpaceGranularWorkStates,
} from '../packages/domain/src/aisr-ecosystem-work-focus.js';

const seed = createAisrEcosystemSeed();
const { model, layout, runtimeStates, workStates } = seed;
const granularLifeSpaceWorkStates = createLifeSpaceGranularWorkStates();
const effectiveWorkStates = [
  ...workStates.filter((current) => current.unit_id !== 'lifespace'),
  ...granularLifeSpaceWorkStates,
];
const errors = [
  ...validateModel(model),
  ...validateStateReferences(model, runtimeStates, effectiveWorkStates),
];

const unitIds = new Set(model.units.map((current) => current.id));
const layoutIds = new Set(layout.nodes.map((current) => current.unit_id));
for (const unitId of unitIds) {
  if (!layoutIds.has(unitId)) errors.push(`Missing layout node for ${unitId}.`);
}
for (const layoutId of layoutIds) {
  if (!unitIds.has(layoutId)) errors.push(`Layout references unknown Unit ${layoutId}.`);
}

const customRelationshipTypes = new Set(model.custom_types.relationships.map((current) => current.id));
for (const current of model.relationships) {
  if (!CORE_RELATIONSHIP_TYPES.includes(current.type) && !customRelationshipTypes.has(current.type)) {
    errors.push(`Relationship ${current.id} uses undeclared type ${current.type}.`);
  }
}

const lifeSpaceInProgress = granularLifeSpaceWorkStates.filter(
  (current) => AISR_ECOSYSTEM_IN_PROGRESS_STATUSES.has(current.status),
);
if (lifeSpaceInProgress.length < 3) {
  errors.push('Granularity experiment should identify multiple concrete LifeSpace Units with work in progress.');
}
if (effectiveWorkStates.some((current) => current.unit_id === 'lifespace')) {
  errors.push('LifeSpace project must not carry a synthetic direct active Work State in the granularity experiment.');
}
if (!lifeSpaceInProgress.some((current) => current.unit_id === 'lifespace.core.discovery')) {
  errors.push('Runtime Discovery should be represented as a concrete current-work Unit in this experiment.');
}

if (model.units.length < 45) errors.push('Architecture experiment should remain a detailed multi-project stress-test.');
if (model.relationships.length < 35) errors.push('Architecture experiment should exercise substantial cross-project relationships.');
if (model.custom_types.relationships.length < 3) errors.push('Architecture experiment must exercise custom relationship definitions.');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(
  `AISR ecosystem seed valid: ${model.units.length} Units, ${model.relationships.length} Relationships, ${lifeSpaceInProgress.length} LifeSpace Units in progress.`,
);
