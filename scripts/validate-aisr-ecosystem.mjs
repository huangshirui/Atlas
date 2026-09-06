import {
  CORE_RELATIONSHIP_TYPES,
  validateModel,
  validateStateReferences,
} from '../packages/domain/src/index.js';
import { createAisrEcosystemSeed } from '../packages/domain/src/aisr-ecosystem-seed.js';

const seed = createAisrEcosystemSeed();
const { model, layout, runtimeStates, workStates } = seed;
const errors = [
  ...validateModel(model),
  ...validateStateReferences(model, runtimeStates, workStates),
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

if (model.units.length < 45) errors.push('Architecture experiment should remain a detailed multi-project stress-test.');
if (model.relationships.length < 35) errors.push('Architecture experiment should exercise substantial cross-project relationships.');
if (model.custom_types.relationships.length < 3) errors.push('Architecture experiment must exercise custom relationship definitions.');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`AISR ecosystem seed valid: ${model.units.length} Units, ${model.relationships.length} Relationships.`);
