const SCHEMA_VERSION = '0.1';
const WORKSPACE_ID = 'aisr-ecosystem';
const OBSERVED_AT = '2026-09-06T10:00:00Z';

const facet = (id, unitId, type, stateClass, data) => ({
  schema_version: SCHEMA_VERSION,
  id,
  unit_id: unitId,
  type,
  state_class: stateClass,
  data,
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
  source: { kind: 'import', ref: 'aisr-ecosystem-granularity-experiment' },
  facets: [
    facet(`facet.${unitId}.work-focus`, unitId, 'work', 'work', {
      scope: 'LifeSpace granularity experiment',
      note: 'This is a synthetic current-work projection used to test whether Atlas can distinguish direct Unit work from active descendants.',
    }),
  ],
});

export const AISR_ECOSYSTEM_IN_PROGRESS_STATUSES = new Set([
  'active',
  'reviewing',
  'blocked',
]);

export function createLifeSpaceGranularWorkStates() {
  return [
    workState(
      'lifespace.core.discovery',
      'active',
      'Stabilizing the consumer-facing Runtime Discovery projection from n8n, MCP and ALOHA integration feedback.',
    ),
    workState(
      'lifespace.core.contracts',
      'reviewing',
      'Reviewing generated Model Contract representation and compatibility boundaries for the next consumer-facing baseline.',
    ),
    workState(
      'lifespace.core.capabilities',
      'reviewing',
      'Reviewing capability projection and field-role semantics after the 0.25 capabilityBindings addition.',
    ),
    workState(
      'lifespace.core.relations',
      'planned',
      'Generic record relation label semantics remain unresolved, but are not part of the active implementation slice.',
    ),
    workState(
      'lifespace.core.delegation',
      'planned',
      'Agent Delegation representation remains Candidate and will be refined when protocol consumers require it.',
    ),
  ];
}
