import { createInitialExperienceState } from '@aisr-atlas/domain';

const STORAGE_SLOT = 'aisr-atlas.experience.v0.1';
const clone = (value) => JSON.parse(JSON.stringify(value));

function createPublishedFirstExperienceState() {
  const state = createInitialExperienceState();
  const draftLayout = clone(state.published.layout);
  draftLayout.id = 'layout.atlas.draft.current';
  draftLayout.target = { kind: 'draft', id: state.draft.draftId };

  return {
    ...state,
    draft: {
      ...state.draft,
      changeSequence: 0,
      model: clone(state.published.model),
      layout: draftLayout,
    },
  };
}

function isUntouchedLegacySeed(state) {
  if (state?.revisionNumber !== 1 || state?.draft?.changeSequence !== 1) return false;
  const publishedIds = new Set(state.published?.model?.units?.map((unit) => unit.id) ?? []);
  const draftIds = state.draft?.model?.units?.map((unit) => unit.id) ?? [];
  const extras = draftIds.filter((id) => !publishedIds.has(id));
  return extras.length === 1 && extras[0] === 'atlas.schemas' && draftIds.length === publishedIds.size + 1;
}

export function loadExperienceState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_SLOT);
    if (!raw) return createPublishedFirstExperienceState();
    const parsed = JSON.parse(raw);
    if (!parsed?.published?.model || !parsed?.draft?.model) throw new Error('Invalid stored state');
    if (isUntouchedLegacySeed(parsed)) return createPublishedFirstExperienceState();
    return parsed;
  } catch {
    return createPublishedFirstExperienceState();
  }
}

export function saveExperienceState(state) {
  window.localStorage.setItem(STORAGE_SLOT, JSON.stringify(state));
}

export function resetExperienceState() {
  window.localStorage.removeItem(STORAGE_SLOT);
  return createPublishedFirstExperienceState();
}
