import {
  SCHEMA_VERSION,
  createInitialExperienceState,
  validateModel,
  validateStateReferences,
} from '../../../packages/domain/src/index.js';

export const ONLINE_WORKSPACE_ID = 'atlas';

export function createOnlineSeedState(workspaceId) {
  if (workspaceId !== ONLINE_WORKSPACE_ID) {
    throw new Error(`Unsupported Workspace: ${workspaceId}`);
  }
  return createInitialExperienceState();
}

export function validateExperienceState(state, workspaceId = ONLINE_WORKSPACE_ID) {
  const errors = [];

  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return ['Experience state must be an object.'];
  }

  if (workspaceId !== ONLINE_WORKSPACE_ID) {
    errors.push(`Unsupported Workspace: ${workspaceId}`);
  }
  if (state.schemaVersion !== SCHEMA_VERSION) {
    errors.push(`Experience schemaVersion must be ${SCHEMA_VERSION}.`);
  }
  if (state.workspaceId !== workspaceId) {
    errors.push(`Experience workspaceId must be ${workspaceId}.`);
  }
  if (state.workspace?.id !== workspaceId) {
    errors.push(`Workspace id must be ${workspaceId}.`);
  }
  if (!Number.isInteger(state.revisionNumber) || state.revisionNumber < 1) {
    errors.push('revisionNumber must be a positive integer.');
  }
  if (!state.published?.revisionId || !state.published?.model || !state.published?.layout) {
    errors.push('Published revision, model and layout are required.');
  }
  if (!state.draft?.draftId || !state.draft?.model || !state.draft?.layout) {
    errors.push('Draft id, model and layout are required.');
  }

  if (errors.length) return errors;

  if (state.published.model.workspace_id !== workspaceId) {
    errors.push(`Published model workspace_id must be ${workspaceId}.`);
  }
  if (state.draft.model.workspace_id !== workspaceId) {
    errors.push(`Draft model workspace_id must be ${workspaceId}.`);
  }
  if (state.draft.baseRevisionId !== state.published.revisionId) {
    errors.push('Draft baseRevisionId must match the current published revisionId.');
  }
  if (state.published.layout.workspace_id !== workspaceId || state.draft.layout.workspace_id !== workspaceId) {
    errors.push(`All layouts must belong to Workspace ${workspaceId}.`);
  }
  if (state.published.layout.target?.kind !== 'revision' || state.published.layout.target?.id !== state.published.revisionId) {
    errors.push('Published layout must target the current published revision.');
  }
  if (state.draft.layout.target?.kind !== 'draft' || state.draft.layout.target?.id !== state.draft.draftId) {
    errors.push('Draft layout must target the active draft.');
  }

  errors.push(...validateModel(state.published.model));
  errors.push(...validateModel(state.draft.model));
  errors.push(...validateStateReferences(
    state.draft.model,
    state.runtimeStates ?? [],
    state.workStates ?? [],
  ));

  return errors;
}
