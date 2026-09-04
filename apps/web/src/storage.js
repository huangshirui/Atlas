import { createInitialExperienceState } from '@aisr-atlas/domain';

const STORAGE_SLOT = 'aisr-atlas.experience.v0.2';

export function loadExperienceState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_SLOT);
    if (!raw) return createInitialExperienceState();
    const parsed = JSON.parse(raw);
    if (!parsed?.published?.model || !parsed?.draft?.model || !parsed?.runtimeStates || !parsed?.workStates) {
      throw new Error('Invalid stored state');
    }
    return parsed;
  } catch {
    return createInitialExperienceState();
  }
}

export function saveExperienceState(state) {
  window.localStorage.setItem(STORAGE_SLOT, JSON.stringify(state));
}

export function resetExperienceState() {
  window.localStorage.removeItem(STORAGE_SLOT);
  return createInitialExperienceState();
}
